#!/usr/bin/env node
/**
 * audit-blurbs.mjs — vendor-hub + product-hub + canonical-data freshness gate.
 *
 * Catches stale model/version mentions on the most-visible Claw surfaces:
 *   - the 5 vendor hub landing pages (src/pages/<vendor>/index.astro)
 *   - the 4 product hub PRODUCT_META ledes (src/pages/<vendor>/[product]/index.astro)
 *   - the 3 canonical data files (src/data/comparisons.ts, updates.ts, toolRegistry.ts)
 *
 * Design (per the v0b Phase 1.1 Session 4 rubber-duck — Track D.1):
 *   - LEGACY_MODELS is the primary signal. A hit on any of these is a P1 flag.
 *   - KNOWN_CURRENT_MODELS is for noise suppression — silent when matched.
 *   - Anything else that looks like a model name → INFO (review attention).
 *   - Product slugs (claude-api, gemini-cli, codex-cli, etc.) are matched
 *     by the API-ID regex but explicitly skipped by SKIP_PRODUCT_SLUGS so
 *     they don't generate noise.
 *
 * Modes:
 *   --warn (default) — exit 0 always; print findings; advisory
 *   --strict          — exit 1 if any LEGACY_MODELS hit (INFO never blocks)
 *
 * Suppression (two mechanisms, both supported — Session 5 + 6):
 *   - Inline `audit-blurbs:ignore` annotation on the same source line.
 *     Use for .astro / .ts comment contexts where the annotation doesn't
 *     leak into rendered output.
 *   - Sidecar `audit-blurbs.ignore.json` at repo root. Use for .mdx prose
 *     where an inline annotation would render as visible text. Schema:
 *       [{
 *         "file":     "src/content/.../X.mdx",  // repo-relative, forward slashes
 *         "line":     80,                         // approximate; informational only
 *         "token":    "Gemini 1.5 Pro",          // case preserved as found
 *         "context":  "June 2024",                // STRICT substring guard — must
 *                                                 //   appear in current line text
 *         "reason":   "Historical citation",
 *         "added":    "2026-05-16",               // YYYY-MM-DD
 *         "reviewAfter": "2027-05-16"             // optional; default = added + 365d
 *       }, ...]
 *     EXAMPLE — `context` MUST be a verbatim, case-sensitive substring of
 *     the source line, NOT a description of why the token is OK:
 *       Source line:  Until June 2024, Gemini 1.5 Pro was the default.
 *       ✓ CORRECT     "context": "June 2024"            (literally in the line)
 *       ✓ CORRECT     "context": "Gemini 1.5 Pro was"   (also literally in the line)
 *       ✗ WRONG       "context": "june 2024"            (wrong case — won't suppress)
 *       ✗ WRONG       "context": "historical citation"  (describes intent — not in line)
 *       ✗ WRONG       "context": "before the rebrand"   (describes context — not in line)
 *     The matcher runs `lineText.includes(context)` — case-sensitive, no
 *     normalisation. A description-style or wrong-case `context` silently
 *     fails to suppress (the unused-sidecar diagnostic at end-of-run will
 *     flag it, but only after a CI failure has already happened).
 *     Tip: copy the substring out of the actual source line.
 *
 *     Hit at file F line L token T is suppressed iff there exists entry where
 *     e.file === F AND e.token.toLowerCase() === T.toLowerCase() AND the
 *     hit's current-line-text contains e.context. Line number is informational
 *     only — robust to line-shifts from unrelated edits.
 *     Hard-fails (exit 1) on malformed JSON or missing required fields.
 *     Missing sidecar file = empty suppressions (no error).
 *     Warns (doesn't block) on entries where now > reviewAfter.
 *
 * Maintenance (set 2026-05-16):
 *   When a new model generation lands, add the canonical name(s) to
 *   KNOWN_CURRENT_MODELS and the now-superseded one(s) to LEGACY_MODELS.
 *   Bump the `lastVerified` constant. INFO hits become the queue for the
 *   next freshness sweep.
 *
 * Set 2026-05-15 (Claw v0b · Phase 1.1 Session 4 · Track D.1).
 * Revised 2026-05-16 (Claw v0b · Phase 1.1 Session 6 — Ollama no-hyphen tags;
 *   explicit OpenAI legacy text-IDs replace bare curie/davinci/babbage/bison;
 *   sidecar suppression with context guard).
 * Revised 2026-05-16 (Claw v0b · Phase 1.1 Session 7 — gemma-?\d+(?:\.\d+)?
 *   regex consistency with sibling llama-?/qwen-? shape; bare-Bison detection
 *   via narrowed prefixed-branch (Bison suffix optional, OpenAI/Codex roots
 *   keep mandatory suffix); explicit bare-Bison LEGACY entries; gemma3/gemma4
 *   added to KNOWN_CURRENT for Ollama tag form; walkContent() result cached
 *   when --scope=content active).
 * Revised 2026-05-16 (Claw v0b · Phase 1.1 Session 8 — Gemma prose detection
 *   added to HUMAN_RE; gemma3n family detection via tight n-suffix grouping
 *   `gemma-?\d+(?:(?:\.\d+)|n)?...`; gemma3n + gemma-3n added to KNOWN_CURRENT
 *   (Ollama two-forms convention); --scope=all undocumented alias removed).
 * Revised 2026-05-17 (Claw v0b · Phase 1.1 Session 13 — sidecar schema
 *   comment gains a worked CORRECT/WRONG example clarifying that `context`
 *   is a case-sensitive verbatim substring of the source line, not a
 *   description of intent; the matcher is `lineText.includes(e.context)`.
 *   Comment-only polish; no behaviour change. Surfaced after Session 11
 *   added a sidecar entry with a description-style context that silently
 *   failed to suppress.).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODE = process.argv.includes('--strict') ? 'strict' : 'warn';
// `--scope=content` (Session 6): also scan src/content/**/*.mdx as an
// advisory-only pass. The default 12-file gate stays the CI-blocking
// surface; content-scope hits are ALWAYS exit 0 regardless of --strict.
// LEGACY hits in content are reported but never block.
const INCLUDE_CONTENT = process.argv.includes('--scope=content');

// Bump when refreshing the lists below. Audit-blurbs warns if you run it more
// than 90 days after this date — that's the prompt to re-sweep current models.
const LAST_VERIFIED = '2026-05-16';
const STALENESS_WARN_DAYS = 90;

// Sidecar suppression file (Session 6). Loaded at startup. See header comment
// for schema. Repo-root path; absent file = empty suppressions.
const SIDECAR_FILENAME = 'audit-blurbs.ignore.json';
const SIDECAR_DEFAULT_REVIEW_DAYS = 365;

// ---------------------------------------------------------------------------
// Scan scope (locked per rubber-duck finding 4 — keep src/content/ OUT for
// Session 4; revisit in Session 5+ after the noise profile is known).
// ---------------------------------------------------------------------------
const SCAN_PATHS = [
  // 5 vendor hubs
  'src/pages/anthropic/index.astro',
  'src/pages/openai/index.astro',
  'src/pages/google/index.astro',
  'src/pages/microsoft/index.astro',
  'src/pages/openclaw/index.astro',
  // 4 product-hub PRODUCT_META ledes
  'src/pages/anthropic/[product]/index.astro',
  'src/pages/openai/[product]/index.astro',
  'src/pages/google/[product]/index.astro',
  'src/pages/microsoft/[product]/index.astro',
  // 3 canonical data files
  'src/data/comparisons.ts',
  'src/data/updates.ts',
  'src/data/toolRegistry.ts',
];

// ---------------------------------------------------------------------------
// Model classification. Hyphens canonicalised on lookup (e.g. `GPT-4o` and
// `gpt-4o` both match the `gpt-4o` entry).
// ---------------------------------------------------------------------------

// Denylist — a hit here = ⚠ FLAG (P1 — stale model citation).
// NOTE: gpt-4o / gpt-4o-mini are NOT listed here — both are still exposed in
// the official OpenAI SDK as current model IDs (and gpt-4o-audio-preview is
// the canonical OpenAI audio surface as of 2026-05). They're soft-deprecated
// in GitHub Copilot's recommendation list but still pay-per-token-valid via
// the OpenAI API. Move them to LEGACY when OpenAI's deprecation page lists
// them.
//
// gpt-4 IS legacy — OpenAI labels it "older" with a scheduled shutdown of
// 2026-10-23. It still appears in chat_model.py but the audit treats it as
// stale for citation purposes.
//
// Similarly, `gemini-3-pro-preview` is NOT listed here — Gemini CLI docs
// literally use that name as the preview-channel routing target. On the
// Gemini API side, the ID redirects to `gemini-3.1-pro-preview` since
// 2026-03-09, but both names remain valid.
const LEGACY_MODELS = new Set([
  // Claude — pre-Sonnet-4 generations
  'claude-3-5-sonnet',
  'claude-3.5-sonnet',
  'claude-3-5-haiku',
  'claude-3.5-haiku',
  'claude-3-7-sonnet',
  'claude-3.7-sonnet',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku',
  'claude-2',
  'claude-2.1',
  // OpenAI — true legacy (shutdown scheduled or no longer in current SDK)
  'gpt-4',          // scheduled shutdown 2026-10-23 per OpenAI deprecations
  'gpt-4-turbo',
  'gpt-4-32k',
  'gpt-3.5',
  'gpt-3.5-turbo',
  'gpt-3',
  // OpenAI legacy base models — canonical API-ID forms (Session 6 Fix 2).
  // Bare `curie` / `davinci` / `babbage` were removed from API_ID_RE to fix
  // the "Marie Curie" false-positive class. Real legacy citations now have
  // two canonical shapes, both detected:
  //   - text-/code-/chat-/codechat-NAME-### (e.g. text-davinci-003) — the
  //     historical Completions/Codex/PaLM naming convention.
  //   - NAME-### (e.g. davinci-002, babbage-002) — OpenAI's current Completions
  //     API still exposes davinci-002 and babbage-002 (per
  //     openai-python/completion_create_params.py at HEAD). These are caught
  //     by a separate `\b(?:davinci|babbage|curie|ada|cushman)-\d{3}\b` branch
  //     in API_ID_RE (Session 6 Pass-2 P1-TOOLING-01 fix). Pre-Session-6, bare
  //     `davinci` caught these by accident; Session 6 lost-then-regained that
  //     signal in a form that doesn't trip on Marie Curie / Charles Babbage /
  //     Leonardo da Vinci prose.
  'text-davinci-001',
  'text-davinci-002',
  'text-davinci-003',
  'text-curie-001',
  'text-babbage-001',
  'text-ada-001',
  'code-davinci-001',
  'code-davinci-002',
  'code-cushman-001',
  // Bare suffixed forms still on OpenAI's Completions API surface as of 2026-05
  'davinci-002',
  'babbage-002',
  // Google PaLM 2 / Bison family (legacy chat & text completion models).
  // Both the bare form (e.g. `text-bison` — the canonical Vertex AI retired
  // model ID per Google's model-versioning page) AND the `-001` hyphen-
  // suffix variant (sometimes appears in content copied from OpenAI's
  // naming convention) are listed (Session 7 C2.5 fix). NOTE: the real
  // Vertex AI versioned form uses `@001` (at-sign), e.g. `text-bison@001`;
  // that is caught via the bare `text-bison` LEGACY entry because `@` is a
  // \b word boundary so the match terminates at `text-bison` and classify()
  // direct-hits LEGACY. The prefixed branch in API_ID_RE matches Bison
  // without suffix because the `text-`/`chat-`/`code-`/`codechat-` prefix
  // already provides false-positive boundary protection — unlike Marie
  // Curie / Charles Babbage prose, no English/proper-noun usage of bison
  // appears as `text-bison` or `code-bison`. classify()'s suffix-strip
  // fallback does NOT cover bare bison forms (peels to `text` then `chat`,
  // neither listed) — so explicit bare entries are required.
  'text-bison-001',
  'chat-bison-001',
  'code-bison-001',
  'codechat-bison-001',
  'text-bison',
  'chat-bison',
  'code-bison',
  'codechat-bison',
  // Google — pre-Gemini-2.5
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-2-flash',
  'gemini-2-pro',
  'gemini-1-pro',
  // Misc family-root legacy (bare forms still in regex — distinctive enough)
  'palm',
  'palm-2',
]);

// Allowlist for noise suppression — silent when matched.
// `lastVerified: 2026-05-15`. Keep in sync with comparisons.ts current cells.
//
// Both the API-ID form (claude-sonnet-4-6) AND the bare-prose form (sonnet-4-6
// or sonnet-4.6) are listed because human prose often drops the vendor prefix
// ("Sonnet 4.6 hits the right cost/quality balance"). The canonicalise()
// helper produces a single form per match, so we list every variant the
// helper might produce.
//
// classify() also strips trailing -suffix segments and re-checks against this
// set — so `gpt-4o-audio-preview` matches `gpt-4o`, and `gpt-5.3-codex-spark`
// matches `gpt-5.3-codex`. That keeps the set tight without needing every
// suffixed variant listed.
const KNOWN_CURRENT_MODELS = new Set([
  // Anthropic — Sonnet/Opus/Haiku 4 generation (API-ID form)
  'claude-sonnet-4-5',
  'claude-sonnet-4-6',
  'claude-opus-4-5',
  'claude-opus-4-6',
  'claude-opus-4-7',
  'claude-opus-4-7-1m-internal',
  'claude-haiku-4-5',
  // Bare-prose forms (drop the `claude-` prefix)
  'sonnet-4-5', 'sonnet-4.5',
  'sonnet-4-6', 'sonnet-4.6',
  'opus-4-5', 'opus-4.5',
  'opus-4-6', 'opus-4.6',
  'opus-4-7', 'opus-4.7',
  'haiku-4-5', 'haiku-4.5',
  // OpenAI — GPT-5 generation (plus GPT-4o/4 still exposed in current SDK)
  'gpt-5',           // bare family ID — real model per OpenAI SDK
  'gpt-5.5',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.3-codex',
  'gpt-5.3-codex-spark',
  'gpt-5.2',
  'gpt-5.2-codex',
  'gpt-5-mini',
  'gpt-5-codex',
  'gpt-4.1',
  'gpt-4o',          // soft-deprecated but still in current SDK (audio surface anchor)
  'gpt-4o-mini',
  // Google — Gemini 2.5 + Gemini 3 / 3.1 (API-ID form)
  'gemini-3.1-pro',
  'gemini-3.1-pro-preview',
  'gemini-3-pro-preview',  // pre-redirect alias still used by Gemini CLI docs (2026-03-09 redirect → 3.1)
  'gemini-3.1-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  // Google open-weights — hyphenated canonical AND Ollama no-hyphen tag
  // forms. Same convention as the llama-3.2 / llama3.2 / qwen-2.5 / qwen2.5
  // pairs below (Ollama tag form `ollama pull gemma3:4b`). Added Session 7
  // after the regex broadening (`gemma-?\d+(?:\.\d+)?...`) made bare
  // `gemma3` / `gemma4` detectable. Session 8 added `gemma3n` / `gemma-3n`
  // (the selective-parameter-activation family at ollama.com/library/gemma3n
  // — canonical tags `gemma3n:e2b` and `gemma3n:e4b`, 2B/4B effective sizes
  // running on everyday devices). Detected via the tight n-suffix grouping
  // `gemma-?\d+(?:(?:\.\d+)|n)?` added to API_ID_RE — see Bison-style
  // alternation pattern from Session 7. Forward-looking entries for
  // unreleased qwen3 / llama3.3 / gemma5 / gemma4n are deliberately NOT
  // pre-listed — KNOWN_CURRENT means "verified current", not "plausible
  // future". They surface as INFO when first authored and get added in the
  // next freshness sweep.
  'gemma-4',
  'gemma4',
  'gemma-3',
  'gemma3',
  'gemma-3n',
  'gemma3n',
  // Local model examples used in Claw — hyphenated canonical AND Ollama
  // no-hyphen tag forms. Ollama tag convention is `<family><X.Y>` (no hyphen
  // between letters and digits), e.g. `ollama pull llama3.2:3b`. Listing the
  // tag form explicitly is the right call here vs adding a hyphen-stripping
  // variants() transform — simpler, smaller blast radius, easier to audit in
  // Pass-2 SME. Add new entries when new Ollama-tagged families land.
  //
  // Verified Session 7 (Pass-2 P2-TOOLING-02 closure) against TWO sources:
  //   1. ollama.com/library/<name> pages — Pass-1 source. Each shows
  //      `ollama run <name>` and `"model": "<name>"` in the canonical
  //      copy/paste block (no hyphen).
  //   2. ollama/ollama GitHub README at HEAD — Pass-2 second source. README
  //      uses `ollama run gemma3` and `model='gemma3'` directly in the
  //      "Chat with a model" Python/JS examples. Same no-hyphen convention.
  // Both sources agree on the no-hyphen tag form. Add new entries when new
  // families land, and verify both sources for the same convention.
  'llama-3.2',
  'llama3.2',
  'llama-3.1',
  'llama3.1',
  'llama-4',
  'llama4',
  'qwen-2.5',
  'qwen2.5',
]);

// Product/tool slugs that share the same prefix as model families but are
// product names, not model names. Skipped silently.
// NOTE: `gpt-5` / `gpt-4` are NOT here — both are real model IDs per OpenAI's
// official SDK. They live in KNOWN_CURRENT_MODELS instead so the audit
// recognises them as current. Bare `gpt` / `claude` / `gemini` are still
// product family roots and stay here.
const SKIP_PRODUCT_SLUGS = new Set([
  'claude-api',
  'claude-code',
  'claude.ai',
  'gemini-cli',
  'gemini-api',
  'gemini-app',
  'codex-cli',
  'apps-sdk',
  'agents-sdk',
  'custom-gpts',
  'chatgpt-atlas',
  'gpt-store',
  'gpt-builder',
  'gemini-3',
  'gemini-2',
  'gemini',
  'claude',
  'gpt',
  'llama',
]);

// ---------------------------------------------------------------------------
// Matchers. Two regexes so we can catch both API-ID forms (claude-sonnet-4-6,
// gpt-5.5, gemini-2.5-pro) and human prose (Claude Sonnet 4.6, GPT-5.5,
// Gemini 2.5 Pro Preview).
//
// Each API-ID branch ends in `(?:-[a-z0-9]+)*` so the regex greedy-matches
// the full hyphenated tail (gpt-4o-audio-preview, gpt-5.3-codex-spark,
// claude-sonnet-4-6-20250929). classify() then strips trailing segments
// when an exact match isn't found, so unknown suffixes fall back to the
// base name's classification.
// ---------------------------------------------------------------------------

// API-ID form. Case-insensitive. Boundary anchors on \b.
//
// Session 6 Fix 2: bare `davinci|curie|babbage|bison` removed from the
// no-prefix branch — they're common English words/proper-nouns ("Marie Curie",
// the animal `bison`) that triggered false positives. Real OpenAI/PaLM-2
// legacy references use either:
//   (a) the canonical text-/code-/chat-/codechat-NAME-### form (e.g.
//       text-davinci-003) — caught by the dedicated prefixed branch. The
//       prefix itself provides the false-positive boundary (no prose uses
//       `text-curie` for Marie Curie), so prefix-protected names can drop
//       the `-\d{3}` suffix where vendor convention permits.
//   (b) the bare NAME-### form (e.g. davinci-002, babbage-002) — still on
//       OpenAI's Completions API as of 2026-05; caught by a separate
//       suffixed-only branch added in Session 6 Pass-2. The `-\d{3}` suffix
//       requirement avoids the Marie-Curie/Charles-Babbage false-positive
//       class because those proper nouns don't have a numeric-3-digit tail.
//
// Session 7 Fix C2.5: Bison gets `(?:-\d{3})?` (optional suffix) inside the
// prefixed branch so bare `text-bison`/`chat-bison`/`code-bison` (Vertex AI
// shorthand) are caught. OpenAI/Codex roots (davinci/curie/babbage/ada/
// cushman) keep mandatory `-\d{3}` to avoid INFO noise on partial citations
// like `text-davinci` or `code-cushman` (incomplete strings that aren't
// real legacy IDs — per Session 7 rubber-duck #2).
//
// Session 8 Fix: gemma branch uses tight n-suffix grouping
// `gemma-?\d+(?:(?:\.\d+)|n)?` to detect the `gemma3n` family
// (Ollama selective-parameter-activation family at
// ollama.com/library/gemma3n) without opening the false-positive class
// that a broad `[a-z]*` tail would introduce. The alternation
// `(?:(?:\.\d+)|n)?` accepts either dotted-decimal version (gemma3.5)
// OR a single trailing `n` (gemma3n) — but NOT both stacked. For
// `gemma3.5n` specifically, the regex backtracks the optional alternation
// to empty after the `\b` check fails on `.5n`, and matches only `gemma3`
// (classify → KNOWN_CURRENT silent). Acceptable since `gemma3.5n` is not
// a real Gemma family form. Same backtrack pattern as HUMAN_RE Gemma
// branch. Mirrors Bison-style alternation pattern from Session 7.
const API_ID_RE = new RegExp(
  String.raw`\b(` +
    String.raw`claude-(?:sonnet|opus|haiku)-\d+(?:-\d+)+(?:-[a-z0-9]+)*` +
  String.raw`|claude-(?:3|2)(?:[\.-]\d+)?(?:-(?:sonnet|opus|haiku))?(?:-[a-z0-9]+)*` +
  String.raw`|gpt-\d+(?:\.\d+)?(?:-[a-z0-9]+)*` +
  String.raw`|gemini-\d+(?:\.\d+)?(?:-[a-z0-9]+)*` +
  String.raw`|gemma-?\d+(?:(?:\.\d+)|n)?(?:-[a-z0-9]+)*` +
  String.raw`|llama-?\d+(?:\.\d+)?(?:b)?` +
  String.raw`|qwen-?\d+(?:\.\d+)?(?:b)?` +
  String.raw`|(?:text|code|chat|codechat)-(?:(?:davinci|curie|babbage|ada|cushman)-\d{3}|bison(?:-\d{3})?)` +
  String.raw`|(?:davinci|curie|babbage|ada|cushman)-\d{3}` +
  String.raw`|palm(?:-2)?` +
  String.raw`)\b`,
  'gi',
);

// Human-prose form. Case-sensitive (Title Case for vendor families).
// Session 8 added `Gemma\s+\d+(?:(?:\.\d+)|n)?` to catch prose like
// "Gemma 4 enabled by default" (in src/data/updates.ts + comparisons.ts).
// Tight n-suffix grouping mirrors API_ID_RE gemma branch — for a stacked
// form like `Gemma 3.5n`, the regex backtracks: it tries `.5` first then
// fails the `\b` boundary (next char `n` is a word char), backtracks the
// optional alternation to empty, then matches only `Gemma 3` and lets the
// trailing `.5n` fall outside the match. classify() then treats the match
// as `gemma-3` → KNOWN_CURRENT (silent). Acceptable since `Gemma 3.5n` is
// not a real Gemma family form as of 2026-05; if Google releases such a
// variant, add it to KNOWN_CURRENT explicitly.
const HUMAN_RE = new RegExp(
  String.raw`\b(` +
    String.raw`Claude\s+(?:Sonnet|Opus|Haiku)\s+\d+(?:\.\d+)?` +
  String.raw`|Sonnet\s+\d+(?:\.\d+)?` +
  String.raw`|Opus\s+\d+(?:\.\d+)?` +
  String.raw`|Haiku\s+\d+(?:\.\d+)?` +
  String.raw`|GPT-?\d+(?:\.\d+)?(?:[oO])?(?:[\s-](?:mini|Codex|Turbo))?` +
  String.raw`|Gemini\s+\d+(?:\.\d+)?\s+(?:Pro|Flash|Flash-Lite)(?:\s+Preview)?` +
  String.raw`|Gemini\s+\d+\.\d+\s+(?:Pro|Flash)` +
  String.raw`|Gemma\s+\d+(?:(?:\.\d+)|n)?` +
  String.raw`|PaLM(?:\s*2)?` +
  String.raw`)\b`,
  'g',
);

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

// Canonicalise a matched token for lookup against the sets above.
// Examples: `Claude Sonnet 4.6` → `claude-sonnet-4-6`; `GPT-4o` → `gpt-4o`;
// `Gemini 2.5 Pro` → `gemini-2.5-pro`.
function canonicalise(token) {
  return token
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  // Note: dotted-number preservation (5.5, 2.5, 4.6) requires no transform —
  // the only earlier replace converts whitespace to `-`, never touches `.`.
}

// Convert dotted name to dashed name (and vice versa) so the SET lookups
// match both `gpt-5.5` and `gpt-5-5`, `claude-sonnet-4-6` and `claude-sonnet-4.6`.
function variants(canonical) {
  const v = new Set([canonical]);
  v.add(canonical.replace(/\./g, '-'));
  v.add(canonical.replace(/-(\d)/g, (_, d) => `.${d}`));
  // For claude-sonnet-4-6 also try claude-sonnet-4.6
  v.add(canonical.replace(/-(\d)-(\d)$/, '-$1.$2'));
  return v;
}

function classify(token) {
  const canon = canonicalise(token);

  // Try the full token first, then iteratively strip trailing -suffix
  // segments and re-check. This handles `gpt-4o-audio-preview` → `gpt-4o`,
  // `gpt-5.3-codex-spark` → `gpt-5.3-codex` → `gpt-5.3`, and
  // `claude-sonnet-4-6-20250929` → `claude-sonnet-4-6`. The matching set's
  // explicit listing wins at any level; unknown tails default to base.
  const tryLookup = (name) => {
    const candidates = variants(name);
    for (const c of candidates) {
      if (SKIP_PRODUCT_SLUGS.has(c)) return 'skip';
    }
    for (const c of candidates) {
      if (LEGACY_MODELS.has(c)) return 'legacy';
    }
    for (const c of candidates) {
      if (KNOWN_CURRENT_MODELS.has(c)) return 'current';
    }
    return null;
  };

  // Full-token lookup
  let result = tryLookup(canon);
  if (result) return result;

  // Suffix-strip fallback — peel one trailing segment at a time
  let parts = canon.split('-');
  while (parts.length > 1) {
    parts = parts.slice(0, -1);
    const base = parts.join('-');
    result = tryLookup(base);
    if (result) return result;
  }

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function findAll(src, re) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push({ index: m.index, token: m[0], length: m[0].length });
  }
  return out;
}

function lineOf(src, idx) {
  const before = src.slice(0, idx);
  const lineNo = before.split('\n').length;
  const lineStart = src.lastIndexOf('\n', idx) + 1;
  const lineEnd = src.indexOf('\n', idx);
  const line = src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd).trim();
  return { lineNo, line };
}

// ---------------------------------------------------------------------------
// Sidecar suppression — audit-blurbs.ignore.json at repo root.
// See header comment for full schema. Missing file = empty suppressions.
// Malformed JSON or invalid entry = hard fail (exit 1).
// ---------------------------------------------------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function loadSidecar() {
  const sidecarPath = path.join(ROOT, SIDECAR_FILENAME);
  let raw;
  try {
    raw = await fs.readFile(sidecarPath, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return []; // missing file = no suppressions
    console.error(`audit-blurbs: could not read ${SIDECAR_FILENAME}: ${e.message}`);
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error(`audit-blurbs: ${SIDECAR_FILENAME} is not valid JSON: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(parsed)) {
    console.error(`audit-blurbs: ${SIDECAR_FILENAME} must be a JSON array at the top level`);
    process.exit(1);
  }
  const REQUIRED = ['file', 'line', 'token', 'context', 'reason', 'added'];
  const out = [];
  parsed.forEach((entry, i) => {
    const ctx = `${SIDECAR_FILENAME}[${i}]`;
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      console.error(`audit-blurbs: ${ctx} must be an object`);
      process.exit(1);
    }
    for (const k of REQUIRED) {
      if (!(k in entry)) {
        console.error(`audit-blurbs: ${ctx} missing required field "${k}"`);
        process.exit(1);
      }
    }
    if (typeof entry.file !== 'string' || !entry.file) {
      console.error(`audit-blurbs: ${ctx}.file must be a non-empty string`);
      process.exit(1);
    }
    if (entry.file.includes('\\')) {
      console.error(`audit-blurbs: ${ctx}.file must use forward slashes (got "${entry.file}")`);
      process.exit(1);
    }
    if (!Number.isInteger(entry.line) || entry.line < 1) {
      console.error(`audit-blurbs: ${ctx}.line must be a positive integer`);
      process.exit(1);
    }
    if (typeof entry.token !== 'string' || !entry.token) {
      console.error(`audit-blurbs: ${ctx}.token must be a non-empty string`);
      process.exit(1);
    }
    if (typeof entry.context !== 'string' || !entry.context) {
      console.error(`audit-blurbs: ${ctx}.context must be a non-empty string (line text guard)`);
      process.exit(1);
    }
    if (typeof entry.reason !== 'string' || !entry.reason) {
      console.error(`audit-blurbs: ${ctx}.reason must be a non-empty string`);
      process.exit(1);
    }
    if (!ISO_DATE_RE.test(entry.added) || isNaN(Date.parse(entry.added))) {
      console.error(`audit-blurbs: ${ctx}.added must be ISO date YYYY-MM-DD (got "${entry.added}")`);
      process.exit(1);
    }
    if (entry.reviewAfter !== undefined) {
      if (!ISO_DATE_RE.test(entry.reviewAfter) || isNaN(Date.parse(entry.reviewAfter))) {
        console.error(`audit-blurbs: ${ctx}.reviewAfter must be ISO date YYYY-MM-DD (got "${entry.reviewAfter}")`);
        process.exit(1);
      }
    }
    // Default reviewAfter = added + 365 days
    const reviewAfter = entry.reviewAfter
      || new Date(new Date(entry.added).getTime() + SIDECAR_DEFAULT_REVIEW_DAYS * 86400_000)
          .toISOString().slice(0, 10);
    out.push({
      file: entry.file,
      line: entry.line,
      token: entry.token,
      tokenLower: entry.token.toLowerCase(),
      context: entry.context,
      reason: entry.reason,
      added: entry.added,
      reviewAfter,
      hit: false, // set true when this entry suppresses at least one hit
    });
  });
  return out;
}

function sidecarSuppresses(sidecar, fileRel, token, lineText) {
  const tokenLower = token.toLowerCase();
  for (const e of sidecar) {
    if (e.file === fileRel && e.tokenLower === tokenLower && lineText.includes(e.context)) {
      e.hit = true;
      return true;
    }
  }
  return false;
}

const sidecar = await loadSidecar();

// Walk src/content/**/*.mdx for the optional content-scope scan (Session 6).
async function walkContent() {
  const root = path.join(ROOT, 'src', 'content');
  const out = [];
  async function recur(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await recur(full);
      else if (full.endsWith('.mdx')) out.push(full);
    }
  }
  await recur(root);
  return out.map(f => path.relative(ROOT, f).replaceAll('\\', '/'));
}

// Cache content paths once when --scope=content is active (Session 7 P2-TOOLING-04).
// Previously walkContent() ran twice — once for the scan loop, once for the
// sidecar in-scope diagnostics. Compute here, reuse below.
const contentPaths = INCLUDE_CONTENT ? await walkContent() : [];

const legacyHits = [];
const infoHits = [];
const contentLegacyHits = [];
const contentInfoHits = [];
let scannedFiles = 0;
let scannedContentFiles = 0;

// Process a single file path against the regex/classify pipeline. Pushes hits
// into the appropriate target arrays. Shared by both default and content
// scans so the suppression + classification logic stays identical.
async function scanFile(rel, targetLegacy, targetInfo) {
  const full = path.join(ROOT, rel);
  let src;
  try {
    src = await fs.readFile(full, 'utf8');
  } catch (e) {
    console.error(`audit-blurbs: could not read ${rel}: ${e.message}`);
    return false;
  }

  const hits = [
    ...findAll(src, API_ID_RE),
    ...findAll(src, HUMAN_RE),
  ];
  const seen = new Set();

  for (const h of hits) {
    const key = `${h.index}:${h.token.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const cls = classify(h.token);
    if (cls === 'skip' || cls === 'current') continue;

    const { lineNo, line } = lineOf(src, h.index);
    // Inline opt-out (Session 4) — same-line `audit-blurbs:ignore` annotation.
    // Use for .astro / .ts comment contexts where the annotation doesn't leak
    // into rendered output.
    if (/audit-blurbs:ignore/.test(line)) continue;
    // Sidecar opt-out (Session 6) — audit-blurbs.ignore.json with context
    // substring guard. Use for .mdx prose where inline annotation would render.
    if (sidecarSuppresses(sidecar, rel.replaceAll('\\', '/'), h.token, line)) continue;

    const finding = {
      file: rel.replaceAll('\\', '/'),
      line: lineNo,
      token: h.token,
      canonical: canonicalise(h.token),
      context: line.slice(0, 140) + (line.length > 140 ? '…' : ''),
    };
    if (cls === 'legacy') targetLegacy.push(finding);
    else targetInfo.push(finding);
  }
  return true;
}

for (const rel of SCAN_PATHS) {
  if (await scanFile(rel, legacyHits, infoHits)) scannedFiles++;
}

if (INCLUDE_CONTENT) {
  for (const rel of contentPaths) {
    if (await scanFile(rel, contentLegacyHits, contentInfoHits)) scannedContentFiles++;
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

console.log(`audit-blurbs: scanned ${scannedFiles}/${SCAN_PATHS.length} files (default scope — strict-gate surface)`);
if (INCLUDE_CONTENT) {
  console.log(`audit-blurbs: scanned ${scannedContentFiles} files under src/content/ (--scope=content — advisory)`);
}
console.log(`audit-blurbs: lists lastVerified ${LAST_VERIFIED}`);
if (sidecar.length > 0) {
  // Compute the actual scanned-file set so we only flag "unused" entries
  // when their target file was actually in scope this run. Entries that
  // target unscanned files (e.g. src/content/ entries during a default-scope
  // run) are correctly NOT flagged — they're inactive-by-design, not stale.
  const scannedSet = new Set(SCAN_PATHS.map(p => p.replaceAll('\\', '/')));
  if (INCLUDE_CONTENT) {
    for (const p of contentPaths) scannedSet.add(p);
  }
  const inScope = sidecar.filter(e => scannedSet.has(e.file));
  const used = sidecar.filter(e => e.hit).length;
  const unusedInScope = inScope.filter(e => !e.hit);
  console.log(`audit-blurbs: ${SIDECAR_FILENAME} — ${sidecar.length} entries (${used} matched this run; ${inScope.length} in scope)`);
  // Only entries whose target file IS scanned this run can be meaningfully
  // "stale" — if no hit fires, the suppressed text may have moved/changed.
  if (unusedInScope.length > 0) {
    console.log(`ℹ audit-blurbs: ${unusedInScope.length} sidecar ${unusedInScope.length === 1 ? 'entry' : 'entries'} did not suppress any hit this run (entry may be stale — verify the line still needs suppression)`);
    for (const e of unusedInScope) {
      console.log(`  ${e.file}:${e.line}  "${e.token}"  context="${e.context}"  added=${e.added}`);
    }
  }
  // reviewAfter staleness — applies to ALL entries regardless of scope.
  const today = new Date().toISOString().slice(0, 10);
  const stale = sidecar.filter(e => e.reviewAfter < today);
  if (stale.length > 0) {
    console.log(`⚠ audit-blurbs: ${stale.length} sidecar ${stale.length === 1 ? 'entry' : 'entries'} past reviewAfter — verify still legitimate suppression:`);
    for (const e of stale) {
      console.log(`  ${e.file}:${e.line}  "${e.token}"  reviewAfter=${e.reviewAfter}  reason="${e.reason}"`);
    }
  }
}

// Staleness self-warning — the lists below ARE the freshness contract; if
// they're not refreshed within 90 days, prompt a re-sweep.
const ageDays = Math.floor(
  (Date.now() - new Date(LAST_VERIFIED).getTime()) / (1000 * 60 * 60 * 24),
);
if (ageDays > STALENESS_WARN_DAYS) {
  console.log(
    `⚠ audit-blurbs: CURRENT/LEGACY lists are ${ageDays} days old (> ${STALENESS_WARN_DAYS}) — re-sweep against comparisons.ts`,
  );
}
console.log('');

if (
  legacyHits.length === 0 && infoHits.length === 0 &&
  contentLegacyHits.length === 0 && contentInfoHits.length === 0
) {
  console.log('audit-blurbs: no legacy model citations, no unknown model names. ✓');
  process.exit(0);
}

if (legacyHits.length > 0) {
  console.log(`⚠ audit-blurbs: ${legacyHits.length} LEGACY model citation${legacyHits.length === 1 ? '' : 's'} (stale — replace with current generation) [default scope — STRICT]`);
  for (const h of legacyHits) {
    console.log(`  ${h.file}:${h.line}  "${h.token}" (→ ${h.canonical})`);
    console.log(`    → ${h.context}`);
  }
  console.log('');
}

if (infoHits.length > 0) {
  console.log(`ℹ audit-blurbs: ${infoHits.length} unknown model name${infoHits.length === 1 ? '' : 's'} (advisory — verify each is current; add to KNOWN_CURRENT_MODELS or LEGACY_MODELS) [default scope]`);
  for (const h of infoHits) {
    console.log(`  ${h.file}:${h.line}  "${h.token}" (→ ${h.canonical})`);
    console.log(`    → ${h.context}`);
  }
  console.log('');
}

if (contentLegacyHits.length > 0) {
  console.log(`⚠ audit-blurbs: ${contentLegacyHits.length} LEGACY citation${contentLegacyHits.length === 1 ? '' : 's'} in src/content/ [content scope — ADVISORY, never blocks]`);
  for (const h of contentLegacyHits) {
    console.log(`  ${h.file}:${h.line}  "${h.token}" (→ ${h.canonical})`);
    console.log(`    → ${h.context}`);
  }
  console.log('');
}

if (contentInfoHits.length > 0) {
  console.log(`ℹ audit-blurbs: ${contentInfoHits.length} unknown model name${contentInfoHits.length === 1 ? '' : 's'} in src/content/ [content scope — ADVISORY]`);
  for (const h of contentInfoHits) {
    console.log(`  ${h.file}:${h.line}  "${h.token}" (→ ${h.canonical})`);
    console.log(`    → ${h.context}`);
  }
  console.log('');
}

if (MODE === 'strict' && legacyHits.length > 0) {
  // Content-scope LEGACY hits NEVER block (per Session 6 design — content scope
  // is advisory-only). Only default-scope legacyHits trigger strict exit.
  console.log('(re-run without --strict to make this advisory only)');
  console.log('(use audit-blurbs:ignore inline or audit-blurbs.ignore.json sidecar to suppress intentional legacy mentions)');
  process.exit(1);
} else {
  console.log('(advisory — run with --strict in CI to block on LEGACY hits in the default scope)');
  process.exit(0);
}
