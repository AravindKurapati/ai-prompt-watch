import subprocess
import json
import time
import re
from datetime import datetime
from pathlib import Path
import shutil
from groq import Groq
import os

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configure Groq lazily so unit tests can import this module without API access.
client = Groq(api_key=os.environ["GROQ_API_KEY"]) if os.environ.get("GROQ_API_KEY") else None

SCHEMA_VERSION = 2
SNAPSHOT_PUBLIC_DIR = Path("frontend/public/data/snapshots")

MODELS = {
    "claude":  ["Anthropic/claude.html"],
    "openai":  ["OpenAI/GPT-4o.md"],
    "gemini":  ["Google/gemini-workspace.md"],
    "grok":    ["xAI/grok-4.2.md"],
    # Perplexity omitted — it is a search wrapper (RAG), not a frontier model
    # with a substantive evolving system prompt.
}
MODEL_METADATA = {
    "claude": {"provider": "Anthropic", "canonical_path": "Anthropic/claude.html"},
    "openai": {"provider": "OpenAI", "canonical_path": "OpenAI/GPT-4o.md"},
    "gemini": {"provider": "Google", "canonical_path": "Google/gemini-workspace.md"},
    "grok": {"provider": "xAI", "canonical_path": "xAI/grok-4.2.md"},
}

SECTION_RULES = {
    "identity_persona": [
        "you are", "your name", "assistant", "personality", "tone", "voice", "persona",
    ],
    "safety_policy": [
        "refuse", "harmful", "dangerous", "prohibited", "must not", "policy",
        "guideline", "safety", "legal", "privacy", "comply",
    ],
    "tool_use": [
        '"name":', '"parameters":', '"description":', "function", "tool", "tools",
        "api", "browser", "search",
    ],
    "memory_context": [
        "remember", "recall", "memory", "conversation history", "context",
        "user preferences",
    ],
    "formatting_output": [
        "markdown", "bullet", "heading", "format", "style", "css", "font",
        "table", "json",
    ],
    "workflow_instructions": [
        "step", "workflow", "plan", "before", "after", "first", "then",
        "task", "todo",
    ],
    "security_boundaries": [
        "secret", "credential", "token", "jailbreak", "ignore previous",
        "developer message", "system message", "never reveal", "do not reveal",
    ],
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


def detect_prompt_sections(text):
    lowered = text.lower()
    sections = []
    for section, keywords in SECTION_RULES.items():
        if any(keyword in lowered for keyword in keywords):
            sections.append(section)
    return sections if sections else ["metadata_other"]


def snapshot_path_for(model_name, commit):
    return f"data/snapshots/{model_name}/{commit}.txt"


def write_snapshot(model_name, commit, snapshot, base_dir=SNAPSHOT_PUBLIC_DIR):
    target = base_dir / model_name / f"{commit}.txt"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(snapshot, encoding="utf-8")
    return target


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


def impact_reasons(diff, tags, prompt_delta, sections_changed=None):
    sections_changed = sections_changed or []
    reasons = []
    if diff.get("total_change", 0) >= 100:
        reasons.append("large_diff")
    if abs(prompt_delta) >= 1000:
        reasons.append("large_prompt_delta")
    if any(tag in tags for tag in ("safety", "policy")):
        reasons.append("safety_or_policy_change")
    if "tool_definition" in tags or "tool_use" in sections_changed:
        reasons.append("tooling_change")
    if "memory" in tags or "memory_context" in sections_changed:
        reasons.append("memory_or_context_change")
    if "security_boundaries" in sections_changed:
        reasons.append("security_boundary_change")
    return reasons if reasons else ["localized_edit"]


def compute_impact_score(diff, tags, prompt_delta, sections_changed=None):
    sections_changed = sections_changed or []
    diff_score = min(diff.get("total_change", 0), 500)
    delta_score = min(abs(prompt_delta) // 100, 250)
    tag_score = sum(TAG_IMPACT_WEIGHTS.get(tag, 0) for tag in tags)
    section_score = 0
    if "security_boundaries" in sections_changed:
        section_score += 35
    if "safety_policy" in sections_changed:
        section_score += 25
    if "tool_use" in sections_changed:
        section_score += 20
    if "memory_context" in sections_changed:
        section_score += 15
    return int(diff_score + delta_score + tag_score + section_score)


def impact_level(score):
    if score >= 180:
        return "high"
    if score >= 50:
        return "medium"
    return "low"


def build_model_stats(timeline):
    tag_counts = {}
    section_counts = {}
    high_impact_changes = 0
    prompt_growth = 0

    for entry in timeline:
        prompt_growth += entry.get("prompt_delta", 0)
        if entry.get("impact_level") == "high":
            high_impact_changes += 1
        for tag in entry.get("behavioral_tags", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
        for section in entry.get("sections_changed", []):
            section_counts[section] = section_counts.get(section, 0) + 1

    dominant_tags = [
        tag for tag, _ in sorted(tag_counts.items(), key=lambda item: (-item[1], item[0]))[:3]
    ]
    dominant_sections = [
        section for section, _ in sorted(section_counts.items(), key=lambda item: (-item[1], item[0]))[:3]
    ]

    return {
        "total_changes": len(timeline),
        "latest_change_date": timeline[0]["date"] if timeline else None,
        "current_prompt_length": timeline[0].get("prompt_length") if timeline else None,
        "prompt_growth": prompt_growth,
        "dominant_tags": dominant_tags,
        "dominant_sections": dominant_sections,
        "section_counts": section_counts,
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


def build_timeline(versions, model_name="claude", write_snapshots=False, snapshot_base_dir=SNAPSHOT_PUBLIC_DIR):
    timeline = []
    model_meta = MODEL_METADATA.get(model_name, {"provider": model_name, "canonical_path": None})
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
        changed_text = " ".join(diff["added"] + diff["removed"])
        sections_changed = detect_prompt_sections(changed_text)
        impact_score = compute_impact_score(diff, behavioral_tags, prompt_delta, sections_changed)
        path = snapshot_path_for(model_name, newer["hash"])
        if write_snapshots:
            write_snapshot(model_name, newer["hash"], snapshot, snapshot_base_dir)
        timeline.append({
            "date": newer["date"][:10],
            "commit": newer["hash"],
            "full_commit": newer["full_hash"],
            "message": newer["message"],
            "filepath": newer["filepath"],
            "diff": diff,
            "behavioral_tags": behavioral_tags,
            "sections_changed": sections_changed,
            "snapshot_path": path,
            "prompt_length": len(snapshot),
            "prompt_delta": prompt_delta,
            "impact_score": impact_score,
            "impact_level": impact_level(impact_score),
            "impact_reasons": impact_reasons(diff, behavioral_tags, prompt_delta, sections_changed),
            "provenance": {
                "provider": model_meta["provider"],
                "model": model_name,
                "source_path": newer["filepath"],
                "canonical_path": model_meta.get("canonical_path"),
                "commit": newer["hash"],
                "full_commit": newer["full_hash"],
                "commit_date": newer["date"],
                "extraction_method": "html_stripped" if newer["filepath"].endswith(".html") else "markdown_raw",
            },
            "summary": None,
        })
    return timeline


def comparison_level(count, total):
    if total <= 0 or count <= 0:
        return "none"
    ratio = count / total
    if ratio >= 0.4:
        return "high"
    if ratio >= 0.15:
        return "medium"
    return "low"


def build_comparison(timelines):
    comparison = {}
    for model, timeline in timelines.items():
        counts = {}
        for entry in timeline:
            for section in entry.get("sections_changed", []):
                counts[section] = counts.get(section, 0) + 1
        total = len(timeline)
        comparison[model] = {
            section: comparison_level(counts.get(section, 0), total)
            for section in [*SECTION_RULES.keys(), "metadata_other"]
        }
    return comparison


def build_output(timelines, generated_at=None):
    generated_at = generated_at or datetime.now().isoformat()
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": generated_at,
        "models": list(timelines.keys()),
        "model_sources": {
            model: {
                "provider": MODEL_METADATA.get(model, {}).get("provider", model),
                "canonical_path": MODEL_METADATA.get(model, {}).get("canonical_path"),
                "tracked_paths": MODELS.get(model, []),
            }
            for model in timelines.keys()
        },
        "timelines": timelines,
        "stats": {
            model: build_model_stats(t)
            for model, t in timelines.items()
        },
        "comparison": build_comparison(timelines),
    }


def validate_output(output):
    errors = []
    if output.get("schema_version") != SCHEMA_VERSION:
        errors.append(f"schema_version must be {SCHEMA_VERSION}")
    for key in ("generated_at", "models", "timelines", "stats", "comparison", "model_sources"):
        if key not in output:
            errors.append(f"missing top-level key: {key}")
    if "perplexity" in output.get("models", []):
        errors.append("perplexity must not be tracked")
    for model, timeline in output.get("timelines", {}).items():
        for index, entry in enumerate(timeline):
            label = f"{model}[{index}]"
            for forbidden in ("content_raw", "content_snapshot"):
                if forbidden in entry:
                    errors.append(f"{label} contains forbidden embedded field: {forbidden}")
            for required in (
                "snapshot_path", "sections_changed", "impact_reasons", "provenance",
                "impact_score", "impact_level", "prompt_length",
            ):
                if required not in entry:
                    errors.append(f"{label} missing required field: {required}")
    return errors


def prepare_snapshot_dir(base_dir=SNAPSHOT_PUBLIC_DIR):
    resolved = base_dir.resolve()
    expected = (Path.cwd() / "frontend" / "public" / "data" / "snapshots").resolve()
    if resolved != expected:
        raise ValueError(f"Refusing to clear unexpected snapshot directory: {resolved}")
    if base_dir.exists():
        shutil.rmtree(base_dir)
    base_dir.mkdir(parents=True, exist_ok=True)


def load_existing_summaries(path=None):
    timeline_path = Path(path or os.environ.get("EXISTING_TIMELINE_PATH", "enriched_timeline.json"))
    if not timeline_path.exists():
        return {}
    try:
        existing = json.loads(timeline_path.read_text(encoding="utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError, OSError):
        return {}

    summaries = {}
    for model, timeline in existing.get("timelines", {}).items():
        for entry in timeline:
            summary = entry.get("summary")
            if summary and summary != "Summary unavailable.":
                key = (model, entry.get("commit"), entry.get("filepath"))
                summaries[key] = summary
    return summaries


def summarize_change(diff, date, message, model_name):
    if os.environ.get("SKIP_GROQ_SUMMARIES") == "1":
        return "Summary unavailable."
    if client is None:
        return "Summary unavailable."
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
    existing_summaries = load_existing_summaries()
    prepare_snapshot_dir()

    for model_name, filepaths in MODELS.items():
        print(f"\n {model_name}...")
        versions = get_all_versions(filepaths)
        print(f"  {len(versions)} versions found")
        if not versions:
            all_timelines[model_name] = []
            continue

        timeline = build_timeline(versions, model_name=model_name, write_snapshots=True)
        print(f"  {len(timeline)} changes to summarize")

        for j, entry in enumerate(timeline):
            print(f"  [{j+1}/{len(timeline)}] {entry['date']}")
            summary_key = (model_name, entry["commit"], entry["filepath"])
            if summary_key in existing_summaries:
                entry["summary"] = existing_summaries[summary_key]
            else:
                entry["summary"] = summarize_change(
                    entry["diff"], entry["date"], entry["message"], model_name.upper()
                )
                time.sleep(2)

        all_timelines[model_name] = timeline

    output = build_output(all_timelines)
    errors = validate_output(output)
    if errors:
        raise ValueError("Invalid generated timeline:\n" + "\n".join(errors))

    with open("enriched_timeline.json", "w") as f:
        json.dump(output, f, indent=2)

    print("\nSaved to enriched_timeline.json")
    return output


if __name__ == "__main__":
    run_pipeline()
