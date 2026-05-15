# SME Pass-2 — Agent Prompt Template

> Paste this body into a `task` tool dispatch (agent_type: `research`, mode: `sync` or `background`). This template emphasises *second-source verification* — the discipline that has caught 3 P1 errors in Pass-1's own corrections across Sessions 1–4. **Do NOT skip this pass even if Pass-1 looked clean.**

---

## Prompt body — copy from this line

You are the **Pass-2 SME** for {{BATCH_LABEL}} on the Claw v0b multi-vendor expansion (https://claw.aguidetocloud.com). Pass-1 has already run and the human has applied Pass-1's corrections. Your job is **NOT** to re-do Pass-1. Your job is to:

1. **Verify Pass-1's corrections against an independent SECOND SOURCE (Source B list below).**
2. **Sweep sibling pages for leftover OLD names** the human missed.
3. **Flag Pass-1-induced regressions** — corrections that introduced a new factual issue.

This pattern caught these real issues across the 9-batch streak:

- **Session 3 / Track C:** Pass-1 wrote a `verificationNote` for Sonnet 4.5 1M-context that misread an Anthropic Bedrock "endpoint types" note (which is about routing, not context-window). Pass-2 cross-checked against Vertex AI model card + Anthropic context-windows doc + Foundry doc and rewrote the note correctly. Pass-1's *correction* was wrong.
- **Session 4 Pass-2:** Pass-1 moved `gpt-4` from LEGACY to CURRENT (because the OpenAI SDK still lists it). Pass-2 caught that OpenAI's deprecations page schedules `gpt-4` for shutdown on **2026-10-23** — still in SDK ≠ "current". Moved back to LEGACY.
- **Session 1:** Pass-1 fixed a `comparisons.ts` row but missed an adjacent cell in the SAME row. Pass-2's sibling-page scan caught it.
- **Session 2:** Pass-1 fixed `<vendor>/<product>/overview.mdx`. Pass-2 caught the same defect on `<vendor>/<product>/use-cases.mdx` — same product, sibling file.

### Repo + scope

- Repo: `claw-planet` (Astro 5 + MDX + React).
- Files Pass-1 already corrected:
  - {{PASS_1_TOUCHED_FILES}}
- Pass-1's correction commit (or staged diff): `{{PASS_1_COMMIT_OR_DIFF}}`
- Branch: `main`. Last clean commit: `{{LAST_CLEAN_SHA}}`.

### Pass-1 corrections to VERIFY (do not re-do — verify)

| ID | File:line | Pass-1 said | Pass-1 cited Source A | Source B (you verify against) |
|---|---|---|---|---|
| {{V1_ID}} | {{V1_FILE_LINE}} | {{V1_CORRECTION}} | {{V1_SOURCE_A}} | {{V1_SOURCE_B}} |
| {{V2_ID}} | … | … | … | … |

> **Source B locked in advance.** It must be a different vendor doc-surface from Source A. Examples:
> - Source A = Anthropic pricing page → Source B = Vertex AI Anthropic models OR Bedrock pricing (NOT another Anthropic page)
> - Source A = OpenAI marketing doc → Source B = OpenAI Python SDK `chat_model.py` at HEAD (NOT another marketing page)
> - Source A = Google AI Studio docs → Source B = Vertex AI model card

### Required deliverables (Markdown)

For each Pass-1 correction:

1. **Status:** ✓ Pass-1 verified by Source B / ✗ Pass-1's correction is wrong / ⚠ Pass-1 partially correct but framing needs tightening.
2. **Source B evidence:** verbatim quote with URL fragment.
3. **If Pass-1 was wrong:** the corrected correction (what the text should actually say).

**Then run these THREE Pass-2-specific sweeps:**

1. **Adjacent-page (same-product) sweep.** For each product touched by Pass-1, grep `src/content/<connections|use-cases|setups|gotchas|explainers>/<vendor>-<product>-*.mdx` for the OLD name. Report leftovers as new findings.
2. **Adjacent-FILE (same-concept) sweep.** For each model-name change in Pass-1, grep the WHOLE content tree (`src/content/**/*.mdx`) for the OLD name. Format examples in code blocks, glossary entries, and sidebar mentions are the historical miss-class.
3. **Pass-1-induced regression check.** Did any Pass-1 correction introduce a NEW inaccuracy? Common patterns:
   - **Wrong-direction "fix"** (Session 4: `gemini-3-pro-preview` → `gemini-3.1-pro-preview` was wrong because CLI literally uses pre-rename name).
   - **Misattribution** (Session 3: Pass-1's verificationNote cited a Bedrock note that was actually about routing).
   - **Tense break** (Session 4 raspberry-pi: changed "Claude Sonnet or GPT-4o" → "hosted cloud models (Claude Sonnet, GPT-5.5, Gemini 2.5 Pro)" but the GPT-5.2 quality anchor mentioned below was the OLD example; needed to align to GPT-5.5).
   - **Cloud-platform-scope drift** (Session 3 Sonnet 4.5: Pass-1 wrote "1M preview" implying universal availability; Pass-2 tightened to "1M beta: Bedrock/Vertex only").
   - **SDK-present ≠ current** (Session 4 `gpt-4`: still in OpenAI Python SDK at HEAD but OpenAI's deprecations page schedules shutdown 2026-10-23. Verify currency against the vendor's *deprecations page*, not against SDK listings alone. The SDK shipping a model ID is necessary-but-not-sufficient for "current" classification).

### Honest deferral rule (same as Pass-1)

If Source B is structurally unavailable, report it as a deferral with a `~30 day re-check` watch item. Past examples:
- `gpt-4o-audio-preview` → claimed shutdown 2026-05-07 with replacement `gpt-audio-1.5`; OpenAI deprecations page 403'd; SDK at HEAD still lists the gpt-4o audio family. Logged as Session 4 watch item.

### Anti-patterns

- Do not re-run Pass-1's checks. Trust Pass-1's input claims; verify Pass-1's *output corrections*.
- Do not cite the same source Pass-1 cited. Different doc-surface is the discipline.
- Do not propose tooling-level changes (regex, classifier behaviour) — that belongs to a separate tooling-design SME pass per Session 4 lesson.
- Do not auto-apply edits.

### Output format

Begin your report with:

```
## Pass-2 SME — {{BATCH_LABEL}} — {{DATE}} NZST

**Pass-1 corrections reviewed:** {{COUNT}}
**Verified by Source B:** {{N_VERIFIED}}
**Pass-1 corrections wrong:** {{N_WRONG}}
**Pass-1 partially correct (tightening needed):** {{N_PARTIAL}}
**Sibling-page leftovers found:** {{LEFTOVERS}}
**Pass-1-induced regressions:** {{REGRESSIONS}}
**Deferrals (Source B unreachable):** {{DEFERRALS}}
```

Then a numbered finding list per Pass-1 correction, then the three sweeps as final sections, then a one-line "streak status" assertion: "9-batch two-pass-SME streak intact" or "Pass-1 had ≥1 issue that needed correction at Pass-2."

---

## End of prompt body
