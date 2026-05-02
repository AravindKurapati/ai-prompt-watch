# What Claude's System Prompt Might Look Like in April 2027: A Falsifiable Forecast

*This is a companion piece to "What I learned by tracking 4 frontier system prompts." Read that first for methodology context.*

---

## The Data (N=3)

I have three disclosed Claude system prompt versions in the corpus:

| File | Lines |
|---|---|
| `Anthropic/claude-sonnet-4.6.md` | 5,348 |
| `Anthropic/claude-opus-4.6.md` | 4,566 |
| `Anthropic/claude-opus-4.7.md` | 3,903 |

Before making any predictions, the most important thing the data shows is that **opus 4.7 is shorter than opus 4.6** — by about 15%. This is not what you'd expect if the working assumption is "system prompts only grow." They can shrink. Sonnet-4.6 is the longest of the three, which makes sense: a general-use model running across more product surfaces needs more instructions than a focused opus-class deployment.

The chain is short. Three data points are enough to spot structure but not enough to fit a trend with confidence. I'll mark each prediction with a confidence level.

---

## Observed Trends

| Dimension | Direction | Evidence |
|---|---|---|
| XML structuring | Increasing | `<user_wellbeing>` block in opus 4.7 (`claude-opus-4.7.md:112`) is a named protocol, not a bullet in a general safety section |
| Wellbeing protocol | Separated from safety | Dedicated XML block covers self-harm, addiction, disordered eating, suicidal ideation, mania/psychosis detection — all distinct from generic harm refusal |
| Temporal grounding | Explicit and operational | `claude-opus-4.7.md:188-190`: specific knowledge cutoff (end of Jan 2026), search-first routing, date-aware query construction rules |
| Anti-sycophancy | Moving from implicit to explicit | `claude-opus-4.7.md:168`: "avoid becoming increasingly submissive," "maintain self-respect" — phrased as a behavioral disposition, not just a tone note |
| Prompt length | Non-monotonic | opus 4.7 shrank ~15% vs 4.6 despite adding more structured content; consolidation through XML replaced loose prose |

---

## Six Predictions for April 2027

### 1. Wellbeing protocol will have versioning or expanded case coverage
**Confidence: High**

The `<user_wellbeing>` block in opus 4.7 is already detailed — it covers self-harm, disordered eating, addiction, mania, psychosis, dissociation, and suicidal ideation as distinct cases. It explicitly prohibits naming specific methods even in "means restriction" safety planning contexts. The next version likely adds at least one new case or splits the block.

Candidate additions: eating disorder recovery protocols distinct from general wellbeing advice; gambling and financial harm behaviors (currently absent); caregiver distress (someone asking on behalf of a family member in crisis).

**Falsified if:** the `<user_wellbeing>` block is unchanged in wording and scope.

---

### 2. A named `<lexical_constraints>` block
**Confidence: Medium-High**

OpenAI's GPT-5.1 personality variants have explicit word-ban lists — "absolutely," "certainly," "of course" appear as banned filler in the "candid" personality. Claude opus 4.7 does not have an equivalent explicit list; word avoidances are implicit in the persona guidance.

Given that OpenAI has already formalized this and that Anthropic is observably borrowing structural ideas (XML blocks, explicit protocols), expect a named `<lexical_constraints>` or `<communication_style>` section that enumerates specific words and phrases to avoid.

**Falsified if:** no such explicit block appears, and lexical guidance remains scattered in persona prose.

---

### 3. Search routing becomes per-topic rather than a single blanket rule
**Confidence: Medium**

Currently: "if information may have changed since the knowledge cutoff, search." (`claude-opus-4.7.md:1127`)

This is a single rule. In practice, the categories of "may have changed" are very different: financial prices (always stale within hours), scientific consensus (rarely stale within years), election results (stale on a specific known date), software versions (stale on every release). A blanket rule produces both over-search (historical facts) and under-search (fast-moving topics).

Expect per-topic routing: a list of categories with explicit search policies (always / on-request / never), analogous to how the current prompt already special-cases "time-sensitive events that may have changed since the knowledge cutoff."

**Falsified if:** routing remains a single blanket rule with no categorical distinctions.

---

### 4. Anti-sycophancy gets its own named block
**Confidence: High**

Right now, anti-sycophancy guidance is scattered across persona sections: "maintain self-respect" (`claude-opus-4.7.md:168`), "avoid collapsing into self-abasement" (same section), the overall framing around honest pushback. It reads as persona guidance, not as a behavioral protocol.

Given the industry-wide convergence on this as a named concern (Anthropic has written publicly about sycophancy as a failure mode; Grok has explicit anti-sycophancy rules at `xAI/grok-4.2.md:23`), expect Anthropic to formalize this into a named block with enumerated failure modes: capitulation under correction, excessive agreement, apology as avoidance, etc.

**Falsified if:** sycophancy guidance remains distributed across persona prose with no named section.

---

### 5. Prompt length stays within ±20% of today's 3,903 lines
**Confidence: Medium**

The opus 4.7 shrink was intentional restructuring — converting prose instructions into XML blocks. This consolidation pattern does not suggest a trend toward minimalism; it suggests a trend toward denser, more machine-readable structure. More XML means more can be said in fewer lines.

I expect further consolidation (net length roughly flat to slightly shorter) rather than either radical growth or radical shrinkage.

**Falsified if:** the prompt exceeds ~4,700 lines (20% above current) OR drops below ~3,100 lines (20% below).

---

### 6. Memory/user-model section expands and adds explicit policies
**Confidence: Medium-High**

Claude already stores user memories and has guidance about when not to reference them (`claude-opus-4.7.md:207`, `claude-opus-4.7.md:217`). The current guidance is mostly prohibitive — don't bring up sensitive memories unprompted, don't label stored data as "the user's profile." It does not yet specify how memories should be actively used.

Expect the next version to add policies on the other side: when to proactively use stored context (vs. waiting to be asked), how to handle conflicting memories, how to handle a user who explicitly asks Claude to forget something.

**Falsified if:** the memory section shrinks, is removed, or has no new active-use policies.

---

## What Would Falsify Everything

All six predictions share a single failure mode: Anthropic changes the system prompt's fundamental architecture.

Two plausible moves that would break most predictions:

**Learned behavior replaces explicit instruction.** If Anthropic moves more behavioral constraints into RLHF/RLAIF rather than system prompts, the prompt could shrink dramatically and the predictions about named blocks would all be wrong. The prompt would become a thin routing layer.

**Multi-agent orchestration fragments the prompt.** If Claude 5.x runs as an orchestrator over specialized sub-models — a safety model, a tool-use model, a persona model — each sub-model might have a minimal prompt, and the monolithic 3,900-line structure would not apply. The predictions are implicitly about a monolithic architecture continuing.

Both of these are plausible. Neither has been signaled. I consider them unlikely but non-negligible.

---

## Check Back April 2027

If these predictions are right, the `<user_wellbeing>` block will have expanded, there will be a named anti-sycophancy section, and the prompt will be 3,500–4,700 lines with more XML structure and less prose. If I'm wrong, open an issue on the repo.

The dashboard is at [aravindkurapati.github.io/system_prompts_leaks](https://aravindkurapati.github.io/system_prompts_leaks). The corpus is public. Come check the predictions yourself.
