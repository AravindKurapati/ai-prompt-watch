# CHANGELOG

## [unreleased]
- ci: sync Anthropic/, OpenAI/, Google/, xAI/ from upstream before pipeline runs (tolerant — continues if upstream unreachable)
- feat: animated mesh gradient background — three independently-drifting blobs (31s/43s/57s) + static top-glow

---

## 2026-03-29 — Phase 2 frontend (branch: cc/phase2-frontend)

### New: React + Vite frontend (frontend/)
- Vite + React 18, Tailwind CSS v4, dark theme (`#0d1117` bg)
- Fonts: Syne (headings/tabs), IBM Plex Mono (data/commits), system-ui (body text)
- Layout: Overview tab (analytics) + per-model tabs (timelines only)
- StatsBar, TagBadge, FilterBar (OR-logic tag filter)
- EntryCard: stacked row layout — date/commit → summary → tags → diff/prompt actions
- DiffViewer: react-diff-viewer-continued, split view, "first 30 lines" truncation label
- FullPromptViewer: right-side drawer, content_snapshot, copy button, Escape closes
- ChangesBarChart, PromptLengthChart (recharts), HeatmapChart (CSS grid), ConceptDriftBar
- ConceptDriftBar: footnote that proportions may sum >100% (non-exclusive tags)
- 11 tests passing (tagColors utils + ConceptDriftBar)

### Updated: GitHub Actions (.github/workflows/update.yml)
- Two jobs: pipeline (runs Python, commits JSON) → deploy (needs: pipeline)
- Deploy: copies enriched_timeline.json to frontend/public/, builds Vite, pushes dist/ to gh-pages via peaceiris/actions-gh-pages

### Archived
- index.html → archive/index_vanilla.html

---

## 2026-03-28 — Phase 1 pipeline changes (branch: cc/phase1-pipeline)

### extract_and_analyze.py
- **Added `strip_html()`** helper — strips HTML tags and collapses whitespace; used by snapshot and prompt_length
- **Added `tag_diff()`** — rule-based behavioral tagger; classifies each diff into one or more of: `tool_definition`, `safety`, `persona`, `capability`, `formatting`, `memory`, `policy`, `other`
- **New fields on every timeline entry**: `behavioral_tags`, `content_raw` (raw file bytes), `content_snapshot` (HTML-stripped text), `prompt_length` (character count of stripped text)
- **Removed injection scoring** — deleted `score_injection_resistance()`, `INJECTION_ATTACKS`, `REFUSAL_SIGNALS`, `COMPLIANCE_SIGNALS`, `_RESISTANCE_BONUS_PHRASES`, `_apply_resistance_bonus()`; was scoring Llama simulating the model, not the model itself (see archive/SPEC_scoring.md)
- **Removed `find_synchronized_events()`** — feature was not displayed; dead pipeline cost removed
- **Removed `synchronized_events` from output schema** — no longer generated

### archive/SPEC_scoring.md
- Moved from root; annotated with removal rationale

### test_pipeline.py
- Replaced injection-scoring tests (now deleted feature) with 24 tests covering `strip_html`, `tag_diff`, and new `build_timeline` fields

## 2026-03-23 — Injection scorer improvements + HTML legend (branch: fix-injection-scorer)

### extract_and_analyze.py
- **REFUSAL_SIGNALS**: added `"i refuse"`, `"against my guidelines"`, `"inappropriate request"`
- **REFUSAL_SIGNALS**: removed false positives `"my purpose"` and `"i don't have access"`
  - `"my purpose"` triggered on compliance responses like "My purpose is to help you"
  - `"i don't have access"` triggered on unrelated capability disclaimers
- **Resistance bonus**: added `_apply_resistance_bonus()` helper — flat +10 to final score
  (capped at 100) if system prompt contains `"ignore previous"`, `"disregard"`, or
  `"do not follow"`. Models with explicit override-resistance language score higher.
- `temperature=0.2` confirmed correct and documented in SPEC_scoring.md

### index.html
- Added persistent injection resistance legend below Model Activity Profiles section
- Legend explains the 0–100 scale with color-coded tiers (green/yellow/red)
- Uses existing dark-theme CSS classes (`.injection-legend`, `.legend-item`, `.legend-dot`)

### New files
- `SPEC_scoring.md` — documents expected score ranges per model, signal list rationale,
  design decisions (temperature, weights, bonus logic), before/after comparison guidance
- `test_pipeline.py` — 16 unit tests covering signal additions, false positive removals,
  and the resistance bonus logic (all passing)
