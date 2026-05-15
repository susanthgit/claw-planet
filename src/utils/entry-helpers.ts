/**
 * Entry helpers — shared functions used by all section [slug].astro pages.
 *
 * Provides:
 * - getPrevNext: returns the previous and next entries by sectionNumber order
 * - getReadingTime: computes "N min read" from a body string
 * - getSchemaOrgArticle: returns JSON-LD for Schema.org Article type
 * - getRelated: returns 2-3 related entries based on seeAlso or shared keywords
 * - sectionConfig: shared metadata about each section (collection name, breadcrumb, content path on disk)
 */

export const sectionConfig = {
  overview: { key: 'overview', collection: 'explainers', breadcrumb: '§ 1 Overview', sectionName: 'Overview', href: '/openclaw/overview/', contentPath: 'src/content/explainers' },
  setup: { key: 'setup', collection: 'setups', breadcrumb: '§ 2 Setup', sectionName: 'Setup', href: '/openclaw/setup/', contentPath: 'src/content/setups' },
  connections: { key: 'connections', collection: 'connections', breadcrumb: '§ 3 Connections', sectionName: 'Connections', href: '/openclaw/connections/', contentPath: 'src/content/connections' },
  plugins: { key: 'plugins', collection: 'plugins', breadcrumb: '§ 4 Plugins', sectionName: 'Plugins', href: '/openclaw/plugins/', contentPath: 'src/content/plugins' },
  'use-cases': { key: 'use-cases', collection: 'use-cases', breadcrumb: '§ 5 Use cases', sectionName: 'Use cases', href: '/openclaw/use-cases/', contentPath: 'src/content/use-cases' },
  security: { key: 'security', collection: 'gotchas', breadcrumb: '§ 6 Security', sectionName: 'Security', href: '/openclaw/security/', contentPath: 'src/content/gotchas' },
  compare: { key: 'compare', collection: 'compares', breadcrumb: '§ 7 Compare', sectionName: 'Compare', href: '/compare/', contentPath: 'src/content/compares' },
};

/**
 * Given a flat list of entries (already filtered by status='published')
 * sorted by sectionNumber, return prev/next info for the current entry.
 */
export function getPrevNext(entries: any[], currentId: string, sectionHref: string): { prev: any | null; next: any | null } {
  const sorted = [...entries].sort((a, b) => a.data.sectionNumber.localeCompare(b.data.sectionNumber));
  const idx = sorted.findIndex(e => e.id === currentId);
  if (idx === -1) return { prev: null, next: null };
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  function shape(e: any) {
    if (!e) return null;
    return {
      title: e.data.title,
      sectionNumber: e.data.sectionNumber,
      href: `${sectionHref}${e.id.replace(/\.mdx?$/, '')}/`,
    };
  }
  return { prev: shape(prev), next: shape(next) };
}

/**
 * Estimate reading time. We count words from the entry's raw MDX body.
 * Slightly inflates vs prose-only, but consistent across entries.
 */
export function getReadingTime(body: string | undefined): string {
  if (!body) return '';
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`_\[\]\(\)\{\}\|]/g, ' ')
    .replace(/\s+/g, ' ');
  const words = text.split(' ').filter(w => w.length > 1).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

/**
 * Build Schema.org Article JSON-LD for an entry.
 */
export function getSchemaOrgArticle(opts: {
  entry: any;
  url: string;
  sectionName: string;
  authorName?: string;
}): string {
  const { entry, url, sectionName, authorName = 'Sush (Susanth Sutheesh)' } = opts;
  const obj: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: entry.data.title,
    description: entry.data.description,
    articleSection: sectionName,
    url,
    inLanguage: 'en',
    isAccessibleForFree: true,
    publisher: {
      '@type': 'Organization',
      name: 'Claw Planet',
      url: 'https://claw.aguidetocloud.com/',
    },
    author: {
      '@type': 'Person',
      name: authorName,
    },
    dateModified: entry.data.lastReviewedAt,
  };
  if (entry.data.lastTestedAt) {
    obj.datePublished = entry.data.lastTestedAt;
  } else {
    obj.datePublished = entry.data.lastReviewedAt;
  }
  if (entry.data.sources && entry.data.sources.length > 0) {
    obj.citation = entry.data.sources.map((s: string) => ({ '@type': 'CreativeWork', url: s }));
  }
  return JSON.stringify(obj);
}

/**
 * Build the correct route URL for an entry — vendor-aware.
 *
 * OpenClaw entries (the default vendor) route through the per-section href the
 * caller supplied (e.g. /openclaw/overview/<slug>/). Vendor-namespaced entries
 * (Anthropic, OpenAI, Google, Microsoft) live under /<vendor>/<product>/<short-slug>/
 * where the file's `<vendor>-<product>-` prefix is stripped from the slug.
 *
 * Cross-vendor entries (compare pages) and entries without a product use the
 * caller's section href as-is.
 */
function buildEntryHref(entry: any, defaultSectionHref: string): string {
  const vendor = entry?.data?.vendor;
  const product = entry?.data?.product;
  const fullSlug = entry.id.replace(/\.mdx?$/, '');
  if (
    product &&
    typeof vendor === 'string' &&
    vendor !== 'openclaw' &&
    vendor !== 'cross-vendor'
  ) {
    const shortSlug = fullSlug.replace(new RegExp(`^${vendor}-${product}-`), '');
    return `/${vendor}/${product}/${shortSlug}/`;
  }
  return `${defaultSectionHref}${fullSlug}/`;
}

/**
 * Return up to N related entries across all sections.
 * Strategy:
 *   1. start with explicit seeAlso refs (sectionNumbers)
 *   2. fall back to entries from the same section that share a keyword in description
 *   3. cap at maxResults
 */
export function getRelated(opts: {
  entry: any;
  allEntries: { entries: any[]; sectionHref: string; sectionName: string }[];
  maxResults?: number;
}): { title: string; sectionNumber: string; sectionName: string; href: string }[] {
  const { entry, allEntries, maxResults = 3 } = opts;
  const seeAlso: string[] = entry.data.seeAlso ?? [];
  const out: any[] = [];
  const seen = new Set<string>();
  for (const ref of seeAlso) {
    for (const sec of allEntries) {
      const found = sec.entries.find((e: any) => e.data.sectionNumber === ref);
      if (found && !seen.has(found.id)) {
        seen.add(found.id);
        out.push({
          title: found.data.title,
          sectionNumber: found.data.sectionNumber,
          sectionName: sec.sectionName,
          href: buildEntryHref(found, sec.sectionHref),
        });
        if (out.length >= maxResults) return out;
      }
    }
  }
  if (out.length < maxResults) {
    const myKeywords = new Set(
      (entry.data.description ?? '')
        .toLowerCase()
        .match(/\b[a-z][a-z-]{4,}\b/g)
        ?? []
    );
    const candidates: { entry: any; sectionHref: string; sectionName: string; score: number }[] = [];
    for (const sec of allEntries) {
      for (const e of sec.entries) {
        if (e.id === entry.id || seen.has(e.id)) continue;
        const desc = (e.data.description ?? '').toLowerCase();
        let score = 0;
        for (const kw of myKeywords) {
          if (typeof kw === 'string' && desc.includes(kw)) score++;
        }
        if (score > 0) candidates.push({ entry: e, sectionHref: sec.sectionHref, sectionName: sec.sectionName, score });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    for (const c of candidates) {
      if (out.length >= maxResults) break;
      out.push({
        title: c.entry.data.title,
        sectionNumber: c.entry.data.sectionNumber,
        sectionName: c.sectionName,
        href: buildEntryHref(c.entry, c.sectionHref),
      });
    }
  }
  return out;
}
