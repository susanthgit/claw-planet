# SME Pass-2 (Tooling) — Agent Prompt Template

> Paste this body into a `task` tool dispatch (agent_type: `research`, mode: `background`). **This template is for TOOLING-level changes** (regex, classifiers, build scripts, CI gates) — distinct from `sme-pass-2.md` which is for CONTENT corrections second-sourcing.
>
> Formalised 2026-05-16 (Session 8 — 3rd reuse threshold) from the one-off prompts used in Sessions 6 + 7. Pass-2 tooling-SME has caught what Pass-1 doesn't in 2/2 tooling sessions — most notably the `davinci-002`/`babbage-002` coverage gap that Session 6 Pass-1 marked P2 but Pass-2 escalated to P1 by reading the script's own comment block against its code.

---

## When to use this vs `sme-pass-2.md`

| Use **sme-pass-2.md** (content) | Use **sme-pass-2-tooling.md** (this file) |
|---|---|
| Pass-1 already corrected an `.mdx` / `.ts` content claim | Pass-1 already verified a `scripts/*.mjs` tooling change |
| Source B = different vendor doc surface | Source B = sibling-script + internal consistency + backward-compat |
| Sibling sweep = adjacent content files for OLD names | Sibling sweep = adjacent build-time scripts for coupling |
| Failure mode = wrong-direction "fix" | Failure mode = code-vs-comment drift / strict-mode regression |

The Pass-2 discipline (second-sourcing) applies to both, but the *kind* of "second source" differs. For tooling, your second source is the script's own documentation + its sibling scripts + its backward-compatibility contracts.

---

## Prompt body — copy from this line

You are the **Pass-2 tooling-SME** for {{TOOLING_CHANGE_LABEL}} on the Claw v0b multi-vendor expansion (https://claw.aguidetocloud.com). Pass-1 tooling-SME has already run and verified vendor sources + regex coverage. Your job is **NOT** to re-do Pass-1. Your job is to verify the script's INTERNAL CONSISTENCY:

1. **Sibling-script coupling** — did the change introduce hidden coupling with other build-time scripts?
2. **Strict-mode invariant preservation** — does the CI exit-1 path still gate on the same surface, no more, no less?
3. **Sidecar / suppression interaction** — do existing suppression entries still work under the new regex/classification?
4. **Code-vs-comment consistency** — does the script's header / inline comments accurately describe what the new code does? *(highest-value Pass-2-tooling axis — Session 6 lesson)*
5. **Backward-compatibility contracts** — every previous session's invariant still holds.

This is a TOOLING-LEVEL Pass-2 — distinct from content Pass-2. The 5 sweeps below are tooling-specific; they correspond to the 3 sweeps in `sme-pass-2.md` (adjacent-page / adjacent-FILE / Pass-1-induced regression) but adapted.

### Repo + scope

- Repo: `claw-planet` (Astro 5 + MDX + React; Node.js 20+ build-time tooling under `scripts/`).
- Script Pass-1 already verified: `{{SCRIPT_PATH}}`
- Pass-1's correction commit (or staged diff): `{{PASS_1_COMMIT_OR_DIFF}}`
- Branch: `main`. Last clean commit: `{{LAST_CLEAN_SHA}}`.
- Sibling scripts: `voice-lint.mjs`, `audit-claims.mjs`, `audit-verification-states.mjs`, `integrity-check.mjs`, `smoke-check.mjs`, `deploy.mjs`, and any others listed at {{SIBLING_SCRIPT_LIST}}.

### Pass-1's verified changes (to VERIFY for internal consistency — do not re-do)

| ID | Change kind | Where | Pass-1 said | Pass-1 cited Source A |
|---|---|---|---|---|
| {{V1_ID}} | regex / list / behaviour / comment | {{V1_FILE_LINE}} | {{V1_CORRECTION}} | {{V1_SOURCE_A}} |
| {{V2_ID}} | … | … | … | … |

### Required deliverables (Markdown) — 5 sweeps

For each Pass-1 change, run all 5 sweeps below. For each sweep, report:

- ✓ verified-clean items (concise; one bullet per item)
- ⚠ P0/P1 issues with code locations and concrete fix
- ⓘ P2 observations
- Coverage statement (what was checked, what wasn't)

---

#### Sweep 1 — Sibling-script coupling

`grep` all sibling scripts in `scripts/` for any of: model list names (`LEGACY_MODELS`, `KNOWN_CURRENT_MODELS`, `SKIP_PRODUCT_SLUGS`), regex constants (`API_ID_RE`, `HUMAN_RE`), sidecar reads (`audit-blurbs.ignore`, suppression annotations), `--scope=` argument flags, or any constant that the changed script exports/relies on.

**Expected for audit-blurbs polish:** 0 hits in any sibling script. Confirm.

If any sibling embeds the changed list or pattern, that's a **P1** — the change is silently coupled across files.

Past lesson (Session 6): if a second script ever grows a model list, extract `LEGACY_MODELS`/`KNOWN_CURRENT_MODELS` to a shared module `src/lib/model-registry.mjs` and have both scripts import it.

---

#### Sweep 2 — Strict-mode invariant + exit-condition trace

For any change touching exit logic, classifier output, or strict-mode behaviour:

1. Read the `process.exit(1)` / `process.exit(0)` paths in the script.
2. Trace what `targetLegacy` / `targetInfo` / equivalent arrays appear in the exit conditions.
3. Verify the change doesn't introduce a new path that bypasses or shortcuts the exit logic.

**Expected for audit-blurbs:** `contentLegacyHits` is exclusively in printing blocks, never in any `process.exit(1)` condition (Session 6 invariant — content scope is advisory-only).

If a strict-mode contract is regressed, that's a **P0** — CI behaviour changes.

Past lesson (Session 4): `audit-claims.mjs` reads `dist/` and silently reports 0 broken links if `dist/` doesn't exist. The only guard is workflow step ordering. Strict-mode contracts depend on workflow ordering more than they look — verify both.

---

#### Sweep 3 — Sidecar / suppression interaction

For each existing suppression entry (`audit-blurbs.ignore.json` for audit-blurbs; inline `audit-blurbs:ignore` annotations for `.astro`/`.ts`):

1. Manually trace each entry under the NEW regex/classification. Does the token still match the same regex branch? Does `classify()` still produce the same canonical form? Does the suppression still fire?
2. Are there new default-scope hits introduced by the change? Should the sidecar gain new entries? Should existing entries be removed?

Past lesson (Session 6): 5 sidecar entries — 3 Sonnet 4/5 prose + 2 historical Gemini-1.5 citations. After regex changes, each must still suppress correctly.

If any existing suppression no longer fires, that's at least a **P2** (sidecar is now stale and should be cleaned).

---

#### Sweep 4 — Code-vs-comment consistency *(highest-value Pass-2-tooling axis)*

This is the sweep that Pass-1 can't catch and Pass-2 always can. Pass-1 verifies the code against vendor sources; Pass-2 verifies the code against its own documentation.

1. Read every comment block touched by Pass-1's change (header / module / inline above modified lines).
2. For each comment claim about code behaviour, trace whether the claim is accurate post-change.
3. Specifically flag:
   - **Stale comments** — claim X but code now does Y after Pass-1's change.
   - **Wrong line numbers** — comments citing "line N" that shifted after edits.
   - **Convention violations** — comment claims a convention (e.g. "both forms always listed") but Pass-1's change broke the convention (e.g. listed only one form).
   - **Mis-described trade-offs** — comment says "we accept X because Y" but the change made Y untrue.

Past lessons:
- Session 6: comment claimed "all real legacy citations use the prefixed form" but `davinci-002` / `babbage-002` are bare-suffixed and still on OpenAI's Completions API. Comment-vs-code mismatch → P1 → fixed in same commit.
- Session 7: comment claimed `-001` was "canonical API-ID form" for Bison but Vertex AI uses `@001` (at-sign) versioning. Comment cosmetic-but-misleading → P2 → fixed.
- Session 7 Pass-2: `llama4` no-hyphen form missing from KNOWN_CURRENT despite the comment block explicitly establishing the "two-forms Ollama convention" → P2 → fixed in same commit.

Code-vs-comment mismatches are ALWAYS at least P2 (cosmetic) and OFTEN P1 (future maintainers read code, not SME reports).

---

#### Sweep 5 — Backward-compatibility contracts

For each previous session's invariant (read `learning-docs/docs/reference/claw-v0b-followups-prompt.md` Session 4 + 6 + 7 entries for the canonical list), verify it still holds:

| Session | Contract | How to verify |
|---|---|---|
| 4 | Inline `audit-blurbs:ignore` annotation suppresses on same source line | Trace lookup in `scanFile()` |
| 4 | `--strict` exits 1 on default-scope LEGACY hits | Trace exit logic |
| 6 | Sidecar context-substring guard works (line approximate) | Run audit; verify 5 entries fire |
| 6 | `--scope=content` advisory-only — never blocks CI | Trace `contentLegacyHits` never in exit-1 path |
| 7 | Two-forms Ollama convention — every Ollama-tagged family has both hyphenated AND no-hyphen forms | Read KNOWN_CURRENT_MODELS for completeness |
| {{ADD_NEW_CONTRACT_HERE}} | … | … |

Also trace ≥5 previously-classified tokens through the new pipeline to confirm no regression:

| Token | Previous classification | Post-change classification | Status |
|---|---|---|---|
| `claude-sonnet-4-6` | CURRENT | {{TRACE_RESULT}} | ✓ / ✗ |
| `gpt-5.5` | CURRENT | {{TRACE_RESULT}} | ✓ / ✗ |
| `text-bison` | LEGACY (post-S7) | {{TRACE_RESULT}} | ✓ / ✗ |
| `Marie Curie` | NO MATCH | {{TRACE_RESULT}} | ✓ / ✗ |
| `gemma3n` (if added) | CURRENT (post-S8) | {{TRACE_RESULT}} | ✓ / ✗ |

Any regression on a previously-classified token is a **P0** — the change broke a working contract.

---

### Anti-patterns (DO NOT do)

- Do NOT re-run Pass-1 checks. Trust Pass-1's vendor verification; verify Pass-1's output for internal consistency.
- Do NOT cite the same vendor source Pass-1 cited. For Pass-2 tooling, your "second source" is the script's own documentation + sibling scripts + backward-compat traces.
- Do NOT propose new tooling features. Verify the change as-shipped; flag scope creep separately as a Session 8 candidate item.
- Do NOT auto-apply edits.

### Output format

Begin your report with:

```
## Pass-2 tooling-SME — {{TOOLING_CHANGE_LABEL}} — {{DATE}} NZST

**Script reviewed:** `{{SCRIPT_PATH}}`
**Pass-1 changes verified for consistency:** {{COUNT}}
**Sweep 1 (sibling coupling):** {{S1_HITS}} hits in sibling scripts
**Sweep 2 (strict-mode invariant):** preserved / regressed
**Sweep 3 (sidecar interaction):** {{S3_VERIFIED}} entries verified
**Sweep 4 (code-vs-comment):** {{S4_MISMATCHES}} mismatches found
**Sweep 5 (backward-compat):** {{S5_CONTRACTS}}/{{S5_TOTAL}} contracts preserved
**Findings:** {{P0_COUNT}} P0 · {{P1_COUNT}} P1 · {{P2_COUNT}} P2 · {{DEFERRED}} deferred
```

Then a numbered finding list per sweep, then a one-line streak-status assertion: "Pass-2 tooling-SME caught {{N}} issue(s) that Pass-1 didn't" or "Pass-2 clean".

End with verdict: **GREEN** (ship as-is) / **YELLOW** (1–2 P1 fixes needed) / **RED** (P0 — do not commit).

---

## End of prompt body
