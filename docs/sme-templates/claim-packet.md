# Claim Packet — Pre-Pass-1 SME planning template

> Fill this in **before** dispatching the Pass-1 SME agent. Save the filled packet to your session-state `files/` for the journal "pick up here" pointer.

## 0. Session metadata

- **Batch/session label:** _e.g. "Phase 1.1 Session 5 — Tracks D.3+D.4+D.5 (infra-only)"_
- **Date:** _YYYY-MM-DD NZST_
- **Repo + branch:** _e.g. `claw-planet` `main`_
- **Last clean commit:** _commit SHA (the rollback target if anything breaks)_

## 1. Files you intend to touch (Pass-1 drop scope)

| File | Reason for the edit | Sources cited in the edit |
|---|---|---|
| _e.g._ `src/data/comparisons.ts:264` | _Foundry audio surface cell update_ | _developers.openai.com/codex/models_ |
| _e.g._ `src/content/setups/raspberry-pi.mdx:151` | _Quality anchor refresh_ | _openai-codex docs_ |

> **🔴 Mandatory pre-Pass-1 step — sibling-page grep.** Sessions 1-3 lessons:
> 1. **Adjacent-row coupling** (Session 1): when fixing a row in a `comparisons.ts` table, scan *every* cell in the same row for adjacent stale mentions.
> 2. **Adjacent-page same-product coupling** (Session 2): when fixing a model spec on `<vendor>/<product>/overview.mdx`, grep the SIBLINGS (`use-cases`, `pitfalls`, `getting-started` for the SAME product) for the OLD name.
> 3. **Adjacent-FILE same-concept coupling** (Session 3): when fixing a model name in one explainer, grep the WHOLE content tree (`explainers/`, `use-cases/`, `setups/`, `connections/`) for the OLD name — format-example leftovers in code blocks were missed three times.

Run BEFORE the Pass-1 drop:

```pwsh
cd C:\ssClawy\claw-planet
# Replace OLD-NAME with the literal you're replacing.
# `--type mdx` is not built into ripgrep — use a glob instead so this works on
# fresh installs (incl. the Ubuntu CI runner) without a `.ripgreprc`.
rg -n -g "*.{md,mdx,ts}" "OLD-NAME" src/
```

List the grep hits here so the Pass-1 dispatcher sees them as part of the file scope:

- [ ] _file:line_ — _outcome (edit this session / `audit-blurbs:ignore` / unchanged because…)_

## 2. Claims to verify (the Pass-1 SME's target list)

| ID | File:line | Claim | Source A (canonical) | Notes |
|---|---|---|---|---|
| C1 | _e.g._ `comparisons.ts:264` | _"OpenAI Foundry audio cell uses gpt-4o-audio-preview"_ | _developers.openai.com_ | _Watch item: replacement may be `gpt-audio-1.5`_ |

## 3. Pass-1 sources (canonical-doc surface for each claim)

| Source A reference | URL or doc-path | Why it's canonical |
|---|---|---|
| _Anthropic pricing_ | _anthropic.com/pricing_ | _Anthropic's own surface_ |
| _OpenAI deprecations_ | _platform.openai.com/docs/deprecations_ | _Vendor source-of-truth_ |

> **Honest deferral rule (Session 3 lesson):** If a canonical source is structurally unavailable (JS-rendered, 403 on fetch, paywalled), DO NOT invent numbers. Frame as "not quoted here — check vendor page." Flag the limitation in the claim packet so Pass-1 doesn't fabricate attribution.

## 4. Pass-2 sources (the *second* surface — locked in advance)

> **9-batch streak lesson:** Pass-2 catches what Pass-1 missed precisely *because* it uses a different vendor doc-surface. Lock these in advance so Pass-2 can't lazily re-use Pass-1's sources.

| Source A (Pass-1 cited) | Source B (Pass-2 will verify against) | Why these are independent |
|---|---|---|
| _ai.google.dev/pricing_ | _cloud.google.com/vertex-ai/pricing_ | _Separate Google product surfaces; pricing pages diverge_ |
| _anthropic.com/pricing_ | _Vertex AI Anthropic models / Bedrock pricing_ | _Different commercial surface_ |
| _developers.openai.com/codex_ | _OpenAI Python SDK chat_model.py_ | _Marketing docs vs SDK at HEAD_ |

## 5. Voice-duck targets

Run between Pass-1 + Pass-2 (or alongside Pass-1). The voice-duck is a small parallel agent that looks for:

- Marketing-buzzword infections that slipped past `voice-lint --strict` (e.g. `.ts` data-file string with `flagship` before Track D.2 shipped).
- **Adjacent-page naming/pricing mismatches** (Session 3 example: `gemini-3-pro-preview` in models.mdx + Flash pricing on Pro row, vs canonical `google-gemini-api-models.mdx` had `gemini-3.1-pro-preview` + $2/$12).
- Sush voice infractions: brag-allergy hits, "for people like us" tone breaks, claims that imply we have insider info we don't.

## 6. Done conditions for this batch

- [ ] Pass-1 corrections applied (with each correction citing the Pass-1 agent's evidence)
- [ ] Pass-2 corrections applied (with each correction citing the Pass-2 agent's *second-source* evidence)
- [ ] Watch items + intentional deferrals logged in the session journal entry
- [ ] 5 local CI gates: `voice-lint --strict` → `audit-blurbs --strict` → `audit-verification-states` → `build:no-search` → `integrity-check`
- [ ] Commit with explicit paths + Copilot co-author trailer
- [ ] Deploy + post-deploy smoke `45/45` + 4-5 URL spot-checks
- [ ] Followups + journal updated

## 7. Roll-back plan (if something ships broken)

- **Revert first, investigate second.** Mandatory: `git revert <commit-sha>` + `npm run deploy`. Do not debug on production.
- The last clean commit (from §0) is the rollback target. Confirm it deploys before investigating root cause.
