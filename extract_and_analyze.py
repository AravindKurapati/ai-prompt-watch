import subprocess
import json
import time
import re
from datetime import datetime
from groq import Groq
import os

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configure Groq
client = Groq(api_key=os.environ["GROQ_API_KEY"])

MODELS = {
    "claude":  ["Anthropic/claude.html"],
    "openai":  ["OpenAI/GPT-4o.md"],
    "gemini":  ["Google/gemini-workspace.md"],
    "grok":    ["xAI/grok-4.2.md"],
    # Perplexity omitted — it is a search wrapper (RAG), not a frontier model
    # with a substantive evolving system prompt.
}


def strip_html(text):
    clean = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", clean).strip()


def tag_diff(diff):
    text = " ".join(diff["added"] + diff["removed"]).lower()
    tags = []
    rules = {
        "tool_definition": ['"name":', '"parameters":', '"description":', 'function'],
        "safety":          ['refuse', 'harmful', 'dangerous', 'prohibited', 'must not', 'never', 'safety'],
        "persona":         ['you are', 'your name', 'assistant', 'personality', 'tone', 'voice'],
        "capability":      ['can now', 'able to', 'support', 'feature', 'enabled', 'available'],
        "formatting":      ['markdown', 'bullet', 'heading', 'format', 'style', '.css', 'font'],
        "memory":          ['remember', 'recall', 'memory', 'conversation history'],
        "policy":          ['policy', 'guideline', 'terms', 'privacy', 'legal', 'comply'],
    }
    for tag, keywords in rules.items():
        if any(k in text for k in keywords):
            tags.append(tag)
    return tags if tags else ["other"]


TAG_IMPACT_WEIGHTS = {
    "safety": 35,
    "policy": 30,
    "tool_definition": 25,
    "capability": 20,
    "memory": 20,
    "persona": 15,
    "formatting": 8,
    "other": 0,
}


def compute_impact_score(diff, tags, prompt_delta):
    diff_score = min(diff.get("total_change", 0), 500)
    delta_score = min(abs(prompt_delta) // 100, 250)
    tag_score = sum(TAG_IMPACT_WEIGHTS.get(tag, 0) for tag in tags)
    return int(diff_score + delta_score + tag_score)


def impact_level(score):
    if score >= 180:
        return "high"
    if score >= 50:
        return "medium"
    return "low"


def build_model_stats(timeline):
    tag_counts = {}
    high_impact_changes = 0
    prompt_growth = 0

    for entry in timeline:
        prompt_growth += entry.get("prompt_delta", 0)
        if entry.get("impact_level") == "high":
            high_impact_changes += 1
        for tag in entry.get("behavioral_tags", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1

    dominant_tags = [
        tag for tag, _ in sorted(tag_counts.items(), key=lambda item: (-item[1], item[0]))[:3]
    ]

    return {
        "total_changes": len(timeline),
        "latest_change_date": timeline[0]["date"] if timeline else None,
        "current_prompt_length": timeline[0].get("prompt_length") if timeline else None,
        "prompt_growth": prompt_growth,
        "dominant_tags": dominant_tags,
        "high_impact_changes": high_impact_changes,
    }


def get_all_versions(filepaths):
    all_commits = []
    for filepath in filepaths:
        result = subprocess.run(
            ["git", "log", "--pretty=format:%H|%ai|%s", "--", filepath],
            capture_output=True, text=True, encoding='utf-8', errors='replace'
        )
        if not result.stdout.strip():
            continue
        for line in result.stdout.strip().split("\n"):
            parts = line.split("|", 2)
            if len(parts) < 3:
                continue
            commit_hash, date, message = parts
            content_result = subprocess.run(
                ["git", "show", f"{commit_hash}:{filepath}"],
                capture_output=True, text=True, encoding='utf-8', errors='replace'
            )
            if content_result.returncode == 0 and content_result.stdout.strip():
                all_commits.append({
                    "hash": commit_hash[:8],
                    "full_hash": commit_hash,
                    "date": date,
                    "message": message,
                    "content": content_result.stdout,
                    "filepath": filepath,
                })

    seen = set()
    unique = []
    for c in all_commits:
        key = f"{c['full_hash']}_{c['filepath']}"
        if key not in seen:
            seen.add(key)
            unique.append(c)
    unique.sort(key=lambda x: x["date"], reverse=True)
    return unique


def compute_diff(old_text, new_text):
    import difflib
    old_lines = old_text.splitlines()
    new_lines = new_text.splitlines()
    diff = list(difflib.unified_diff(old_lines, new_lines, lineterm="", n=0))
    added, removed = [], []
    for line in diff:
        if line.startswith("+") and not line.startswith("+++"):
            s = line[1:].strip()
            if s: added.append(s)
        elif line.startswith("-") and not line.startswith("---"):
            s = line[1:].strip()
            if s: removed.append(s)
    return {
        "added": added[:30],
        "removed": removed[:30],
        "added_count": len(added),
        "removed_count": len(removed),
        "total_change": len(added) + len(removed),
    }


def build_timeline(versions):
    timeline = []
    for i in range(len(versions) - 1):
        newer, older = versions[i], versions[i + 1]
        if newer["filepath"] != older["filepath"]:
            continue
        diff = compute_diff(older["content"], newer["content"])
        if diff["total_change"] == 0:
            continue
        snapshot = strip_html(newer["content"])
        previous_snapshot = strip_html(older["content"])
        prompt_delta = len(snapshot) - len(previous_snapshot)
        behavioral_tags = tag_diff(diff)
        impact_score = compute_impact_score(diff, behavioral_tags, prompt_delta)
        timeline.append({
            "date": newer["date"][:10],
            "commit": newer["hash"],
            "message": newer["message"],
            "filepath": newer["filepath"],
            "diff": diff,
            "behavioral_tags": behavioral_tags,
            "content_raw": newer["content"],
            "content_snapshot": snapshot,
            "prompt_length": len(snapshot),
            "prompt_delta": prompt_delta,
            "impact_score": impact_score,
            "impact_level": impact_level(impact_score),
            "summary": None,
        })
    return timeline


def summarize_change(diff, date, message, model_name):
    added = "\n".join(diff["added"][:15])
    removed = "\n".join(diff["removed"][:15])
    prompt = f"""Analyze this change to {model_name}'s system prompt.

Date: {date} | Commit: {message}

ADDED:
{added or "(nothing)"}

REMOVED:
{removed or "(nothing)"}

Explain this change in simple terms. Keep it under 3 sentences and keep the language casual. """
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"  ⚠ {e}")
        return "Summary unavailable."


def run_pipeline():
    print("AI Prompt Watch - Building timeline...")
    all_timelines = {}

    for model_name, filepaths in MODELS.items():
        print(f"\n {model_name}...")
        versions = get_all_versions(filepaths)
        print(f"  {len(versions)} versions found")
        if not versions:
            all_timelines[model_name] = []
            continue

        timeline = build_timeline(versions)
        print(f"  {len(timeline)} changes to summarize")

        for j, entry in enumerate(timeline):
            print(f"  [{j+1}/{len(timeline)}] {entry['date']}")
            entry["summary"] = summarize_change(
                entry["diff"], entry["date"], entry["message"], model_name.upper()
            )
            time.sleep(2)

        all_timelines[model_name] = timeline

    output = {
        "generated_at": datetime.now().isoformat(),
        "models": list(all_timelines.keys()),
        "timelines": all_timelines,
        "stats": {
            model: build_model_stats(t)
            for model, t in all_timelines.items()
        }
    }

    with open("enriched_timeline.json", "w") as f:
        json.dump(output, f, indent=2)

    print("\nSaved to enriched_timeline.json")
    return output


if __name__ == "__main__":
    run_pipeline()
