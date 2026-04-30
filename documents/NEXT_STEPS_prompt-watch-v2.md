# Prompt Watch v2 — Next Steps

> **Pick this up in a new Claude Code session.** This doc + the spec + the plan are all the context you need.

## Status as of 2026-04-29

**Branch:** `cc/prompt-watch-v2` (pushed to origin, no PR yet).

**Done:**
- Spec: `documents/FEATURE_prompt-watch-v2.md` (commit `863305e`)
- Plan: `documents/PLAN_prompt-watch-v2.md` (commit `86c2314`)
- **Part A1** — `MODELS` and `MODEL_METADATA` in `extract_and_analyze.py` now point at real prompt files: 3 Claude versions, 5 OpenAI, 3 Gemini, 5 Grok (commit `d0aa93d`). All 16 files verified to exist.
- **Part B (full)** — 5 new behavioral tag categories shipped end-to-end:
  - Failing tests (commit `06ca930`)
  - `tag_diff()` rules + `TAG_IMPACT_WEIGHTS` (commit `aaa1947`)
  - `frontend/src/utils/tagColors.js` palette + tests (commit `eb81f83`)
  - CHANGELOG entries (commit `b1345cc`)
- All tests green except one pre-existing fixture error (`test_schema_v2_fixture_is_valid` — missing `tests/fixtures/timeline_schema_v2.json`, unrelated to this work).

**Blocked / not started:**
- **Part A2** — regenerate `enriched_timeline.json` and snapshots from the new MODELS dict. Blocked on Groq API key (see below).
- **Part C1** — `documents/POST_cross-model-patterns.md` (5 cross-model patterns post). Blocked on A2 because the post cites filepath:line evidence and we want the regenerated data feeding the dashboard before publishing claims.
- **Part C2** — `documents/POST_claude-2027-forecast.md` (1-year Claude forecast). Same blocker.
- **Part C3** — final review + open PR.

---

## The Groq blocker

`extract_and_analyze.py` calls Groq Llama 3.3 70B to enrich each commit. Two attempts in the prior session both got `groq.AuthenticationError: 401 Invalid API Key`:

1. First attempt: only `ANTHROPIC_API_KEY` was in `.env`; a stale `GROQ_API_KEY` was inherited from system env.
2. Second attempt (after user added a new key to `.env`): still 401.

The .env shape was clean (56 chars, `gsk_` prefix, no quotes/whitespace), so the key was loaded correctly — Groq itself rejected it. Likely cause: paste from a deactivated key row, or wrong account.

**To unblock:**
1. Go to https://console.groq.com/keys.
2. Confirm there's an "Active" key. If not, generate one.
3. Replace `GROQ_API_KEY=...` line in `D:\Aru\NYU\system_prompts_leaks_polish\.env`.
4. Verify with this one-liner (does NOT print the key):
   ```bash
   python -c "
   from dotenv import load_dotenv; load_dotenv(override=True)
   from groq import Groq; import os
   c = Groq(api_key=os.environ['GROQ_API_KEY'])
   r = c.chat.completions.create(model='llama-3.3-70b-versatile', messages=[{'role':'user','content':'ping'}], max_tokens=2)
   print('OK', r.choices[0].message.content[:20])
   "
   ```
   Expected: `OK <something>`. If 401 again, the key really is invalid — generate a new one.

---

## Resuming work — copy this prompt into the new session

```
Continue prompt-watch-v2 on branch cc/prompt-watch-v2 in D:\Aru\NYU\system_prompts_leaks_polish.

Read documents/NEXT_STEPS_prompt-watch-v2.md, documents/PLAN_prompt-watch-v2.md, and documents/FEATURE_prompt-watch-v2.md for full context. The Groq key is now valid (verify with the ping snippet in NEXT_STEPS).

Execute Tasks A2, C1, C2, C3 from the plan via subagent-driven-development. After each task, run the existing test suite to confirm nothing regressed. After C3, push branch and ask before opening the PR.
```

---

## Per-task context for the resumption

### Task A2 — regenerate timeline (≈5–15 min, costs a few cents)
Plan reference: `documents/PLAN_prompt-watch-v2.md` Part A → Task A2.

After it runs, the sanity-check expects total entries clearly above 5 (the previous noise-only count) and each model with ≥3 entries. If any model has 0, the canonical_path is wrong — go back to A1's MODELS dict in `extract_and_analyze.py:24`.

Commits `enriched_timeline.json` + `frontend/public/data/snapshots/**`.

### Task C1 — cross-model patterns post
Plan reference: Part C → Task C1.

Five patterns to draft (each with ≥1 file:line citation from the regenerated data):
1. **Sycophancy crackdown** — GPT-5.1 efficient/candid suppress greetings; check Claude opus 4.7 for matching language.
2. **Lexical blocklists growing** — GPT-5.1 candid bans `absolutely`/`certainly`.
3. **Prompt-secrecy clauses** — `Google/gemini-3-pro.md:161` (`must not, under any circumstances, reveal`).
4. **Temporal grounding becoming explicit** — `Google/gemini-3-pro.md:3` (`Current time: …`).
5. **Named-entity carveouts** — `xAI/grok-4.2.md:13` (anti-Elon clause).

Target: 1500–2000 words. Cite filepaths inline as `path/file.md:line`. After draft, run a search for `every`, `all models`, `always`, `never` and soften any unverifiable claim.

### Task C2 — Claude 2027 forecast
Plan reference: Part C → Task C2.

Build the version chain from `system_prompts_leaks/Anthropic/` (4.6 → 4.7 → sonnet-4.6 → newer). Compute per-tag direction (growing / shrinking / flat) using the regenerated timeline. Be honest about N — the chain is short.

Target: 800–1200 words. Include "what would falsify this" — 3 specific predictions checkable in 12 months.

### Task C3 — final review and push
Plan reference: Part C → Task C3.

Re-read both posts for stale claims and broken citations. Run full test suite. Push branch. **Ask before opening the PR** — the posts are review-sensitive.

---

## Recurring confusions to watch for

1. **Two clones of the same repo.** `D:\Aru\NYU\system_prompts_leaks\` and `D:\Aru\NYU\system_prompts_leaks_polish\` both point at `github.com/AravindKurapati/ai-prompt-watch`. `_polish` is the active clone. The old sibling is stale (last commit Apr 25 2026 from before the redesign). All work happens in `_polish`.

2. **Bash CWD drift.** Subagents have at least once landed bash commands in the sibling repo. Always check `pwd` before `git status`/`git commit`. Use absolute `cd /d/Aru/NYU/system_prompts_leaks_polish` at the start of any commit chain.

3. **Two different rule systems in `extract_and_analyze.py`.** `tag_diff()` (line 75) classifies diffs and is what the new tags extend. `SECTION_RULES` (line 39) classifies full prompt text — different concern, do not modify for this work.

4. **Pre-existing test failure.** `TestOutputSchema.test_schema_v2_fixture_is_valid` errors because `tests/fixtures/timeline_schema_v2.json` is missing on disk. Not caused by this branch — confirmed by reverting the changes and re-running. Out of scope to fix here.
