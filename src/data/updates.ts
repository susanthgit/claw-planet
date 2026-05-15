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
    date: '2026-05-15',
    tag: 'NEWS',
    title: 'Claw Planet · Batch E — Compare + Updates seed shipped',
    href: '/compare/',
    meta: 'Three cross-vendor /compare/ pages live — CLI coding agents (Claude Code · Codex CLI · Gemini CLI · GitHub Copilot CLI), direct model APIs (Anthropic · Gemini · Foundry), and M365 extensibility paths (Copilot Studio · Declarative Agents · Custom Engine Agents). The comparison shape is consistent across all four entries — where each wins, where each lags, honest take at the bottom. Phase 1 of v0b complete.',
  },
  {
    date: '2026-05-14',
    tag: 'RELEASE',
    title: 'Claude Code 2.1.142 — claude agents flags · Fast-mode Opus 4.7',
    href: 'https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md',
    meta: 'Anthropic\'s `@anthropic-ai/claude-code` 2.1.142 (npm registry, 14 May 2026) adds eight new `claude agents` flags (--add-dir · --settings · --mcp-config · --plugin-dir · --permission-mode · --model · --effort · --dangerously-skip-permissions) for configuring dispatched background sessions. Fast mode now defaults to Claude Opus 4.7 (was Opus 4.6); pin to 4.6 with `CLAUDE_CODE_OPUS_4_6_FAST_MODE_OVERRIDE=1`. Note: npm install is deprecated — use `curl -fsSL https://claude.ai/install.sh | bash`.',
  },
  {
    date: '2026-05-12',
    tag: 'RELEASE',
    title: 'Gemini CLI 0.42.0 — Gemma 4 enabled by default',
    href: 'https://www.geminicli.com/docs/changelogs',
    meta: 'Google Gemini CLI 0.42.0 (npm registry, 12 May 2026) enabled Gemma 4 models by default for all users via the Gemini API. Also adds Auto Memory Inbox (a canonical-patch contract for skill management) and Voice Mode wave animations with privacy/compliance UX warnings for the Gemini Live backend. Free tier: 1,000 req/day on a personal Google OAuth account; AI Studio API key is a separate path with its own daily cap.',
  },
  {
    date: '2026-05-08',
    tag: 'RELEASE',
    title: 'OpenAI Codex CLI 0.130.0 — codex remote-control · Bedrock aws-login auth',
    href: 'https://github.com/openai/codex/releases/tag/rust-v0.130.0',
    meta: 'OpenAI Codex CLI 0.130.0 (npm registry, 8 May 2026) adds `codex remote-control` as a simpler entrypoint for starting a headless, remotely controllable app-server. App-server clients can now page large threads with unloaded / summary / full turn item views. Bedrock auth can now use AWS console-login credentials from `aws login` profiles. Built-in MCPs are also moved to first-class runtime servers (PR #21356).',
  },
  {
    date: '2026-04-17',
    tag: 'RELEASE',
    title: 'M365 Agents Toolkit 6.8.0 — MCP scaffolding for declarative agents',
    href: 'https://github.com/OfficeDev/microsoft-365-agents-toolkit/blob/main/packages/vscode-extension/CHANGELOG.md',
    meta: 'M365 Agents Toolkit 6.8.0 (17 April 2026) ships CLI-based MCP plugin scaffolding via `atk add action --api-plugin-type mcp` for declarative agents in M365 Copilot. Also adds broker-based CLI authentication, an Azure AI Foundry proxy agent template with C# support, and bumps the app manifest schema to v1.26. MCP integration for declarative agents was previewed in ATK 6.4.0 (Nov 2025) and went GA in 6.6.0 (March 2026).',
  },
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
    meta: 'Soft launch with §1 Overview, §2 Setup, §3 Connections, §4 Plugins, §5 Use cases, §6 Security, §7 Compare. All entries sourced until Sush actually runs OpenClaw end-to-end.',
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
