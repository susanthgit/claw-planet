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
 * Maintenance (set 2026-05-15):
 *   When a new model generation lands, add the canonical name(s) to
 *   KNOWN_CURRENT_MODELS and the now-superseded one(s) to LEGACY_MODELS.
 *   Bump the `lastVerified` constant. INFO hits become the queue for the
 *   next freshness sweep.
 *
 * Set 2026-05-15 (Claw v0b · Phase 1.1 Session 4 · Track D.1).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODE = process.argv.includes('--strict') ? 'strict' : 'warn';

// Bump when refreshing the lists below. Audit-blurbs warns if you run it more
// than 90 days after this date — that's the prompt to re-sweep current models.
const LAST_VERIFIED = '2026-05-15';
const STALENESS_WARN_DAYS = 90;

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
  // Google — pre-Gemini-2.5
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-2-flash',
  'gemini-2-pro',
  'gemini-1-pro',
  // Misc legacy
  'palm',
  'palm-2',
  'bison',
  'davinci',
  'curie',
  'babbage',
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
  // Google open-weights
  'gemma-4',
  'gemma-3',
  // Local model examples used in Claw
  'llama-3.2',
  'llama-3.1',
  'llama-4',
  'qwen-2.5',
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
const API_ID_RE = new RegExp(
  String.raw`\b(` +
    String.raw`claude-(?:sonnet|opus|haiku)-\d+(?:-\d+)+(?:-[a-z0-9]+)*` +
  String.raw`|claude-(?:3|2)(?:[\.-]\d+)?(?:-(?:sonnet|opus|haiku))?(?:-[a-z0-9]+)*` +
  String.raw`|gpt-\d+(?:\.\d+)?(?:-[a-z0-9]+)*` +
  String.raw`|gemini-\d+(?:\.\d+)?(?:-[a-z0-9]+)*` +
  String.raw`|gemma-\d+(?:-[a-z0-9]+)*` +
  String.raw`|llama-?\d+(?:\.\d+)?(?:b)?` +
  String.raw`|qwen-?\d+(?:\.\d+)?(?:b)?` +
  String.raw`|palm(?:-2)?|davinci|curie|babbage|bison` +
  String.raw`)\b`,
  'gi',
);

// Human-prose form. Case-sensitive (Title Case for vendor families).
const HUMAN_RE = new RegExp(
  String.raw`\b(` +
    String.raw`Claude\s+(?:Sonnet|Opus|Haiku)\s+\d+(?:\.\d+)?` +
  String.raw`|Sonnet\s+\d+(?:\.\d+)?` +
  String.raw`|Opus\s+\d+(?:\.\d+)?` +
  String.raw`|Haiku\s+\d+(?:\.\d+)?` +
  String.raw`|GPT-?\d+(?:\.\d+)?(?:[oO])?(?:[\s-](?:mini|Codex|Turbo))?` +
  String.raw`|Gemini\s+\d+(?:\.\d+)?\s+(?:Pro|Flash|Flash-Lite)(?:\s+Preview)?` +
  String.raw`|Gemini\s+\d+\.\d+\s+(?:Pro|Flash)` +
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
    .replace(/\s+/g, '-')
    .replace(/\.(\d)/g, '.$1');  // preserve dotted numbers (5.5, 2.5)
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

const legacyHits = [];
const infoHits = [];
let scannedFiles = 0;

for (const rel of SCAN_PATHS) {
  const full = path.join(ROOT, rel);
  let src;
  try {
    src = await fs.readFile(full, 'utf8');
  } catch (e) {
    console.error(`audit-blurbs: could not read ${rel}: ${e.message}`);
    continue;
  }
  scannedFiles++;

  const hits = [
    ...findAll(src, API_ID_RE),
    ...findAll(src, HUMAN_RE),
  ];

  // Per-file de-duplication: if the same token at the same index is matched
  // by both regexes, only report once. (Rare but possible.)
  const seen = new Set();

  for (const h of hits) {
    const key = `${h.index}:${h.token.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const cls = classify(h.token);
    if (cls === 'skip' || cls === 'current') continue;

    const { lineNo, line } = lineOf(src, h.index);
    // Allow inline opt-out for known-intentional legacy mentions (e.g. when
    // explaining what's been deprecated). Same pattern as voice-lint.
    if (/audit-blurbs:ignore/.test(line)) continue;

    const finding = {
      file: rel.replaceAll('\\', '/'),
      line: lineNo,
      token: h.token,
      canonical: canonicalise(h.token),
      context: line.slice(0, 140) + (line.length > 140 ? '…' : ''),
    };
    if (cls === 'legacy') legacyHits.push(finding);
    else infoHits.push(finding);
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

console.log(`audit-blurbs: scanned ${scannedFiles}/${SCAN_PATHS.length} files`);
console.log(`audit-blurbs: lists lastVerified ${LAST_VERIFIED}`);

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

if (legacyHits.length === 0 && infoHits.length === 0) {
  console.log('audit-blurbs: no legacy model citations, no unknown model names. ✓');
  process.exit(0);
}

if (legacyHits.length > 0) {
  console.log(`⚠ audit-blurbs: ${legacyHits.length} LEGACY model citation${legacyHits.length === 1 ? '' : 's'} (stale — replace with current generation)`);
  for (const h of legacyHits) {
    console.log(`  ${h.file}:${h.line}  "${h.token}" (→ ${h.canonical})`);
    console.log(`    → ${h.context}`);
  }
  console.log('');
}

if (infoHits.length > 0) {
  console.log(`ℹ audit-blurbs: ${infoHits.length} unknown model name${infoHits.length === 1 ? '' : 's'} (advisory — verify each is current; add to KNOWN_CURRENT_MODELS or LEGACY_MODELS)`);
  for (const h of infoHits) {
    console.log(`  ${h.file}:${h.line}  "${h.token}" (→ ${h.canonical})`);
    console.log(`    → ${h.context}`);
  }
  console.log('');
}

if (MODE === 'strict' && legacyHits.length > 0) {
  console.log('(re-run without --strict to make this advisory only)');
  console.log('(use audit-blurbs:ignore on a line to suppress intentional legacy mentions)');
  process.exit(1);
} else {
  console.log('(advisory — run with --strict in CI to block on LEGACY hits)');
  process.exit(0);
}
