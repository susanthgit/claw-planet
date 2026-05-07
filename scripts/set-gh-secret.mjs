#!/usr/bin/env node
/**
 * set-gh-secret.mjs — Set a GitHub Actions repo secret.
 *
 * Uses `gh secret set` (GitHub CLI) which handles libsodium encryption
 * natively. Avoids the broken libsodium-wrappers@0.7.16 ESM dist.
 *
 * Usage: node set-gh-secret.mjs SECRET_NAME SECRET_VALUE
 * Required env: GH_OWNER (default: susanthgit), GH_REPO (default: claw-planet)
 */

import { spawnSync } from 'node:child_process';

const [, , name, value] = process.argv;
if (!name || !value) {
  console.error('Usage: set-gh-secret.mjs NAME VALUE');
  process.exit(1);
}

const OWNER = process.env.GH_OWNER || 'susanthgit';
const REPO = process.env.GH_REPO || 'claw-planet';

const r = spawnSync('gh', ['secret', 'set', name, '--repo', `${OWNER}/${REPO}`], {
  input: value,
  encoding: 'utf8',
});

if (r.status !== 0) {
  console.error(`Failed to set secret ${name}:`);
  if (r.stderr) console.error(r.stderr);
  if (r.error) console.error(r.error.message);
  process.exit(r.status ?? 1);
}

console.log(`✅ Secret ${name} set on ${OWNER}/${REPO}`);