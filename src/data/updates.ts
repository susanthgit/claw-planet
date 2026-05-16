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
    meta: 'Anthropic\'s `@anthropic-ai/claude-code` 2.1.142 (npm registry, 14 May 2026; on the `latest`/`next` channel — `stable` lags at 2.1.132) adds eight new `claude agents` flags (--add-dir · --settings · --mcp-config · --plugin-dir · --permission-mode · --model · --effort · --dangerously-skip-permissions) for configuring dispatched background sessions. Fast mode now defaults to Claude Opus 4.7 (was Opus 4.6); pin to 4.6 with `CLAUDE_CODE_OPUS_4_6_FAST_MODE_OVERRIDE=1`. Note: npm install is deprecated per the current README — use `curl -fsSL https://claude.ai/install.sh | bash`.',
  },
  {
    date: '2026-05-12',
    tag: 'RELEASE',
    title: 'Gemini CLI 0.42.0 — Gemma 4 enabled by default',
    href: 'https://github.com/google-gemini/gemini-cli/releases/tag/v0.42.0',
    meta: 'Google Gemini CLI 0.42.0 (npm registry, 12 May 2026) enabled Gemma 4 models by default for all users via the Gemini API. Also adds Auto Memory Inbox (a canonical-patch contract for seamless skill management) and Voice Mode wave animations with privacy/compliance UX warnings for the Gemini Live backend. Free tier: 1,000 req/day on a personal Google OAuth account (60 req/min cap); same daily cap via an AI Studio API key with explicit model-selection control.',
  },
  {
    date: '2026-05-11',
    tag: 'NEWS',
    title: 'Claude Platform on AWS — Anthropic-hosted Claude, billed through AWS',
    href: 'https://docs.anthropic.com/en/build-with-claude/claude-platform-on-aws',
    meta: 'Anthropic launched a Claude endpoint that runs on Anthropic\'s own infrastructure but bills + authenticates through AWS — distinct from Amazon Bedrock (partner-operated, Anthropic models served by AWS). Full API parity with the direct Claude API (Messages, Files, Batches, Managed Agents, Skills, code execution, tool use — no Bedrock feature lag). Endpoint shape mirrors the direct API; adds `x-amzn-requestid` header alongside the standard `request-id`.',
  },
  {
    date: '2026-05-08',
    tag: 'RELEASE',
    title: 'OpenAI Codex CLI 0.130.0 — codex remote-control · Bedrock aws-login auth',
    href: 'https://github.com/openai/codex/releases/tag/rust-v0.130.0',
    meta: 'OpenAI Codex CLI 0.130.0 (npm registry, 8 May 2026) adds `codex remote-control` as a simpler entrypoint for starting a headless, remotely controllable app-server. App-server clients can now page large threads with unloaded / summary / full turn item views. Bedrock auth can now use AWS console-login credentials from `aws login` profiles. Built-in MCPs are also moved to first-class runtime servers (PR #21356).',
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
    tag: 'RELEASE',
    title: 'Gemini 3.1 Flash-Lite GA — 1M context, $0.25/$1.50 per MTok',
    href: 'https://ai.google.dev/gemini-api/docs/changelog',
    meta: 'Google promoted `gemini-3.1-flash-lite` from preview to stable on 7 May 2026 — first Gemini 3 family member to reach GA. 1M input / 64K output context; $0.25/MTok input (text/image/video; $0.50 audio) / $1.50/MTok output; no rate limit on the free tier. The preview variant `gemini-3.1-flash-lite-preview` was deprecated 11 May and shuts down 25 May 2026 — migrate any preview-pinned configs before then.',
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
    date: '2026-05-04',
    tag: 'NEWS',
    title: 'Anthropic WIF lands — keyless OIDC auth for Claude API',
    href: 'https://docs.anthropic.com/en/manage-claude/workload-identity-federation',
    meta: 'Anthropic quietly shipped Workload Identity Federation around 4 May 2026 (Python SDK 0.98.0 added the support; no formal release-note blast). Replaces static `sk-ant-…` API keys with short-lived OIDC tokens (`sk-ant-oat01-…`, 60s–24h lifetime, default 1h). Supports AWS IAM, GCP metadata server, GitHub Actions, K8s service accounts, Azure Entra ID, Okta, SPIFFE — any OIDC issuer. Direct Claude API only — Bedrock / Vertex / Foundry still use their own IAM.',
  },
  {
    date: '2026-04-28',
    tag: 'NEWS',
    title: 'OpenClaw Discord crosses comfortable size',
    href: 'https://discord.gg/clawd',
    meta: 'Active community space — both maintainers and users. Worth joining if you are running OpenClaw seriously.',
  },
  {
    date: '2026-04-22',
    tag: 'RELEASE',
    title: 'Gemini Embedding 2 GA — embeddings for text, images, video, audio, PDF',
    href: 'https://ai.google.dev/gemini-api/docs/models/gemini-embedding-2',
    meta: 'Google promoted `gemini-embedding-2` to stable on 22 April 2026 — first Gemini API embedding model that maps text, images, video, audio, and PDFs into one shared vector space. 8,192-token input. Output dimension flexible 128–3072 (recommended 768 / 1536 / 3072). Use case: cross-modal semantic search — query a text document store with an image and get ranked text results, or vice versa. Preview (`gemini-embedding-2-preview`, 10 March 2026) preceded the GA.',
  },
  {
    date: '2026-04-17',
    tag: 'RELEASE',
    title: 'M365 Agents Toolkit 6.8.0 — MCP scaffolding for declarative agents',
    href: 'https://github.com/OfficeDev/microsoft-365-agents-toolkit/blob/main/packages/vscode-extension/CHANGELOG.md',
    meta: 'M365 Agents Toolkit 6.8.0 (17 April 2026) ships CLI-based MCP plugin scaffolding via `atk add action --api-plugin-type mcp` for declarative agents in M365 Copilot. Also adds broker-based CLI authentication, an Azure AI Foundry proxy agent template with C# support, and bumps the app manifest schema to v1.26. MCP integration for declarative agents was previewed in ATK 6.4.0 (Nov 2025) and went GA in 6.6.0 (March 2026).',
  },
  {
    date: '2026-04-16',
    tag: 'RELEASE',
    title: 'Claude Opus 4.7 ships — API changes, cyber safeguards, better vision',
    href: 'https://www.anthropic.com/news/claude-opus-4-7',
    meta: 'Anthropic released Claude Opus 4.7 (model ID `claude-opus-4-7`) on 16 April 2026. **API breaking changes vs Opus 4.6** — read the migration guide before swapping `claude-opus-4-6` for `claude-opus-4-7`. Pricing unchanged ($5/$25 per MTok). Notable: built-in cyber safeguards auto-block prohibited security-related requests; security professionals can join Anthropic\'s Cyber Verification Program to unlock legitimate pentest / red-team use. Available on direct API, Bedrock, Vertex AI, and Foundry from day one. Same day, Claude in Amazon Bedrock went self-serve for all Bedrock customers via the new `/anthropic/v1/messages` endpoint across 27 AWS regions.',
  },
  {
    date: '2026-04-15',
    tag: 'RELEASE',
    title: 'OpenClaw documents 24+ supported channels',
    href: 'https://docs.openclaw.ai/channels/index',
    meta: 'WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, BlueBubbles, IRC, Microsoft Teams, Matrix, Feishu, LINE, Mattermost, Nextcloud Talk, Nostr, Synology Chat, Tlon, Twitch, Zalo, Zalo Personal, WeChat, QQ, WebChat, Yuanbao. Plus voice nodes on macOS/iOS/Android.',
  },
  {
    date: '2026-04-14',
    tag: 'DEPRECATED',
    title: 'Claude Sonnet 4 + Opus 4 originals deprecated — API access ends June 15',
    href: 'https://docs.anthropic.com/en/release-notes/api',
    meta: 'Anthropic deprecated the mid-2025 Claude 4 originals — `claude-sonnet-4-20250514` and `claude-opus-4-20250514` — on 14 April 2026. **API access ends 15 June 2026**: calls to these IDs error after that. Migration path: Sonnet 4.6 replaces Sonnet 4; Opus 4.7 replaces Opus 4 (note Opus 4.7 has its own API breaking changes — a two-step Opus migration may be needed). Claude Haiku 3 (`claude-3-haiku-20240307`) was also retired in the same cleanup wave (20 April 2026).',
  },
  {
    date: '2026-04-01',
    tag: 'NEWS',
    title: 'MCP servers cross 200 published',
    href: 'https://github.com/modelcontextprotocol/servers',
    meta: "OpenClaw can use any MCP server through its mcp bridge. Skills are a separate plugin mechanism — both are tools to the agent, but they're different things to install and trust.",
  },
];
