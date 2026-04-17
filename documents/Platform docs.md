# Platform Docs - AI Prompt Watch

## What It Does
Tracks how the system prompts of frontier AI models change over time by analyzing a git repository
where community-sourced system prompt files are committed as they're discovered/updated.

## Data Pipeline (`extract_and_analyze.py`)

### Input
A git repository with prompt files organized by provider:
- `Anthropic/claude.html`
- `OpenAI/GPT-4o.md`
- `Google/gemini-workspace.md`
- `xAI/grok-4.2.md`

### What It Does
1. Runs `git log` per canonical file to get commit history
2. For each consecutive pair of commits, computes a line-level diff
3. Calls Groq API (llama-3.3-70b-versatile) to summarize each diff in plain English
4. Finds "synchronized events" - multiple models changing within a 7-day window
5. Outputs `enriched_timeline.json`

### Output Schema (`enriched_timeline.json`)
```json
{
  "generated_at": "ISO timestamp",
  "models": ["claude", "openai", "gemini", "grok"],
  "timelines": {
    "claude": [
      {
        "date": "YYYY-MM-DD",
        "commit": "short hash",
        "message": "git commit message",
        "filepath": "Anthropic/claude.html",
        "diff": {
          "added": ["line1", "line2"],        // up to 30 lines
          "removed": ["line1", "line2"],      // up to 30 lines
          "added_count": 2,
          "removed_count": 2,
          "total_change": 4
        },
        "summary": "Plain English summary from Groq",
        "injection_score": null,             // deprecated, always null now
        "behavioral_tags": ["safety", "tool_definition"],  // NEW - see spec.md
        "content_snapshot": "full prompt text at this commit",  // NEW - see spec.md
        "prompt_length": 12345,
        "prompt_delta": 512,
        "impact_score": 184,
        "impact_level": "high"
      }
    ]
  },
  "synchronized_events": [],               // deprecated, kept for schema compat
  "stats": {
    "claude": {
      "total_changes": 3,
      "latest_change_date": "2026-02-15",
      "current_prompt_length": 193065,
      "prompt_growth": 1200,
      "dominant_tags": ["tool_definition", "safety"],
      "high_impact_changes": 1
    }
  }
}
```

### Environment Variables
- `GROQ_API_KEY` - required, Groq API key
- Never hardcode, never commit. Use `.env` locally, GitHub Actions secrets in CI.

## Frontend (`frontend/`)

### What It Renders
1. **Spotlight hero** - highest-impact visible prompt change with fast actions
2. **Model profile rail** - Claude, ChatGPT, Gemini, and Grok as selectable model profiles
3. **Browse rows** - latest, high-impact, safety/policy, tools/capabilities, and prompt-growth rows
4. **Research drawer** - overview, side-by-side diff, and full prompt reader
5. **Analytics shelf** - charts for model activity, prompt length, monthly heatmap, and tag composition

### Model Metadata
```js
const MODEL_META = {
  claude:  { label: "Claude",   color: "#d97706" },
  openai:  { label: "ChatGPT",  color: "#10a37f" },
  gemini:  { label: "Gemini",   color: "#4285f4" },
  grok:    { label: "Grok",     color: "#9333ea" },
}
```

### Data Flow
Frontend fetches `enriched_timeline.json` from the same GitHub Pages origin.
All rendering is client-side. No API calls from the frontend.

## GitHub Actions
Runs `extract_and_analyze.py` daily, commits updated `enriched_timeline.json` back to the repo.
Frontend auto-reflects changes on next page load.

## Known Issues / Intentional Decisions
- `injection_score` field exists in schema but is always null - the scoring method was
  unreliable (simulating model behavior via Llama, not actually testing the model)
- `synchronized_events` kept in schema for backward compat but not displayed - too few
  data points to be meaningful
- OpenAI timeline is currently empty - no commits to `GPT-4o.md` in the tracked window
