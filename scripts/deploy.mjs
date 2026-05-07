#!/usr/bin/env node
/**
 * deploy.mjs — Direct Cloudflare Pages deployment via REST API.
 * Bypasses wrangler (broken on Windows ARM64).
 *
 * Required env:
 *   CLOUDFLARE_API_TOKEN  — Pages:Edit token
 *   CLOUDFLARE_ACCOUNT_ID — account UUID
 *   CF_PAGES_PROJECT      — project name (default: claw-planet)
 *   DEPLOY_BRANCH         — branch label (default: main)
 *   DEPLOY_DIST           — dist folder (default: dist)
 */

import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, posix, sep } from 'node:path';
import { existsSync } from 'node:fs';

const API = 'https://api.cloudflare.com/client/v4';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const PROJECT = process.env.CF_PAGES_PROJECT || 'claw-planet';
const BRANCH = process.env.DEPLOY_BRANCH || 'main';
const DIST = process.env.DEPLOY_DIST || 'dist';

if (!TOKEN || !ACCOUNT_ID) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID required');
  process.exit(1);
}
if (!existsSync(DIST)) {
  console.error(`Dist folder "${DIST}" does not exist. Run npm run build first.`);
  process.exit(1);
}

const headers = { 'Authorization': `Bearer ${TOKEN}` };
const log = (...a) => console.log(...a);

async function walk(dir) {
  const out = [];
  const items = await readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) out.push(...await walk(fullPath));
    else if (item.isFile()) out.push(fullPath);
  }
  return out;
}

function hash(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 32);
}

function contentTypeFor(p) {
  const ext = p.split('.').pop()?.toLowerCase() ?? '';
  const m = {
    html: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'application/javascript; charset=utf-8',
    mjs: 'application/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    ico: 'image/x-icon',
    woff: 'font/woff',
    woff2: 'font/woff2',
    txt: 'text/plain; charset=utf-8',
    xml: 'application/xml; charset=utf-8',
    map: 'application/json',
  };
  return m[ext] || 'application/octet-stream';
}

async function buildManifest() {
  const files = await walk(DIST);
  const manifest = {};
  const fileMap = new Map();
  for (const fullPath of files) {
    const buf = await readFile(fullPath);
    const rel = relative(DIST, fullPath).split(sep).join(posix.sep);
    const urlPath = '/' + rel;
    const ext = '.' + (rel.split('.').pop() || '');
    const base64 = buf.toString('base64');
    const key = hash(base64 + ext);
    manifest[urlPath] = key;
    fileMap.set(key, {
      key,
      value: base64,
      metadata: { contentType: contentTypeFor(rel) },
      base64: true,
    });
  }
  return { manifest, fileMap };
}

async function getUploadJwt() {
  const url = `${API}/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/upload-token`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`upload-token: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.result.jwt;
}

async function checkMissing(jwt, hashes) {
  const url = `${API}/pages/assets/check-missing`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hashes }),
  });
  if (!res.ok) throw new Error(`check-missing: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.result || hashes;
}

async function uploadBatch(jwt, payloads) {
  const url = `${API}/pages/assets/upload`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payloads),
  });
  if (!res.ok) throw new Error(`upload: ${res.status} ${await res.text()}`);
  return res.json();
}

async function uploadAssets(jwt, payloads) {
  const BATCH = 4 * 1024 * 1024;
  const batches = [];
  let cur = [];
  let curBytes = 0;
  for (const p of payloads) {
    const size = p.value.length;
    if (curBytes + size > BATCH && cur.length > 0) {
      batches.push(cur);
      cur = [];
      curBytes = 0;
    }
    cur.push(p);
    curBytes += size;
  }
  if (cur.length > 0) batches.push(cur);
  log(`  Uploading in ${batches.length} batch(es)...`);
  for (let i = 0; i < batches.length; i++) {
    await uploadBatch(jwt, batches[i]);
    log(`  Batch ${i + 1}/${batches.length}: ${batches[i].length} files uploaded`);
  }
}

async function createDeployment(manifest, branch) {
  const url = `${API}/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/deployments`;
  const form = new FormData();
  form.append('manifest', JSON.stringify(manifest));
  form.append('branch', branch);
  const res = await fetch(url, { method: 'POST', headers, body: form });
  if (!res.ok) throw new Error(`create deployment: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.result;
}

async function main() {
  log(`▸ Deploying ${DIST} to Pages project "${PROJECT}" (branch: ${BRANCH})`);
  log('▸ Building manifest...');
  const { manifest, fileMap } = await buildManifest();
  const total = Object.keys(manifest).length;
  log(`  ${total} files in manifest`);
  log('▸ Getting upload JWT...');
  const jwt = await getUploadJwt();
  log('▸ Checking missing files...');
  const allHashes = Array.from(fileMap.keys());
  const missing = await checkMissing(jwt, allHashes);
  log(`  ${missing.length} of ${total} files need uploading`);
  if (missing.length > 0) {
    const payloads = missing.map((h) => fileMap.get(h)).filter(Boolean);
    await uploadAssets(jwt, payloads);
  }
  log('▸ Creating deployment...');
  const dep = await createDeployment(manifest, BRANCH);
  log(`✅ Deployment created`);
  log(`   ID: ${dep.id}`);
  log(`   URL: ${dep.url}`);
  log(`   Stage: ${dep.latest_stage?.name ?? 'unknown'}`);
}

main().catch((e) => {
  console.error(`❌ ${e.message}`);
  process.exit(1);
});
