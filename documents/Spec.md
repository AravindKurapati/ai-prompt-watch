# Spec - AI Prompt Watch Rebuild

## Goal
Rebuild the dashboard from a change-log viewer into a research tool for developers
who study AI model behavior, safety posture, and product decisions through system prompt analysis.

## Target User
A developer or AI researcher who wants to:
- Understand how a model's behavioral constraints have evolved
- Compare how different models handle safety, tools, personas
- See the full system prompt at any point in history
- Spot meaningful product/policy signals in prompt changes

---

## Phase 1 - Pipeline Changes (do this first, frontend depends on it)

### 1a. Add `behavioral_tags` to each timeline entry

In `extract_and_analyze.py`, after summarization, classify each diff into one or more tags.
Use a **rule-based tagger first** (fast, free, deterministic), then optionally LLM for ambiguous cases.

**Tag definitions:**
| Tag | Rule (apply if diff contains...) |
|-----|----------------------------------|
| `tool_definition` | JSON schema keywords: `"name":`, `"parameters":`, `"description":`, `function` |
| `safety` | words: `refuse`, `harmful`, `dangerous`, `prohibited`, `must not`, `never`, `safety` |
| `persona` | words: `you are`, `your name`, `assistant`, `personality`, `tone`, `voice` |
| `capability` | words: `can now`, `able to`, `support`, `feature`, `enabled`, `available` |
| `formatting` | words: `markdown`, `bullet`, `heading`, `format`, `style`, CSS patterns |
| `memory` | words: `remember`, `recall`, `memory`, `conversation history`, `context` |
| `policy` | words: `policy`, `guideline`, `terms`, `privacy`, `legal`, `comply` |

Multiple tags per entry are fine. If nothing matches, tag as `other`.

Implementation in Python:
```python
def tag_diff(diff):
    text = " ".join(diff["added"] + diff["removed"]).lower()
    tags = []
    rules = {
        "tool_definition": ['"name":', '"parameters":', '"description":', 'function'],
        "safety": ['refuse', 'harmful', 'dangerous', 'prohibited', 'must not', 'never', 'safety'],
        "persona": ['you are', 'your name', 'assistant', 'personality', 'tone', 'voice'],
        "capability": ['can now', 'able to', 'support', 'feature', 'enabled', 'available'],
        "formatting": ['markdown', 'bullet', 'heading', 'format', 'style', '.css', 'font'],
        "memory": ['remember', 'recall', 'memory', 'conversation history'],
        "policy": ['policy', 'guideline', 'terms', 'privacy', 'legal', 'comply'],
    }
    for tag, keywords in rules.items():
        if any(k in text for k in keywords):
            tags.append(tag)
    return tags if tags else ["other"]
```

Add `"behavioral_tags": tag_diff(diff)` to each timeline entry.

### 1b. Add `content_snapshot` to each timeline entry

Store the full prompt text at each commit. This enables the full prompt viewer in the frontend.

```python
entry["content_snapshot"] = newer["content"]  # full file content at that commit
```

**Note:** This will make `enriched_timeline.json` significantly larger. That's acceptable for
a GitHub Pages static site - lazy load snapshots only when user requests them, or split into
separate JSON files per model if size becomes a problem (> 5MB).

### 1c. Add `prompt_length` to each entry

```python
entry["prompt_length"] = len(newer["content"])  # character count
```

Used for the "prompt length over time" chart.

### 1d. Remove perplexity from MODELS dict (already removed, confirm it's gone)

---

## Phase 2 - Frontend Rebuild (React + Vite)

### Setup
```
cd frontend/
npm create vite@latest . -- --template react
npm install tailwindcss recharts react-diff-viewer-continued @radix-ui/react-tabs
```

### File Structure
```
frontend/src/
├── App.jsx
├── components/
│   ├── StatsBar.jsx
│   ├── ModelTabs.jsx
│   ├── Timeline.jsx
│   ├── EntryCard.jsx
│   ├── FullPromptViewer.jsx    ← NEW
│   ├── DiffViewer.jsx          ← NEW (real side-by-side diff)
│   ├── TagBadge.jsx            ← NEW
│   ├── charts/
│   │   ├── ChangesBarChart.jsx
│   │   ├── PromptLengthChart.jsx   ← NEW
│   │   └── HeatmapChart.jsx
│   └── ConceptDriftBar.jsx     ← NEW
├── hooks/
│   └── useTimeline.js          ← fetches + normalizes enriched_timeline.json
└── utils/
    └── tagColors.js
```

### Features to Build

#### Feature 1: Full Prompt Viewer
- Every timeline entry gets a "View full prompt" button
- Opens a modal/drawer showing the complete system prompt at that commit
- Syntax highlighted (treat as markdown or plain text)
- "Copy to clipboard" button
- This is the single highest-value feature - the raw text is in the repo but nobody
  wants to navigate git to find it. Surface it in one click.

#### Feature 2: Real Side-by-Side Diff
- Replace the current "+line / -line" list with `react-diff-viewer-continued`
- Split view: old on left, new on right, additions/deletions highlighted inline
- Collapsible, same as current behavior

#### Feature 3: Behavioral Tag Filter
- Each entry card shows tag badges (color-coded pills): `safety`, `tool_definition`, etc.
- Above the timeline: filter bar with tag checkboxes - "show only safety changes"
- Tag colors:
  - `safety` → red (#f85149)
  - `tool_definition` → blue (#58a6ff)
  - `persona` → purple (#a371f7)
  - `capability` → green (#3fb950)
  - `formatting` → gray (#8b949e)
  - `memory` → yellow (#d29922)
  - `policy` → orange (#e3882a)
  - `other` → muted

#### Feature 4: Prompt Length Over Time
- Line chart per model showing character count of prompt at each commit
- Use recharts LineChart
- Reveals growth trends - Claude's prompt has grown substantially over time
- Place in the analytics section

#### Feature 5: Concept Composition Bar
- For each model, a horizontal stacked bar showing tag distribution across all changes:
  "X% safety, Y% tool definitions, Z% persona..."
- At a glance: "Grok spends most changes on tool definitions, Claude on safety"
- Simple to compute from behavioral_tags in the JSON

#### Feature 6: Cross-Model Compare View (Phase 2b, lower priority)
- Side-by-side panel: pick two models, pick a date range
- Show what each changed in that period
- Good for "what did Claude and Grok both change in Feb 2026?"

### Design
- Dark theme, same palette as current (`#0d1117` bg)
- Fonts: Syne for headings, IBM Plex Mono for code/data/commits
- Keep it dense and information-rich - this is a developer tool, not a marketing site
- Reference: Linear.app dashboard aesthetic (not their marketing page)
- No unnecessary animations - subtle hover states only

### Data Fetching
```js
// hooks/useTimeline.js
export function useTimeline() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/enriched_timeline.json")
      .then(r => r.json())
      .then(setData);
  }, []);
  return data;
}
```

---

## Order of Operations for CC

1. Pipeline changes first (`extract_and_analyze.py`):
   - Add `tag_diff()` function
   - Add `behavioral_tags`, `content_snapshot`, `prompt_length` to each entry
   - Test locally: `python extract_and_analyze.py` and verify JSON output

2. Vite project scaffold:
   - `npm create vite@latest frontend -- --template react`
   - Install dependencies
   - Set up Tailwind
   - Configure `vite.config.js` for GitHub Pages base path

3. Build components in this order:
   - `useTimeline` hook (data layer first)
   - `StatsBar` (simplest component)
   - `ModelTabs` + `Timeline` + `EntryCard` (core loop)
   - `TagBadge` + filter bar
   - `DiffViewer` (real side-by-side)
   - `FullPromptViewer` (modal)
   - Charts (analytics section)

4. GitHub Actions: update workflow to `cd frontend && npm run build` and deploy `dist/`

---

## What We're NOT Building
- Backend / API - stays fully static
- User accounts / saved searches
- Injection resistance scoring - removed, was meaningless
- "Synchronized events" section - removed, low signal
- "Top words added/removed" - removed, CSS noise
- Perplexity tracking - removed, it's a RAG wrapper not a frontier model