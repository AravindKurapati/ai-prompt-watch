# FEATURE - AI Prompt Watch v2

**Date:** 2026-04-28
**Branch:** `cc/prompt-watch-v2`
**Status:** Approved - implementation pending
**Base commit:** `c8ef3f7` (origin/main HEAD at branch creation)

---

## Goal

Turn the dashboard from a near-empty change-log into a real research surface, and ship a Medium post (with a tweet thread spun off it) that uses the corpus as primary evidence.

Three workstreams, one PR + one post:

- **A. Pipeline fix** - the canonical files being tracked produce ~zero behavioral signal. Fix it.
- **B. Tag expansion** - add 5 new behavioral tag categories grounded in the static corpus.
- **C. Combined post** - cross-model patterns + 1-year forecast, written against the static snapshot.

---

## Problem

`enriched_timeline.json` currently has 5 entries across all 4 models. 4 of 5 are noise:

| Model | Entry | Reality |
|---|---|---|
| Claude | regex tweak, CSS redesign, favicon | edits to `claude.html` (the explorer page), not Claude's prompt |
| Gemini | name redaction | upstream scrubbing PII from a leak |
| Grok | `web_search` reformat | identical JSON, re-indented |
| OpenAI | (empty) | canonical file `OpenAI/GPT-4o.md` does not exist |

Root cause: `MODELS` in `extract_and_analyze.py` points at the wrong files. `Anthropic/claude.html` is the rendered explorer; the actual prompt is `Anthropic/claude-opus-4.7.md`. Similar mismatches for Gemini and OpenAI.

The static upstream corpus has ~150 prompt files - massive untapped signal (24 Anthropic, 50+ OpenAI, 22 Google, 8 xAI, 13 Misc).

**Existing groundwork (schema v2, already on main):**
- `extract_and_analyze.py` already has `SCHEMA_VERSION = 2`, a `MODEL_METADATA` dict with `canonical_path`, `SECTION_RULES` for section detection, `SNAPSHOT_PUBLIC_DIR` for prompt snapshots
- `enriched_timeline.json` already has top-level `schema_version`, `model_sources`, `comparison` keys
- `frontend/src/utils/tagColors.js` is the canonical place to extend the 7-tag color palette
- `frontend/src/components/PromptChangeReplay.jsx` already exists - new tags appear there for free
- Despite all of this, the core file mismatch is still unfixed and the timeline still has 6 entries total

---

## Scope

### In

- A1. Fix `MODELS` to point at real prompt files; add multi-file support per model
- A2. Backfill timeline against the corrected file set
- B1. Add 5 new tag categories: `lexical_blocklist`, `sycophancy_control`, `prompt_secrecy`, `wellbeing_protocol`, `temporal_grounding`
- B2. Add per-tag impact weights for the 5 new tags
- B3. Update `validate_timeline.py` and `test_pipeline.py` to cover new tags
- B4. Frontend: extend tag filter and concept-drift chart to render 12 categories without breaking layout
- C1. Write the combined post: 5 patterns + forecast section
- C2. Spin off tweet thread from the post's punchier sections

### Out

- New LLM-based tagger (rule-based stays)
- Removing or renaming any of the 7 existing tags
- Changing the JSON schema beyond adding tags + multi-file paths
- OpenAI personality variants as separate tracked entities (one canonical file per OpenAI model for now)
- Misc/ (Notion, Raycast, etc.) - frontier models only, matches current scope
- Re-running Groq summarization across the entire backfill in one pass (rate limits - chunked over multiple runs)

---

## Part A - Pipeline Fix

### A1. Canonical file selection

Replace `MODELS` dict with multi-file mapping. Latest version per model is the "current" file; older versions in the same model's directory feed the version-chain analysis used for the forecast.

```python
MODELS = {
    "claude":  ["Anthropic/claude-opus-4.7.md", "Anthropic/claude-opus-4.6.md", "Anthropic/claude-sonnet-4.6.md"],
    "openai":  ["OpenAI/gpt-5.5-thinking.md", "OpenAI/gpt-5.4-thinking.md", "OpenAI/gpt-5.3-instant.md", "OpenAI/gpt-5.3-chat-api.md", "OpenAI/gpt-5.1-default.md"],
    "gemini":  ["Google/gemini-3-pro.md", "Google/gemini-3.1-pro.md", "Google/gemini-2.5-pro-webapp.md"],
    "grok":    ["xAI/grok-4.3-beta.md", "xAI/grok-4.2.md", "xAI/grok-4.1-beta.md", "xAI/grok-4.md", "xAI/grok-3.md"],
}
```

`MODEL_METADATA` already has a `canonical_path` field per model - update each entry's `canonical_path` to the latest file in the corresponding `MODELS` list (e.g. `claude-opus-4.7.md`, `gpt-5.5-thinking.md`, `grok-4.3-beta.md`).

`get_all_versions` and `build_timeline` already iterate `filepaths`. The `if newer["filepath"] != older["filepath"]: continue` guard in `build_timeline` already prevents cross-file diffs. No structural change needed - just the file list.

**Decision:** include OpenAI's 7 GPT-5.1 personality variants as evidence in the post (Part C) but **do not** track them as separate timeline entries. Tracking 7 personality forks per OpenAI release would dominate the dashboard.

### A2. Backfill

Run `python extract_and_analyze.py` once on the corrected file set. Expect ~30-60 timeline entries (vs current 5). Groq cost: ~$0 (free tier covers this volume; 2s sleep already in place).

Validate: `python validate_timeline.py` must pass.

---

## Part B - Tag Expansion

### B1. New tag definitions

Add to the `rules` dict in `tag_diff()`. Keywords drawn from actual corpus phrases.

**Important:** there is a separate `SECTION_RULES` dict for section detection in v2 (`identity_persona`, `safety_policy`, `tool_use`, etc.). The new tag categories below extend `tag_diff`, not `SECTION_RULES`. Section detection is for snapshot navigation; behavioral tags are for diff classification. Keep them independent.

| Tag | Rationale | Keywords |
|---|---|---|
| `lexical_blocklist` | Banned words/phrases/punctuation/sentence-starters. Reveals user-feedback-driven phrase patches. | `do not use`, `never use`, `avoid the`, `ban`, `do not start`, `em dash`, `say the word`, `crutch phrase`, `do not say`, `forbidden`, `do not begin` |
| `sycophancy_control` | Anti-flattery, pushback calibration, anti-submission. The 2025 industry consensus on warmth + capitulation as the failure mode. | `sycophan`, `sugarcoat`, `flattery`, `submissive`, `push back`, `do not apologize`, `acknowledge the possibility`, `not need to apologize` |
| `prompt_secrecy` | Self-reference suppression, no-reveal-prompt, persona invisibility. Cat-and-mouse with extraction. | `do not reveal`, `do not mention these`, `without self-referencing`, `without repeating, referencing`, `must not, under any circumstances, reveal`, `do not reveal the system`, `do not describe the api` |
| `wellbeing_protocol` | Mental-health/eating-disorder/self-harm/crisis behaviors. Distinct from generic safety - has its own vocabulary. | `self-harm`, `suicide`, `eating disorder`, `mental health`, `crisis`, `wellbeing`, `disordered eating`, `mania`, `psychosis`, `dissociation`, `helpline`, `nutrition` |
| `temporal_grounding` | Knowledge cutoffs, search-first defaults, date-aware queries. The "AI that looks things up" shift. | `knowledge cutoff`, `search before`, `present-day`, `current date`, `up to date`, `cutoff date`, `must search`, `today's actual`, `recency`, `current time` |

### B2. Impact weights

Add to `TAG_IMPACT_WEIGHTS`:

```python
TAG_IMPACT_WEIGHTS = {
    "safety": 35,
    "policy": 30,
    "wellbeing_protocol": 30,    # new
    "tool_definition": 25,
    "prompt_secrecy": 25,         # new
    "sycophancy_control": 22,     # new
    "temporal_grounding": 20,     # new
    "capability": 20,
    "memory": 20,
    "lexical_blocklist": 18,      # new
    "persona": 15,
    "formatting": 8,
    "other": 0,
}
```

Reasoning: `wellbeing_protocol` ranks near `safety` (specific carve-outs of safety). `prompt_secrecy` ranks high (security-relevant). `sycophancy_control` and `temporal_grounding` are mid (behavioral but not policy-critical). `lexical_blocklist` is mid-low (cosmetic-adjacent but not pure formatting).

### B3. Validation + tests

- Update `validate_timeline.py` to accept the 12-tag vocabulary
- Add fixtures to `test_pipeline.py`:
  - One known-good diff per new tag (drawn from real corpus snippets)
  - One ambiguous diff that should produce 2+ tags
- All existing tests must still pass

### B4. Frontend

- Extend `frontend/src/utils/tagColors.js` `TAG_COLORS` with the 5 new tags. Keep the existing palette anchors (`safety: #f85149`, `tool_definition: #58a6ff`, etc.). Suggested additions:
  - `lexical_blocklist: #c69026` (mustard, near formatting/memory family)
  - `sycophancy_control: #d68a8a` (muted coral, distinct from safety red)
  - `prompt_secrecy: #6e5494` (deep violet)
  - `wellbeing_protocol: #ff9e64` (warm orange, near safety family)
  - `temporal_grounding: #56b6c2` (teal, distinct from `tool_definition` blue)
  - Final palette colors are flexible; lock in during implementation with a quick visual check on `#0d1117` bg.
- `ALL_TAGS` is derived from `Object.keys(TAG_COLORS)` so filter and proportion utilities pick up new tags automatically
- `tag filter` UI: layout audit to confirm 12 fits without overflow; fallback is 2-row layout or grouping
- `Concept drift chart`: group legend by family (`safety/policy/wellbeing`, `persona/sycophancy/lexical`, etc.) for legibility
- No schema-breaking changes - new tags appear in existing `behavioral_tags` array

---

## Part C - Combined Post

### Structure

Working title: **"What I learned by tracking 4 frontier system prompts (and what the dashboard couldn't see)"**

```
1. Hook        - I built a daily pipeline. The dashboard was lying to me.
                 (the canonical-file mismatch story)
2. Pivot       - So I read all 150 prompts directly. Here's what's hidden.
3. Pattern 1   - The war on em dashes (OpenAI's 7 GPT-5.1 personalities)
4. Pattern 2   - Personality is leaky, and they shipped a fix
5. Pattern 3   - Sycophancy got priced
6. Pattern 4   - "Search before you answer" replaces "don't hallucinate"
7. Pattern 5   - xAI literally tells Grok not to use Elon Musk's opinions
8. Forecast    - What Claude opus 4.7's prompt looks like in April 2027
9. Meta-thesis - System prompts are becoming a public product surface
10. Code+demo  - Link to the dashboard, the new tags, the GitHub PR
```

Length target: 1,800-2,400 words. Each pattern section: 200-350 words with a direct quote from the source prompt + filepath line reference.

### Tweet thread spinoff

Pull from sections 3, 5, 7. 7-tweet thread:
1. Hook - "I tracked 4 frontier system prompts for 6 months. Here's what nobody's written about."
2. Em dash war + screenshot
3. Personality leakage + screenshot
4. Sycophancy convergence
5. Search-first shift
6. Anti-Elon clause + screenshot (the viral one)
7. Link to post + dashboard

### Voice constraints

Match existing readme tone: matter-of-fact, technical, low hype. No "🚀", no "game-changing". Direct quotes from prompts > paraphrase. Always cite filepath.

### Forecast methodology

For the 1-year section: extrapolate from observable trends across version chains in the corpus.

- Claude 4.6 → 4.7 (length, new sections, what split off from what)
- GPT-5.1 → 5.2 → 5.3 → 5.4 (banlist growth, personality boilerplate)
- Grok 3 → 4 → 4.1 → 4.2 (post-incident patches)
- Gemini 2.5 → 3 → 3.1 (formatting toolkit, safety framework)

Six concrete predictions for Claude opus 4.7 in April 2027:
1. ~2x prompt length
2. `<wellbeing_v2>` block split from `<refusal_handling>`
3. Explicit `<lexical_constraints>` block
4. `<recency_routing>` making search the default
5. Named anti-sycophancy block with failure modes
6. Memory-driven user-model section

Frame as falsifiable - "if I'm right by 2027-04-28, here's what to look for."

---

## Schema Impact (per CLAUDE.md flag)

**`enriched_timeline.json` schema changes:**

- Schema is already v2 (`schema_version: 2`). No version bump needed - tag vocabulary is data, not structure.
- `behavioral_tags`: vocabulary expands from 8 values (7 + `other`) to 13 values (12 + `other`). Field type unchanged (still `string[]`).
- `impact_score`: range may shift upward as more tags can match per entry. Existing thresholds in `impact_level()` (180/50) re-evaluated after backfill - **may need re-tuning**, will report numbers post-backfill.
- No new top-level fields. No removed fields.
- `model_sources` and `comparison` (v2 fields) untouched.

**Frontend impact:**

- `frontend/src/utils/tagColors.js` is the single source of truth for tag colors and `ALL_TAGS`. Extend there.
- Tag filter component must render 12 options without overflow (audit during implementation)
- Concept-drift chart needs a 12-color palette (currently 7)
- `frontend/src/components/PromptChangeReplay.jsx` consumes tags - new tags should render automatically via `TAG_COLORS` lookup
- Grep `frontend/` for hardcoded references to the 7-tag list to catch any consumers that don't read from `ALL_TAGS`

**`SCHEMA.md`:** does not exist in this repo - documenting in this spec instead, per project convention. Will create `SCHEMA.md` if it makes sense after implementation; flagging here for user decision.

---

## Risks + Open Questions

1. **Impact-score re-tuning:** more tags per entry inflates scores. After backfill, may need to adjust the 180/50 thresholds. Will report and ask before changing.
2. **Frontend palette:** 12 colors that all stay distinguishable on `#0d1117` background is non-trivial. May need to group visually.
3. **Backfill cost:** Groq free tier should cover; if rate-limited, do it in batches over a couple days.
4. **Post timing:** post should reference the live dashboard with new tags rendering. Order: PR merged → dashboard rebuilt → post links to it. ~1 day buffer between merge and post.
5. **Claim verification for the post:** every pattern claim needs a direct prompt quote with filepath. No paraphrasing as evidence. Risk: I assert a pattern that doesn't hold up under scrutiny. Mitigation: every claim in the spec already cites a filepath; I'll do a final pass against fresh reads before publishing.
6. **OpenAI personality variants in the dashboard:** Decision is to NOT track them as separate entries (would dominate). They appear in the post as static evidence. Revisit if the dashboard needs richer OpenAI signal later.

---

## Acceptance Criteria

**Pipeline (Part A + B):**
- [ ] `enriched_timeline.json` has >= 30 entries across all 4 models
- [ ] OpenAI is no longer empty
- [ ] All 5 new tags appear at least once in the timeline
- [ ] `python validate_timeline.py` passes
- [ ] `python test_pipeline.py` passes (existing + new fixtures)
- [ ] `CHANGELOG.md` updated

**Frontend (Part B4):**
- [ ] Tag filter renders 12 tags without overflow
- [ ] Concept drift chart shows all 12 categories
- [ ] No regressions on existing screens
- [ ] Visual smoke check on `npm run dev`

**Post (Part C):**
- [ ] Draft committed to `documents/POST_prompt-watch-v2.md`
- [ ] Every pattern claim cites a filepath + line reference
- [ ] Tweet thread drafted in same file (separate section)
- [ ] User-approved before any publication

**Branch hygiene:**
- [ ] All work on `cc/prompt-watch-v2`, never main
- [ ] Single PR with all three parts
- [ ] `CHANGELOG.md` updated with summary

---

## What this spec does NOT do

- Does not change the LLM summarizer (still Llama 3.3 70B via Groq)
- Does not add an LLM-based tagger
- Does not redesign the frontend beyond palette/layout for 12 tags
- Does not touch the GitHub Actions deploy
- Does not change tracked models (still Anthropic/OpenAI/Google/xAI; Misc + Perplexity still excluded)
- Does not bump `schema_version` (tag vocabulary expansion is data, not structure)
- Does not modify `SECTION_RULES` (separate system from `tag_diff`)
- Does not change `MODEL_METADATA` providers, only `canonical_path` per model
