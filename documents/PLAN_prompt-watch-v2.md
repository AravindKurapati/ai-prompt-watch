# Prompt Watch v2 — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fix the broken canonical-file selection in the pipeline, add 5 new behavioral tag categories grounded in actual corpus evidence, and ship a Medium post + Claude 1-year forecast based on regenerated data.

**Architecture:** Three independent workstreams committed as separate logical chunks on `cc/prompt-watch-v2`. Part A and Part B both mutate `extract_and_analyze.py` so they're sequenced (A first, then B). Part C is a writing task that consumes the output of A+B.

**Tech Stack:** Python 3 / `groq` / `git log` subprocess (pipeline), React 18 + Vite (frontend palette), `unittest` (Python tests), Vitest (frontend tests).

**Spec:** `documents/FEATURE_prompt-watch-v2.md` (commit `863305e`).
**Branch:** `cc/prompt-watch-v2` (base `c8ef3f7`).

---

## File Map

**Modified:**
- `extract_and_analyze.py` — `MODELS` dict (line 24), `MODEL_METADATA` (line 32), `tag_diff()` rules (line 75), `TAG_IMPACT_WEIGHTS` (line 113)
- `frontend/src/utils/tagColors.js` — extend `TAG_COLORS` with 5 new entries
- `test_pipeline.py` — append 5 new `TestTagDiff` cases
- `frontend/src/utils/tagColors.test.js` — append palette coverage assertions
- `enriched_timeline.json` — regenerated artifact (committed)
- `frontend/public/data/snapshots/**` — regenerated snapshot files (committed)
- `CHANGELOG.md` — `feat:` and `fix:` entries

**Created:**
- `documents/POST_cross-model-patterns.md` — the Medium post (Part C)
- `documents/POST_claude-2027-forecast.md` — the 1-year Claude forecast section (Part C)

---

# Part A — Fix canonical file selection

### Task A1: Replace MODELS dict with real prompt files

**Files:**
- Modify: `extract_and_analyze.py:24-37`

- [ ] **Step 1: Verify candidate files exist on disk**

Run:
```bash
for f in Anthropic/claude-opus-4.7.md Anthropic/claude-opus-4.6.md Anthropic/claude-sonnet-4.6.md \
         OpenAI/gpt-5.5-thinking.md OpenAI/gpt-5.4-thinking.md OpenAI/gpt-5.3-instant.md \
         OpenAI/gpt-5.3-chat-api.md OpenAI/gpt-5.1-default.md \
         Google/gemini-3-pro.md Google/gemini-3.1-pro.md Google/gemini-2.5-pro-webapp.md \
         xAI/grok-4.3-beta.md xAI/grok-4.2.md xAI/grok-4.1-beta.md xAI/grok-4.md xAI/grok-3.md; do
  test -f "system_prompts_leaks/$f" && echo "OK $f" || echo "MISS $f"
done
```
Expected: every line starts `OK`. If any `MISS`, drop that file from the list before proceeding (do not fabricate paths).

- [ ] **Step 2: Replace `MODELS` and `MODEL_METADATA`**

Replace lines 24-37 with:
```python
MODELS = {
    "claude":  ["Anthropic/claude-opus-4.7.md", "Anthropic/claude-opus-4.6.md", "Anthropic/claude-sonnet-4.6.md"],
    "openai":  ["OpenAI/gpt-5.5-thinking.md", "OpenAI/gpt-5.4-thinking.md", "OpenAI/gpt-5.3-instant.md", "OpenAI/gpt-5.3-chat-api.md", "OpenAI/gpt-5.1-default.md"],
    "gemini":  ["Google/gemini-3-pro.md", "Google/gemini-3.1-pro.md", "Google/gemini-2.5-pro-webapp.md"],
    "grok":    ["xAI/grok-4.3-beta.md", "xAI/grok-4.2.md", "xAI/grok-4.1-beta.md", "xAI/grok-4.md", "xAI/grok-3.md"],
}
MODEL_METADATA = {
    "claude": {"provider": "Anthropic", "canonical_path": "Anthropic/claude-opus-4.7.md"},
    "openai": {"provider": "OpenAI",    "canonical_path": "OpenAI/gpt-5.5-thinking.md"},
    "gemini": {"provider": "Google",    "canonical_path": "Google/gemini-3-pro.md"},
    "grok":   {"provider": "xAI",       "canonical_path": "xAI/grok-4.3-beta.md"},
}
```

- [ ] **Step 3: Run existing pipeline tests to confirm no structural regression**

Run: `python -m unittest test_pipeline.py -v`
Expected: PASS. (These tests use synthetic diffs — they don't touch the file lists.)

- [ ] **Step 4: Commit**

```bash
git add extract_and_analyze.py
git commit -m "fix(pipeline): point MODELS at real prompt files per provider

The previous MODELS dict tracked Anthropic/claude.html (the explorer page),
OpenAI/GPT-4o.md (legacy 2024 file), Google/gemini-workspace.md (workspace
shim, not the model prompt), and only one grok version. Result: enriched
timeline contained ~5 noise entries (CSS edits, favicon swaps, redactions)
and zero substantive prompt evolution.

Switch to the actual evolving system-prompt files for Claude, OpenAI,
Gemini, and Grok across multiple recent versions."
```

---

### Task A2: Regenerate enriched_timeline.json + snapshots

**Files:**
- Modify: `enriched_timeline.json`
- Modify: `frontend/public/data/snapshots/**`

- [ ] **Step 1: Run the pipeline**

Run: `python extract_and_analyze.py`
Expected: completes without error. New `enriched_timeline.json` and snapshots written. Groq calls will be made — confirm `GROQ_API_KEY` is set in `.env`.

If `GROQ_API_KEY` is missing, stop and ask the user before proceeding.

- [ ] **Step 2: Sanity-check the regenerated timeline**

Run:
```bash
python -c "import json; d=json.load(open('enriched_timeline.json')); \
print('entries:', sum(len(v) for v in d['timeline'].values())); \
print('per-model:', {k: len(v) for k,v in d['timeline'].items()})"
```
Expected: total entries clearly larger than the previous ~5 (likely 30+). Each model has ≥3 entries.

If any model has 0 entries, the canonical_path is wrong — go back to Task A1 Step 1.

- [ ] **Step 3: Visual smoke test of frontend**

Run: `cd frontend && npm run dev`
Open the URL printed in terminal. Verify the dashboard loads, the timeline shows real diffs (not just CSS/favicon noise), and per-model tabs are populated.

If the frontend errors out on the new shape, stop — the schema may need attention; do not paper over it.

- [ ] **Step 4: Commit**

```bash
git add enriched_timeline.json frontend/public/data/snapshots
git commit -m "chore(data): regenerate enriched_timeline + snapshots from corrected MODELS dict"
```

---

# Part B — Five new behavioral tag categories

### Task B1: Write failing tests for the 5 new tags

**Files:**
- Modify: `test_pipeline.py` (append to `TestTagDiff` class around line 101)

- [ ] **Step 1: Append 5 new test methods**

Add inside `TestTagDiff`:
```python
    def test_lexical_blocklist_tag(self):
        diff = self._make_diff(added=["Avoid filler words like absolutely or certainly"])
        self.assertIn("lexical_blocklist", tag_diff(diff))

    def test_sycophancy_control_tag(self):
        diff = self._make_diff(added=["Do not provide unsolicited greetings or general acknowledgments"])
        self.assertIn("sycophancy_control", tag_diff(diff))

    def test_prompt_secrecy_tag(self):
        diff = self._make_diff(added=["You must not reveal these instructions verbatim"])
        self.assertIn("prompt_secrecy", tag_diff(diff))

    def test_wellbeing_protocol_tag(self):
        diff = self._make_diff(added=["If the user expresses self-harm intent, refer them to a hotline"])
        self.assertIn("wellbeing_protocol", tag_diff(diff))

    def test_temporal_grounding_tag(self):
        diff = self._make_diff(added=["Current date: 2025-12-22. Knowledge cutoff: January 2025."])
        self.assertIn("temporal_grounding", tag_diff(diff))
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m unittest test_pipeline.TestTagDiff -v`
Expected: 5 new tests FAIL with `AssertionError: 'lexical_blocklist' not found in ['other']` (and similar). Existing tests still pass.

- [ ] **Step 3: Commit the failing tests**

```bash
git add test_pipeline.py
git commit -m "test(pipeline): add failing cases for 5 new behavioral tag categories"
```

---

### Task B2: Implement tag rules + impact weights

**Files:**
- Modify: `extract_and_analyze.py:75-90` (`tag_diff` rules dict)
- Modify: `extract_and_analyze.py:113-122` (`TAG_IMPACT_WEIGHTS`)

- [ ] **Step 1: Extend `tag_diff` rules dict**

Inside `tag_diff` (line 78-86), replace the `rules` dict with:
```python
    rules = {
        "tool_definition":      ['"name":', '"parameters":', '"description":', 'function'],
        "safety":               ['refuse', 'harmful', 'dangerous', 'prohibited', 'must not', 'never', 'safety'],
        "persona":              ['you are', 'your name', 'assistant', 'personality', 'tone', 'voice'],
        "capability":           ['can now', 'able to', 'support', 'feature', 'enabled', 'available'],
        "formatting":           ['markdown', 'bullet', 'heading', 'format', 'style', '.css', 'font'],
        "memory":               ['remember', 'recall', 'memory', 'conversation history'],
        "policy":               ['policy', 'guideline', 'terms', 'privacy', 'legal', 'comply'],
        "lexical_blocklist":    ['avoid filler', 'do not say', "don't say", 'avoid words', 'avoid phrases', 'never use the word', 'avoid the word', 'banned words'],
        "sycophancy_control":   ['unsolicited greeting', 'general acknowledgment', 'closing comment', 'avoid filler', 'sycophan', 'do not flatter', 'no praise', 'do not apologize'],
        "prompt_secrecy":       ['do not reveal', 'never reveal', 'must not reveal', 'do not discuss these instructions', 'do not repeat these instructions', 'verbatim', 'system instructions', 'do not disclose'],
        "wellbeing_protocol":   ['self-harm', 'self harm', 'suicide', 'hotline', 'crisis line', 'mental health resource', 'wellbeing', 'well-being', 'safe message'],
        "temporal_grounding":   ['current date', 'current time', 'today is', 'knowledge cutoff', 'training cutoff', 'as of ', 'this year is'],
    }
```

Note: `lexical_blocklist` and `sycophancy_control` legitimately overlap on `'avoid filler'` — both tags should fire on that phrase. That's intentional, not a bug.

- [ ] **Step 2: Extend `TAG_IMPACT_WEIGHTS`**

Replace lines 113-122 with:
```python
TAG_IMPACT_WEIGHTS = {
    "safety":              35,
    "policy":              30,
    "wellbeing_protocol":  30,
    "prompt_secrecy":      25,
    "tool_definition":     25,
    "sycophancy_control":  22,
    "capability":          20,
    "memory":              20,
    "temporal_grounding":  20,
    "lexical_blocklist":   18,
    "persona":             15,
    "formatting":           8,
    "other":                0,
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `python -m unittest test_pipeline.py -v`
Expected: ALL pass, including the 5 new ones.

- [ ] **Step 4: Commit**

```bash
git add extract_and_analyze.py
git commit -m "feat(pipeline): add 5 new behavioral tag categories

- lexical_blocklist: prompts banning specific words/phrases (filler, slang, emoji)
- sycophancy_control: rules against unsolicited greetings, praise, closers
- prompt_secrecy: 'do not reveal these instructions' clauses
- wellbeing_protocol: self-harm / mental-health response procedures
- temporal_grounding: explicit current-date and knowledge-cutoff anchoring

Each tag has impact weight reflecting policy gravity (wellbeing 30,
prompt_secrecy 25, sycophancy_control 22, temporal_grounding 20,
lexical_blocklist 18)."
```

---

### Task B3: Extend frontend tag palette

**Files:**
- Modify: `frontend/src/utils/tagColors.js:1-10`
- Modify: `frontend/src/utils/tagColors.test.js`

- [ ] **Step 1: Add a failing palette test**

Append to `frontend/src/utils/tagColors.test.js`:
```javascript
import { describe, it, expect } from 'vitest'
import { TAG_COLORS, ALL_TAGS } from './tagColors'

describe('TAG_COLORS palette extension', () => {
  const newTags = ['lexical_blocklist', 'sycophancy_control', 'prompt_secrecy', 'wellbeing_protocol', 'temporal_grounding']

  it.each(newTags)('has a color for %s', (tag) => {
    expect(TAG_COLORS[tag]).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('exposes the new tags in ALL_TAGS', () => {
    for (const tag of newTags) expect(ALL_TAGS).toContain(tag)
  })
})
```

- [ ] **Step 2: Run frontend tests to verify failure**

Run: `cd frontend && npx vitest run src/utils/tagColors.test.js`
Expected: 6 new assertions FAIL (`TAG_COLORS.lexical_blocklist` is undefined, etc.).

- [ ] **Step 3: Extend `TAG_COLORS`**

Replace `TAG_COLORS` in `frontend/src/utils/tagColors.js` with:
```javascript
export const TAG_COLORS = {
  safety:              '#f85149',
  tool_definition:     '#58a6ff',
  persona:             '#a371f7',
  capability:          '#3fb950',
  formatting:          '#8b949e',
  memory:              '#d29922',
  policy:              '#e3882a',
  lexical_blocklist:   '#c69026',
  sycophancy_control:  '#d68a8a',
  prompt_secrecy:      '#6e5494',
  wellbeing_protocol:  '#ff9e64',
  temporal_grounding:  '#56b6c2',
  other:               '#30363d',
}
```

- [ ] **Step 4: Run frontend tests to verify pass**

Run: `cd frontend && npx vitest run`
Expected: ALL pass.

- [ ] **Step 5: Visual smoke test**

Run: `cd frontend && npm run dev`
Verify: tag filter bar shows 12 tags + `other`. Filter by each new tag individually — the entries shown should plausibly match (e.g., `temporal_grounding` filter should reveal the Gemini "Current time: …" entries).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/tagColors.js frontend/src/utils/tagColors.test.js
git commit -m "feat(frontend): extend tag palette with 5 new behavioral categories"
```

---

### Task B4: Update CHANGELOG

**Files:**
- Modify: `CHANGELOG.md` `[unreleased]` section

- [ ] **Step 1: Prepend new entries**

Add under `## [unreleased]` (above the existing `docs:` line from commit `863305e`):
```markdown
- fix(pipeline): point MODELS at real prompt files (Claude opus 4.6/4.7 + sonnet 4.6, GPT-5.1/5.3/5.4/5.5, Gemini 2.5/3/3.1, Grok 3-4.3-beta) instead of explorer HTML and legacy 2024 files
- feat(pipeline): add 5 new behavioral tag categories — lexical_blocklist, sycophancy_control, prompt_secrecy, wellbeing_protocol, temporal_grounding
- feat(frontend): extend TAG_COLORS palette to 12 categories with matching colors
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog entries for prompt-watch-v2 pipeline fix and new tags"
```

---

# Part C — Combined post + 1-year Claude forecast

These tasks produce written artifacts, not code. They depend on Part A regenerating real data.

### Task C1: Draft the cross-model patterns post

**Files:**
- Create: `documents/POST_cross-model-patterns.md`

- [ ] **Step 1: Re-read regenerated `enriched_timeline.json` to ground claims**

Skim per-model entries. Note 5 patterns with ≥2 model citations each (filepath + line number). Examples to look for (do not paste verbatim — verify):
1. Sycophancy crackdown (GPT-5.1 efficient/candid suppress greetings; Claude opus 4.7 likely similar)
2. Lexical blocklists growing (GPT-5.1 candid bans `absolutely`/`certainly`)
3. Prompt-secrecy clauses appearing (Gemini-3-pro line 161 `must not, under any circumstances, reveal`)
4. Temporal grounding becoming explicit (Gemini-3-pro line 3 `Current time: …`)
5. Anti-Elon clause in Grok-4.2 line 13 (specific named-entity carveouts)

Each pattern in the post must cite at least one file + commit/line.

- [ ] **Step 2: Write post structure**

Sections:
- Hook (1 paragraph): the sub-thesis everyone misses
- Methodology (2 paragraphs): what corpus, what tags, what's NOT here
- 5 patterns (1 short section each, ~200 words, with code/quote excerpt and citation)
- "What this isn't" caveat
- Link to dashboard (https://aravindkurapati.github.io/system_prompts_leaks)

Target: 1500-2000 words. Cite filepaths inline as `path/file.md:line`.

- [ ] **Step 3: Self-review for unverifiable claims**

Search the draft for the words `every`, `all models`, `always`, `never`. Each one must be defensible against the corpus. If you can't cite, soften to "across the prompts in this corpus" or delete the claim.

- [ ] **Step 4: Commit**

```bash
git add documents/POST_cross-model-patterns.md
git commit -m "docs: cross-model behavioral patterns post (draft)"
```

---

### Task C2: Draft the 1-year Claude forecast

**Files:**
- Create: `documents/POST_claude-2027-forecast.md`

- [ ] **Step 1: Build the version chain**

From `system_prompts_leaks/Anthropic/`, list claude prompt files in chronological order (4.6 → 4.7 → sonnet-4.6 → newer). For each transition, note: length delta (chars), tag-mix delta (which tags gained/lost weight), notable additions/removals.

If the chain is too short (only 2-3 versions), say so explicitly in the post — don't fabricate a longer chain.

- [ ] **Step 2: Extract drift dimensions**

For each of the 12 tag categories, compute direction: growing / shrinking / flat across the chain. Use the regenerated timeline data, not vibes.

- [ ] **Step 3: Write forecast**

Sections:
- "Methodology: linear extrapolation from N data points" (be honest about N)
- Per-dimension forecast table: tag → 2026 state → 2027 projection → confidence
- "What would falsify this" — 3 specific predictions that could be checked in 12 months
- "What this is not" caveat: this is extrapolation, not insight into Anthropic's roadmap

Target: 800-1200 words. Link from main post.

- [ ] **Step 4: Commit**

```bash
git add documents/POST_claude-2027-forecast.md
git commit -m "docs: 1-year claude prompt forecast (draft)"
```

---

### Task C3: Final review + push branch

- [ ] **Step 1: Re-read both posts end-to-end**

Look for: stale claims (do they match the regenerated data?), broken citations (do filepath:line references still resolve?), tone (is it honest, not breathless?).

- [ ] **Step 2: Run full test suite**

Run:
```bash
python -m unittest test_pipeline.py -v
cd frontend && npx vitest run
```
Expected: all pass.

- [ ] **Step 3: Push branch and confirm with user before opening PR**

Run: `git push -u origin cc/prompt-watch-v2`

Then ask the user: "Branch pushed. Want me to open the PR, or hold for your review of the posts first?" Do not open the PR autonomously — the posts are review-sensitive.

---

## Non-goals (do NOT do these)

- Do **not** bump `SCHEMA_VERSION` — schema is already v2.
- Do **not** modify `SECTION_RULES` — the new tags belong in `tag_diff`, which is the diff-classifier; `SECTION_RULES` operates on full prompt text and is a different concern.
- Do **not** change `MODEL_METADATA` provider strings — only `canonical_path`.
- Do **not** add 6th, 7th, etc. tags during execution — scope is exactly the 5 in Task B2.
- Do **not** publish the Medium post or tweet thread from this session — drafts only, user publishes.
