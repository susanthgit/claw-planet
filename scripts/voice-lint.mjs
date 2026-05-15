#!/usr/bin/env node
/**
 * voice-lint.mjs — Sush voice guardrail + scope guardrail + source citation gate.
 *
 * Scans public-facing content (.astro, .mdx, .md, plus .ts data files) for
 * forbidden marketing words, forbidden OUT-list signals (multi-vendor
 * expansion v0b), and enforces a Microsoft public-source-citation rule on
 * entries tagged `vendor: "microsoft"`.
 *
 * Forbidden list sources: ~/.copilot/plain-ai-voice-guardrail.md and the
 * Claw Planet playbook (voice guardrails section + scope guardrails section).
 *
 * Modes:
 *   --warn (default) — exit 0 always; print findings; advisory
 *   --strict          — exit 1 if any finding in PUBLIC content
 *
 * What's NOT scanned:
 *   - Files in scripts/, docs/, .github/, node_modules/, dist/, .astro/
 *   - This file itself (it lists the forbidden words; would self-trigger)
 *
 * .ts scope (set 2026-05-15, Claw v0b · Phase 1.1 Session 4 · Track D.2):
 *   - src/data/*.ts files are public-facing (comparisons.ts feeds /compare/
 *     matrices, updates.ts feeds /updates/ + RSS, toolRegistry.ts feeds tool
 *     labels). Voice rules apply equally to those strings. Word-boundary
 *     regex already handles CamelCase identifiers like robustChecker (no
 *     \b match). For false positives in comments or test fixtures, use the
 *     `voice-lint:ignore` annotation on the same line.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// SCAN_DIRS is now a list of { dir, exts } so each directory can target a
// specific file-extension set. `.ts` is only walked in `src/data/` to avoid
// false positives from build-script-style files elsewhere.
const SCAN_DIRS = [
  { dir: path.join(ROOT, 'src', 'pages'),      exts: ['.astro', '.mdx', '.md'] },
  { dir: path.join(ROOT, 'src', 'components'), exts: ['.astro', '.mdx', '.md'] },
  { dir: path.join(ROOT, 'src', 'layouts'),    exts: ['.astro', '.mdx', '.md'] },
  { dir: path.join(ROOT, 'src', 'content'),    exts: ['.astro', '.mdx', '.md'] },
  { dir: path.join(ROOT, 'src', 'data'),       exts: ['.ts'] },
];

// Marketing voice — original list (always enforced).
const FORBIDDEN = [
  'frontier', 'ecosystem', 'multimodal', 'agentic capability',
  'in layman', 'AI-powered', 'robust', 'scalable',
  'holistic', 'synergies', 'game changer', 'mission-critical',
  'moat', 'differentiator', 'SEO magnet', 'flagship',
];

// Scope OUT-list signals — phrases that suggest a page is drifting into
// out-of-scope topics (prompt engineering, benchmarks, ethics commentary,
// general AI explainers, vendor PR, news/punditry). These trigger advisory
// flags so a reviewer can decide whether the page truly fits Claw's scope.
const OUT_OF_SCOPE_PHRASES = [
  '10 best prompts',
  'top prompts for',
  'best prompt for',
  'prompt engineering tips',
  'beats GPT', 'beats Claude', 'beats Gemini',
  'AI revolution',
  'will replace developers',
  'death of',
  'beginner\'s guide to AI',
  'what is artificial intelligence',
];

// Microsoft public-source domains — vendor:"microsoft" entries must cite
// at least one URL matching one of these. Prevents customer-detail leakage
// and enforces the public-sources-only rule from the Claw playbook.
// GitHub is a Microsoft subsidiary; docs.github.com + github.com/features
// are valid public-Microsoft sources for GitHub Copilot content (Batch D).
const MS_PUBLIC_DOMAINS = [
  'learn.microsoft.com',
  'github.com/microsoft',
  'github.com/microsoftgraph',
  'github.com/OfficeDev',
  'github.com/features/copilot',
  'docs.github.com/copilot',
  'docs.github.com/en/copilot',
  'devblogs.microsoft.com',
  'techcommunity.microsoft.com',
  'azure.microsoft.com',
  'microsoft.com/en-',  // microsoft.com regional pages
  'docs.microsoft.com', // legacy redirect target
  'github.blog',         // github.blog (incl. /category/ai-and-ml/) — public GitHub announcements
];

const MODE = process.argv.includes('--strict') ? 'strict' : 'warn';

async function walk(dir, exts) {
  let out = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) out = out.concat(await walk(full, exts));
      else if (exts.some(ext => full.endsWith(ext))) out.push(full);
    }
  } catch { /* skip */ }
  return out;
}

function getFrontmatterValue(src, key) {
  // Reads a YAML scalar from frontmatter — best-effort, no YAML parser dep.
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = m[1];
  const line = fm.split(/\r?\n/).find(l => new RegExp(`^\\s*${key}\\s*:`).test(l));
  if (!line) return null;
  const val = line.replace(new RegExp(`^\\s*${key}\\s*:\\s*`), '').trim();
  return val.replace(/^["']|["']$/g, '');
}

function extractSources(src) {
  // Parse the `sources:` YAML block — assumes single-line URL entries.
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return [];
  const fm = m[1];
  const lines = fm.split(/\r?\n/);
  const out = [];
  let inSources = false;
  for (const line of lines) {
    if (/^\s*sources\s*:/.test(line)) { inSources = true; continue; }
    if (inSources) {
      const item = line.match(/^\s*-\s+["']?(https?:\/\/[^\s"']+)["']?/);
      if (item) { out.push(item[1]); continue; }
      // exit on next top-level key
      if (/^\w/.test(line)) inSources = false;
    }
  }
  return out;
}

const findings = [];
const microsoftViolations = [];
for (const { dir, exts } of SCAN_DIRS) {
  const files = await walk(dir, exts);
  for (const f of files) {
    const src = await fs.readFile(f, 'utf8');
    const rel = path.relative(ROOT, f).replaceAll('\\', '/');

    // 1. Forbidden marketing words
    for (const word of FORBIDDEN) {
      const re = new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
      let m;
      while ((m = re.exec(src)) !== null) {
        const lineStart = src.lastIndexOf('\n', m.index) + 1;
        const lineEnd = src.indexOf('\n', m.index);
        const lineNo = src.slice(0, m.index).split('\n').length;
        const line = src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd).trim();
        // Skip CSS/JS variable names like --frontier-color
        if (/--[a-z-]*$/.test(line.slice(0, m.index - lineStart)) && /^[a-z-]+:/.test(line)) continue;
        // Skip lines explicitly annotated for voice-lint to ignore (used in
        // documentation pages that need to LIST the forbidden words verbatim).
        if (/voice-lint:ignore/.test(line)) continue;
        findings.push({ file: rel, line: lineNo, kind: 'forbidden', word: word.toLowerCase(), context: line });
      }
    }

    // 2. OUT-of-scope phrase signals (advisory — flags reviewer attention)
    for (const phrase of OUT_OF_SCOPE_PHRASES) {
      const re = new RegExp(phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      let m;
      while ((m = re.exec(src)) !== null) {
        const lineNo = src.slice(0, m.index).split('\n').length;
        const lineStart = src.lastIndexOf('\n', m.index) + 1;
        const lineEnd = src.indexOf('\n', m.index);
        const line = src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd).trim();
        findings.push({ file: rel, line: lineNo, kind: 'out-of-scope', word: phrase, context: line });
      }
    }

    // 3. Microsoft public-source-citation rule — only for content/*.mdx files
    //    that declare vendor: "microsoft" in frontmatter.
    if (f.includes(path.sep + 'content' + path.sep) && (f.endsWith('.mdx') || f.endsWith('.md'))) {
      const vendor = getFrontmatterValue(src, 'vendor');
      if (vendor === 'microsoft') {
        const sources = extractSources(src);
        const hasPublic = sources.some(url => MS_PUBLIC_DOMAINS.some(d => url.includes(d)));
        if (!hasPublic) {
          microsoftViolations.push({
            file: rel,
            sources: sources.length === 0 ? '(none)' : sources.join(', '),
            reason: 'vendor:"microsoft" entry must cite at least one public Microsoft source (learn.microsoft.com, github.com/microsoft, azure.microsoft.com, devblogs.microsoft.com, etc.)',
          });
        }
      }
    }
  }
}

let hasBlockingFinding = false;
if (findings.length === 0 && microsoftViolations.length === 0) {
  console.log('voice-lint: no forbidden words, no out-of-scope signals, no Microsoft source violations. ✓');
  process.exit(0);
}

if (findings.length > 0) {
  const forbiddenFindings = findings.filter(f => f.kind === 'forbidden');
  const outOfScopeFindings = findings.filter(f => f.kind === 'out-of-scope');

  if (forbiddenFindings.length > 0) {
    console.log(`voice-lint: ${forbiddenFindings.length} forbidden-word occurrence${forbiddenFindings.length === 1 ? '' : 's'}`);
    for (const f of forbiddenFindings) {
      console.log(`  ${f.file}:${f.line}  "${f.word}"  → ${f.context.slice(0, 120)}${f.context.length > 120 ? '…' : ''}`);
    }
    console.log('');
    hasBlockingFinding = true;
  }

  if (outOfScopeFindings.length > 0) {
    console.log(`voice-lint: ${outOfScopeFindings.length} out-of-scope phrase signal${outOfScopeFindings.length === 1 ? '' : 's'} (advisory — review whether the page fits Claw scope)`);
    for (const f of outOfScopeFindings) {
      console.log(`  ${f.file}:${f.line}  "${f.word}"  → ${f.context.slice(0, 120)}${f.context.length > 120 ? '…' : ''}`);
    }
    console.log('');
  }
}

if (microsoftViolations.length > 0) {
  console.log(`voice-lint: ${microsoftViolations.length} Microsoft vendor entries missing public source citation`);
  for (const v of microsoftViolations) {
    console.log(`  ${v.file}`);
    console.log(`    sources: ${v.sources}`);
    console.log(`    reason: ${v.reason}`);
  }
  console.log('');
  hasBlockingFinding = true;
}

if (MODE === 'strict' && hasBlockingFinding) {
  console.log(`forbidden words: ${FORBIDDEN.join(', ')}`);
  console.log(`Microsoft public domains required: ${MS_PUBLIC_DOMAINS.join(', ')}`);
  console.log(`(re-run without --strict to make this advisory only)`);
  process.exit(1);
} else {
  console.log('(advisory — run with --strict in CI to block on findings)');
  process.exit(0);
}

