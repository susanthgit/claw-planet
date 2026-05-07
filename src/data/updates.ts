/**
 * Updates feed — single source of truth for §8 Updates.
 * Consumed by:
 *   - src/pages/updates/index.astro (rendered page)
 *   - src/pages/updates/feed.xml.ts (RSS feed)
 *   - src/pages/index.astro (home-page recent updates)
 *
 * Add new entries at the TOP. Each entry:
 *   - date: YYYY-MM-DD
 *   - tag: NEWS | RELEASE | CVE | DEPRECATED | ADVISORY
 *   - title: short headline
 *   - href: external link or internal route
 *   - meta: 1–2 sentences of context
 */

export type UpdateTag = 'NEWS' | 'RELEASE' | 'CVE' | 'DEPRECATED' | 'ADVISORY';

export interface Update {
  date: string;
  tag: UpdateTag;
  title: string;
  href: string;
  meta: string;
}

export const updates: Update[] = [
  {
    date: '2026-05-08',
    tag: 'NEWS',
    title: 'Claw Planet polish v2 ships — search, TOC, prev/next, RSS, schema',
    href: '/',
    meta: 'After the soft launch, a full QA + web-dev expert pass added 19 improvements: working ⌘K search via Pagefind, in-page TOCs, prev/next navigation, schema.org Article markup on every entry, RSS feed, per-page OG images, glossary tooltips, code-copy buttons, print CSS, anchor links, keyboard shortcuts, and more.',
  },
  {
    date: '2026-05-07',
    tag: 'NEWS',
    title: 'Claw Planet goes live',
    href: '/',
    meta: 'Soft launch with §1 Overview, §2 Setup, §3 Connections, §4 Plugins, §5 Use cases, §6 Security, §7 Compare. All entries sourced-only until Sush actually runs OpenClaw end-to-end.',
  },
  {
    date: '2026-05-07',
    tag: 'NEWS',
    title: 'Sourced OpenClaw primitive map (46 primitives) shipped',
    href: 'https://github.com/susanthgit/claw-planet/blob/main/src/data/openclaw-primitives.json',
    meta: 'Every concept page is grounded in this map. 7 workspace files, 7 architecture concepts, 7 channels, 7 built-in tools, 5 memory engines, 4 security primitives, 4 automation, 3 OUR umbrella terms (flagged).',
  },
  {
    date: '2026-04-28',
    tag: 'NEWS',
    title: 'OpenClaw Discord crosses comfortable size',
    href: 'https://discord.gg/clawd',
    meta: 'Active community space — both maintainers and users. Worth joining if you are running OpenClaw seriously.',
  },
  {
    date: '2026-04-15',
    tag: 'RELEASE',
    title: 'OpenClaw documents 24+ supported channels',
    href: 'https://docs.openclaw.ai/channels/index',
    meta: 'WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, BlueBubbles, IRC, Microsoft Teams, Matrix, Feishu, LINE, Mattermost, Nextcloud Talk, Nostr, Synology Chat, Tlon, Twitch, Zalo, Zalo Personal, WeChat, QQ, WebChat, Yuanbao. Plus voice nodes on macOS/iOS/Android.',
  },
  {
    date: '2026-04-01',
    tag: 'NEWS',
    title: 'MCP servers cross 200 published',
    href: 'https://github.com/modelcontextprotocol/servers',
    meta: "OpenClaw can use any MCP server through its mcp bridge. Skills are a separate plugin mechanism — both are tools to the agent, but they're different things to install and trust.",
  },
];
