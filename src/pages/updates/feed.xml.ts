import rss from '@astrojs/rss';
import { updates } from '@data/updates';

const SITE = 'https://claw.aguidetocloud.com';

export async function GET(context: any) {
  return rss({
    title: 'Claw Planet — Updates',
    description: 'Hand-curated watchlist of OpenClaw + agent-runtime news. Releases, advisories, community moves. Not a CVE feed; high-signal items only.',
    site: context.site ?? SITE,
    customData: '<language>en</language>',
    items: updates.map((u) => ({
      title: `[${u.tag}] ${u.title}`,
      description: u.meta,
      pubDate: new Date(u.date),
      link: u.href.startsWith('http') ? u.href : new URL(u.href, context.site ?? SITE).toString(),
      categories: [u.tag],
    })),
  });
}
