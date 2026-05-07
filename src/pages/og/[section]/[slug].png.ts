/**
 * /og/<section>/<slug>.png — per-entry Open Graph image.
 *
 * Generated at build time from each published MDX entry's front matter.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOgPng } from '@utils/og-render';

const sections = [
  { dir: 'overview',    collection: 'explainers',  sectionLabel: 'Overview' },
  { dir: 'setup',       collection: 'setups',      sectionLabel: 'Setup' },
  { dir: 'connections', collection: 'connections', sectionLabel: 'Connections' },
  { dir: 'plugins',     collection: 'plugins',     sectionLabel: 'Plugins' },
  { dir: 'use-cases',   collection: 'use-cases',   sectionLabel: 'Use cases' },
  { dir: 'security',    collection: 'gotchas',     sectionLabel: 'Security' },
  { dir: 'compare',     collection: 'compares',    sectionLabel: 'Compare' },
];

export async function getStaticPaths() {
  const out: any[] = [];
  for (const s of sections) {
    const all = await getCollection(s.collection as any);
    for (const e of all) {
      if (e.data.status !== 'published') continue;
      out.push({
        params: { section: s.dir, slug: e.id.replace(/\.mdx?$/, '') },
        props: { entry: e, sectionLabel: s.sectionLabel },
      });
    }
  }
  return out;
}

export const GET: APIRoute = async ({ props }) => {
  const { entry, sectionLabel } = props as any;
  const png = await renderOgPng({
    title: entry.data.title,
    sectionNumber: entry.data.sectionNumber,
    sectionLabel,
    description: entry.data.description,
    verificationState: entry.data.verificationState,
    variant: 'entry',
  });
  return new Response(png, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
    },
  });
};