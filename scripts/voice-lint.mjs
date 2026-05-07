#!/usr/bin/env node
/**
 * voice-lint.mjs — Sush voice guardrail.
 *
 * Scans public-facing content (.astro, .mdx) for forbidden marketing words.
 * Forbidden list source: ~/.copilot/plain-ai-voice-guardrail.md and the
 * Claw Planet playbook (voice guardrails section).
 *
 * Modes:
 *   --warn (default) — exit 0 always; print findings; advisory
 *   --strict          — exit 1 if any finding in PUBLIC content
 *
 * What's NOT scanned:
 *   - Files in scripts/, docs/, .github/, node_modules/, dist/, .astro/
 *   - This file itself (it lists the forbidden words; would self-trigger)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = [
  path.join(ROOT, 'src', 'pages'),
  path.join(ROOT, 'src', 'components'),
  path.join(ROOT, 'src', 'layouts'),
  path.join(ROOT, 'src', 'content'),
];

const FORBIDDEN = [
  'frontier', 'ecosystem', 'multimodal', 'agentic capability',
  'in layman', 'AI-powered', 'robust', 'scalable',
  'holistic', 'synergies', 'game changer', 'mission-critical',
  'moat', 'differentiator', 'SEO magnet', 'flagship',
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

const findings = [];
for (const dir of SCAN_DIRS) {
  const files = await walk(dir, ['.astro', '.mdx', '.md']);
  for (const f of files) {
    const src = await fs.readFile(f, 'utf8');
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
        findings.push({
          file: path.relative(ROOT, f).replaceAll('\\', '/'),
          line: lineNo,
          word: word.toLowerCase(),
          context: line,
        });
      }
    }
  }
}

if (findings.length === 0) {
  console.log('voice-lint: no forbidden words in public content. ✓');
  process.exit(0);
}

console.log(`voice-lint: ${findings.length} forbidden-word occurrence${findings.length === 1 ? '' : 's'} in public content`);
console.log('');
for (const f of findings) {
  console.log(`  ${f.file}:${f.line}  "${f.word}"  → ${f.context.slice(0, 120)}${f.context.length > 120 ? '…' : ''}`);
}
console.log('');
if (MODE === 'strict') {
  console.log(`forbidden list: ${FORBIDDEN.join(', ')}`);
  console.log(`(re-run without --strict to make this advisory only)`);
  process.exit(1);
} else {
  console.log('(advisory — run with --strict in CI to block on findings)');
  process.exit(0);
}
