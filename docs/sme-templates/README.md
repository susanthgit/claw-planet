# Claw — SME Templates

Operational templates for the two-pass parallel-agent SME pattern used in every Claw v0b batch.

> **Why these exist (set Sat 16 May 2026, Phase 1.1 Session 5 / Track D.3):**
> The dispatch wording has been hand-copied across 9 batches (Batches 0, 0b, A, B, C, D, E + Phase 1.1 Sessions 1–4). Without a stable template, small slippages happen: Pass-2 once forgot to specify "use a *second* source", Pass-1 corrections sometimes shipped without independent verification (Session 3 / Sonnet 4.5 / Bedrock-endpoint-types misreading), sibling-pages were missed (Session 2 / use-cases vs overview). These templates codify the patterns the past 9 batches learned.

## When to use which

| File | When | Used by |
|---|---|---|
| [`claim-packet.md`](./claim-packet.md) | **Before any content edit.** Lists files touched, claims to verify, sibling-page greps, sources A and B. Hands the planning to a future-me reading the session journal. | You, at the planning step |
| [`sme-pass-1.md`](./sme-pass-1.md) | **Pass-1 agent prompt.** Verify your initial drop against canonical Source A. Lands findings as P0/P1/P2 + verified-clean. | `task` tool dispatch (research agent) |
| [`sme-pass-2.md`](./sme-pass-2.md) | **Pass-2 agent prompt.** Verify Pass-1's *corrections* against an independent Source B. **This is where the streak compounds.** | `task` tool dispatch (research agent) |

## How to use

1. Open `claim-packet.md`, copy the body, fill in your session's specifics. Save the filled packet to `~/.copilot/session-state/<sid>/files/claim-packet-<batch>.md`.
2. After making your initial edits (the "Pass-1 drop"), dispatch a research agent using `sme-pass-1.md` filled in with the claims to verify. Apply the agent's corrections.
3. After Pass-1 corrections are applied, dispatch a *second* research agent using `sme-pass-2.md` (against a different source surface — Vertex AI pricing for Anthropic prices verified by Bedrock marketing, etc.). Apply the second pass's corrections.
4. Run the 5 local CI gates. Commit. Deploy. Smoke.

## What these templates do NOT do

- They do **not** auto-dispatch agents. The `task` tool is the dispatcher — these are the prompts you paste into it.
- They do **not** apply fixes. Every correction is reviewed before commit.
- They are **not** a Node script. Earlier session designs proposed `scripts/sme-validation.mjs`; the cost/benefit of formalising this as code is poor until 3+ more sessions confirm the placeholders are stable. (See `learning-docs/docs/reference/claw-v0b-followups-prompt.md` § Session 5 for the duck rationale.)
- They are **not** a tooling-design SME. Verifying new scripts, classifier logic, regex patterns, or audit-script embedded assumptions requires a **separate tooling-SME pass** (Session 4 lesson: Track D.1's model-classification lists needed independent fact-checking that a content-SME pass wouldn't have caught — "the script ran without crashing" ≠ validated). When changing `audit-blurbs.mjs` / `voice-lint.mjs` / similar, write a dedicated tooling-design prompt instead of reusing these templates.

## Cross-reference

- Sessions 1–4 patterns captured here: `learning-docs/docs/reference/claw-v0b-followups-prompt.md` lines 140–230.
- Voice/tone rules: `~/.copilot/copilot-instructions.md` § Sush's Voice Rule + the brag-allergy section.
- The "5 CI gates" the templates assume already pass before SME dispatch: `voice-lint --strict` → `audit-blurbs --strict` → `audit-verification-states` → `build:no-search` → `integrity-check`.
