/**
 * comparisons — data file driving the /compare/ matrices.
 *
 * Each comparison = one entry keyed by slug (matches /compare/<slug>/ URL).
 * - tools: ordered list of tool keys (drives column order in the matrix)
 * - sources: ref-key → URL map (per-cell sourceRefs look up here)
 * - rows: array of dimension rows (each row has a cell per listed tool)
 *
 * Build-time validator (validateComparisons) runs at module load and throws
 * if invariants are broken — catches missing cells, unresolved sourceRefs,
 * unknown tool keys. Astro build surfaces the error clearly.
 *
 * Set 2026-05-15 (Claw v0b · Batch E).
 */

import { toolRegistry, type ToolKey } from './toolRegistry';

export interface Cell {
  /** Primary cell text — keep tight (2-15 words is the sweet spot). */
  value: string;
  /** Optional qualifier — renders smaller/fainter (e.g. "free up to 1000 req/day"). */
  note?: string;
  /** Keys into the comparison's `sources` map — per-cell traceability. */
  sourceRefs?: string[];
}

export interface Row {
  /** Stable identifier (e.g. "install", "auth", "free-tier"). */
  key: string;
  /** Display label rendered in the first column. */
  label: string;
  /** Sources backing the entire row (in addition to per-cell refs). */
  sourceRefs?: string[];
  /** One cell per listed tool key — validator enforces no missing tools. */
  cells: Record<string, Cell>;
}

export interface Comparison {
  title: string;
  intro: string;
  /** Ordered tool keys — drives column order; every key must exist in toolRegistry. */
  tools: string[];
  /** ref-key → URL. Per-cell sourceRefs look up into this map. */
  sources: Record<string, string>;
  rows: Row[];
}

export const comparisons: Record<string, Comparison> = {
  'direct-model-apis': {
    title: 'Direct model APIs',
    intro: 'Three direct model API surfaces a production builder picks between — Anthropic\'s Claude API, Google\'s Gemini API, and Microsoft Foundry (which wraps Azure OpenAI plus 1,900+ partner models). OpenAI\'s own API at api.openai.com is deliberately outside this comparison: Claw doesn\'t publish an /openai/api/ page. Use Foundry for Azure-governed OpenAI models, or OpenAI\'s docs for the direct API.',
    tools: ['claude-api', 'gemini-api', 'foundry'],
    sources: {
      'ant-getting-started': 'https://docs.anthropic.com/en/api/getting-started',
      'ant-models':          'https://docs.anthropic.com/en/docs/about-claude/models/overview',
      'ant-pricing':         'https://www.anthropic.com/pricing',
      'ant-stream':          'https://docs.anthropic.com/en/api/messages-streaming',
      'ant-tools':           'https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview',
      'ant-sdks':            'https://docs.anthropic.com/en/api/client-sdks',
      'ant-pypi':            'https://pypi.org/project/anthropic/',
      'gem-quickstart':      'https://ai.google.dev/gemini-api/docs/quickstart',
      'gem-libraries':       'https://ai.google.dev/gemini-api/docs/libraries',
      'gem-models':          'https://ai.google.dev/gemini-api/docs/models',
      'gem-pricing':         'https://ai.google.dev/gemini-api/docs/pricing',
      'gem-fn':              'https://ai.google.dev/gemini-api/docs/function-calling',
      'gem-rate':            'https://ai.google.dev/gemini-api/docs/rate-limits',
      'gem-pypi':            'https://pypi.org/project/google-genai/',
      'fdy-overview':        'https://learn.microsoft.com/en-us/azure/ai-foundry/what-is-azure-ai-foundry',
      'fdy-sdk':             'https://learn.microsoft.com/en-us/azure/ai-foundry/how-to/develop/sdk-overview',
      'fdy-claude':          'https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/how-to/use-foundry-models-claude',
      'fdy-models':          'https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models',
      'fdy-pricing':         'https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/',
      'fdy-pypi':            'https://pypi.org/project/azure-ai-projects/',
    },
    rows: [
      {
        key: 'sdk-python',
        label: 'SDK — Python',
        cells: {
          'claude-api':  { value: 'anthropic 0.102.0', note: 'Still 0.x — has not hit 1.0; Python ≥3.9', sourceRefs: ['ant-pypi'] },
          'gemini-api':  { value: 'google-genai 2.2.0', note: 'NEW GA SDK; old google-generativeai stops working 30 Nov 2025 (status: not actively maintained)', sourceRefs: ['gem-pypi', 'gem-libraries'] },
          'foundry':     { value: 'azure-ai-projects 2.1.0', note: '2.x is Foundry projects (new); 1.x was Foundry (classic) / hub-based', sourceRefs: ['fdy-pypi', 'fdy-sdk'] },
        },
      },
      {
        key: 'sdk-js',
        label: 'SDK — TypeScript/JS',
        cells: {
          'claude-api':  { value: '@anthropic-ai/sdk 0.96.0', note: 'Node ≥20', sourceRefs: ['ant-sdks'] },
          'gemini-api':  { value: '@google/genai 2.2.0', note: 'Old @google/generativeai is deprecated', sourceRefs: ['gem-libraries'] },
          'foundry':     { value: '@azure/ai-projects 2.1.1', note: 'Delegates to openai ^6.16.0 for Responses API and Chat Completions', sourceRefs: ['fdy-sdk'] },
        },
      },
      {
        key: 'auth',
        label: 'Auth',
        cells: {
          'claude-api': {
            value: 'API key (x-api-key) or Workload Identity Federation (OAuth)',
            note: 'On Bedrock/Vertex/Foundry: cloud-native IAM',
            sourceRefs: ['ant-getting-started'],
          },
          'gemini-api': {
            value: 'API key (x-goog-api-key or env var)',
            note: 'On Vertex AI: Application Default Credentials (ADC) / service accounts — different path',
            sourceRefs: ['gem-quickstart'],
          },
          'foundry': {
            value: 'Microsoft Entra ID (DefaultAzureCredential) — primary',
            note: 'API keys for /openai/v1 endpoint; Entra is the only auth supported on the SDK client itself',
            sourceRefs: ['fdy-sdk'],
          },
        },
      },
      {
        key: 'base-url',
        label: 'Base URL',
        cells: {
          'claude-api': {
            value: 'https://api.anthropic.com/v1',
            sourceRefs: ['ant-getting-started'],
          },
          'gemini-api': {
            value: 'https://generativelanguage.googleapis.com/v1beta/',
            note: 'v1beta is the active path; SDK abstracts',
            sourceRefs: ['gem-quickstart'],
          },
          'foundry': {
            value: 'Per-resource (e.g. <resource>.services.ai.azure.com/api/projects/<project>)',
            note: 'Three endpoint patterns: Foundry SDK · OpenAI SDK (/openai/v1) · Anthropic SDK (/anthropic)',
            sourceRefs: ['fdy-sdk', 'fdy-claude'],
          },
        },
      },
      {
        key: 'headline-model',
        label: 'Current headline model',
        cells: {
          'claude-api': {
            value: 'Claude Opus 4.7 (1M context · 128k output)',
            note: 'Sonnet 4.6 (1M/64k), Haiku 4.5 (200k/64k) also current',
            sourceRefs: ['ant-models'],
          },
          'gemini-api': {
        value: 'Gemini 2.5 Pro stable (1M context); Gemini 3.1 Pro Preview',
        note: 'Gemini 3.1 Flash-Lite went stable GA on May 7 2026',
        sourceRefs: ['gem-models'],
      },
          'foundry': {
            value: 'GPT-5.5 (1,050k context); plus 1,900+ models in catalogue',
            note: 'Includes Claude (Opus 4.7 / Sonnet 4.6 / Haiku 4.5), Mistral, Llama, Grok, Phi-4, DeepSeek-R1',
            sourceRefs: ['fdy-overview', 'fdy-models'],
          },
        },
      },
      {
        key: 'streaming',
        label: 'Streaming protocol',
        cells: {
          'claude-api': {
            value: 'SSE with named events (message_start · content_block_delta · message_stop)',
            note: 'Includes thinking_delta + signature_delta for extended thinking',
            sourceRefs: ['ant-stream'],
          },
          'gemini-api': {
            value: 'SSE — raw JSON chunks (no named event types)',
            note: 'REST: streamGenerateContent?alt=sse; SDK exposes iterator/async-generator',
            sourceRefs: ['gem-quickstart'],
          },
          'foundry': {
            value: 'SSE — OpenAI-compatible (data: {...}\\n\\n then data: [DONE])',
            note: 'Claude models via Foundry use Anthropic\'s SSE format instead',
            sourceRefs: ['fdy-sdk', 'fdy-claude'],
          },
        },
      },
      {
        key: 'tool-calling',
        label: 'Tool/function calling',
        cells: {
          'claude-api': {
            value: 'tools[] with input_schema (JSON Schema); response has tool_use blocks',
            note: 'Server tools (web_search, code_execution, web_fetch) execute Anthropic-side',
            sourceRefs: ['ant-tools'],
          },
          'gemini-api': {
            value: 'FunctionDeclaration in tools; response has function_call parts',
            note: 'tool_choice: AUTO · ANY · NONE; parallel calls; Interactions API for multi-step',
            sourceRefs: ['gem-fn'],
          },
          'foundry': {
            value: 'OpenAI Responses API or Chat Completions tool format',
            note: 'Claude models via Foundry use Anthropic\'s tool format instead',
            sourceRefs: ['fdy-sdk'],
          },
        },
      },
      {
        key: 'pricing-headline',
        label: 'Pricing — headline model (per 1M tokens)',
        cells: {
          'claude-api': {
            value: '$5 input · $25 output (Opus 4.7)',
            note: 'Sonnet 4.6: $3/$15; Haiku 4.5: $1/$5',
            sourceRefs: ['ant-pricing'],
          },
          'gemini-api': {
            value: '$1.25 input · $10 output (Gemini 2.5 Pro ≤200k context)',
            note: '$2.50/$15 for >200k context; Flash much cheaper ($0.30/$2.50)',
            sourceRefs: ['gem-pricing'],
          },
          'foundry': {
            value: 'Pay-as-you-go per token (specific values JS-rendered on pricing page)',
            note: 'Platform itself is free; pay only at deployment level; 3 tiers: Global · Data Zone · Regional',
            sourceRefs: ['fdy-pricing'],
          },
        },
      },
      {
        key: 'cached-input',
        label: 'Cached input',
        cells: {
          'claude-api': {
            value: 'Prompt caching ($0.50 read for Opus 4.7); 5-min TTL default, 1-hr extended',
            note: 'Cache reads typically do NOT count toward ITPM rate limits — material throughput multiplier',
            sourceRefs: ['ant-pricing'],
          },
          'gemini-api': {
            value: 'Context caching — serving fee + storage fee/hour',
            note: '2.5 Flash-Lite: $0.01/MTok serve + $1.00/MTok/hr storage. 2.5 Flash: $0.03/MTok serve + $1.00/MTok/hr storage (as of May 2026 — verify before committing). 2.5 Pro: $0.125-$0.25 serve + $4.50/MTok/hr storage.',
            sourceRefs: ['gem-pricing'],
          },
          'foundry': {
            value: 'Yes for Azure-direct GPT models (specific values JS-rendered)',
            note: 'Claude in Foundry uses Anthropic\'s cache pricing',
            sourceRefs: ['fdy-pricing'],
          },
        },
      },
      {
        key: 'batch-discount',
        label: 'Batch API discount',
        cells: {
          'claude-api':  { value: '50% off', note: 'Message Batches API; extended output beta to 300k tokens', sourceRefs: ['ant-getting-started'] },
          'gemini-api':  { value: '50% off Standard', note: '100 concurrent jobs; 2GB input / 20GB total; 24-hour return', sourceRefs: ['gem-rate'] },
          'foundry':     { value: '50% off Global Standard', note: 'Select models; PTU (provisioned throughput) is the other reserved-pricing option', sourceRefs: ['fdy-pricing'] },
        },
      },
      {
        key: 'modalities',
        label: 'Input modalities',
        cells: {
          'claude-api': {
            value: 'Text · Vision (image input GA)',
            note: 'No audio or video input today; extended thinking GA',
            sourceRefs: ['ant-models'],
          },
          'gemini-api': {
            value: 'Text · Vision · Audio · Video (all GA)',
            note: 'Plus real-time bidirectional audio/video via Live API',
            sourceRefs: ['gem-models'],
          },
          'foundry': {
            value: 'Text · Vision · Audio (GPT-4o audio family)',
            note: 'GPT-5 series native input is text + image only (per Azure models docs). Sora-2 is video generation/output, not input. For video input, route to Gemini models via the Foundry catalogue or use Azure Video Indexer separately. Computer use is GA via computer-use-preview on Responses API.',
            sourceRefs: ['fdy-models'],
          },
        },
      },
    ],
  },
  'm365-extensibility-paths': {
    title: 'M365 extensibility paths',
    intro: 'Three practical paths to build for M365 Copilot — Copilot Studio (low-code SaaS), Declarative Agents (manifest, runs on Microsoft\'s orchestrator), and Custom Engine Agents (BYO orchestrator + model, built with ATK or the M365 Agents SDK). Note that Microsoft\'s own canonical decision guide splits this two ways (Declarative vs Custom Engine), with Copilot Studio listed as a builder tool for both — see the page intro for the honest framing.',
    tools: ['copilot-studio', 'declarative-agents', 'custom-engine-agents'],
    sources: {
      'ms-decision':     'https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/decision-guide',
      'ms-da-overview':  'https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/overview-declarative-agent',
      'ms-cea-overview': 'https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/overview-custom-engine-agent',
      'ms-cps-what':     'https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-what-is-copilot-studio',
      'ms-cps-billing':  'https://learn.microsoft.com/en-us/microsoft-copilot-studio/billing-licensing',
      'ms-cps-channels': 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/publication-fundamentals-publish-channels',
      'ms-da-manifest':  'https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/declarative-agent-manifest-1.7',
      'ms-cps-mcp':      'https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent',
      'ms-cps-whatsnew': 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/whats-new',
      'ms-cost':         'https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/cost-considerations',
      'ms-atk-changelog':'https://github.com/OfficeDev/microsoft-365-agents-toolkit/blob/main/packages/vscode-extension/CHANGELOG.md',
      'ms-atk-fund':     'https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/agents-toolkit-fundamentals',
    },
    rows: [
      {
        key: 'ms-taxonomy',
        label: 'Microsoft\'s canonical taxonomy',
        sourceRefs: ['ms-decision'],
        cells: {
          'copilot-studio': {
            value: 'Builder tool for either path',
            note: 'Produces a Declarative Agent (M365 orchestrator) or a standalone agent (Copilot Studio orchestrator) depending on mode',
          },
          'declarative-agents': {
            value: 'Declarative agents',
            note: 'One of Microsoft\'s two canonical approaches',
          },
          'custom-engine-agents': {
            value: 'Custom engine agents',
            note: 'The other canonical approach; ATK is the primary pro-code tool',
          },
        },
      },
      {
        key: 'authoring',
        label: 'Authoring shape',
        cells: {
          'copilot-studio':       { value: 'Low-code (graphical SaaS)',  note: 'Also natural-language no-code builder; advanced config for pro users', sourceRefs: ['ms-cps-what'] },
          'declarative-agents':   { value: 'Low-code or pro-code',       note: 'Copilot Studio or M365 Copilot agent builder (low-code); ATK or VS Code (pro-code)', sourceRefs: ['ms-da-overview'] },
          'custom-engine-agents': { value: 'Pro-code (primarily)',       note: 'M365 Agents Toolkit + Agents SDK (C# · JS · Python); Copilot Studio is the low-code sub-path', sourceRefs: ['ms-cea-overview'] },
        },
      },
      {
        key: 'orchestrator',
        label: 'Orchestrator runtime',
        cells: {
          'copilot-studio': {
            value: 'Copilot Studio orchestrator (standalone) or M365 Copilot orchestrator (DA mode)',
            sourceRefs: ['ms-cps-what'],
          },
          'declarative-agents': {
            value: 'M365 Copilot orchestrator (always)',
            note: 'No extra AI hosting needed — Microsoft hosts',
            sourceRefs: ['ms-decision', 'ms-da-overview'],
          },
          'custom-engine-agents': {
            value: 'Bring your own',
            note: 'Semantic Kernel · LangChain · Azure Bot Service · Azure AI Foundry — your choice',
            sourceRefs: ['ms-cea-overview'],
          },
        },
      },
      {
        key: 'end-user-license',
        label: 'End-user M365 Copilot licence',
        sourceRefs: ['ms-cost'],
        cells: {
          'copilot-studio': {
            value: 'Not required for standalone agents',
            note: 'Standalone agents bill in Copilot Credits to the tenant',
          },
          'declarative-agents': {
            value: 'Required (except web-search-only or instruction-only)',
            note: 'Per Microsoft cost-considerations: instruction-only and web-search-only agents are exempt — accessible via Copilot Chat at no extra cost. Other capabilities need M365 Copilot licence or tenant pay-as-you-go for shared tenant data.',
            sourceRefs: ['ms-cost', 'ms-da-manifest'],
          },
          'custom-engine-agents': {
            value: 'Not required',
            note: 'Custom engine agents in M365 Copilot Chat are free for unlicensed users; Copilot Credits apply if they access shared tenant data',
          },
        },
      },
      {
        key: 'builder-cost',
        label: 'Builder cost / licence',
        sourceRefs: ['ms-cps-billing'],
        cells: {
          'copilot-studio': {
            value: 'Free Copilot Studio user licence + Copilot Credits capacity',
            note: 'Per-message billing retired Sep 1 2025; current model is Copilot Credits',
          },
          'declarative-agents': {
            value: 'ATK is free; M365 Copilot tenant needed for testing',
            note: 'TAP sandbox or eligible M365 Copilot production tenant',
          },
          'custom-engine-agents': {
            value: 'ATK is free; hosting billed separately',
            note: 'Azure AI Foundry, App Service, Bot Service all billed independently',
          },
        },
      },
      {
        key: 'channels',
        label: 'Channels available',
        cells: {
          'copilot-studio': {
            value: '15+ channels',
            note: 'Microsoft channels (Teams · M365 Copilot · SharePoint · custom website · mobile) plus Azure Bot Service channels (WhatsApp · Facebook · Slack · Telegram · others). See sourced list.',
            sourceRefs: ['ms-cps-channels'],
          },
          'declarative-agents': {
            value: 'M365 only',
            note: 'Copilot Chat · Teams · Word · Excel · Outlook · PowerPoint. No external channels.',
            sourceRefs: ['ms-decision'],
          },
          'custom-engine-agents': {
            value: 'M365 + external apps + Azure Bot Service channels',
            note: 'Also supports proactive (agent-initiated) messaging and agent-to-agent (A2A) collaboration',
            sourceRefs: ['ms-cea-overview'],
          },
        },
      },
      {
        key: 'tool-palette',
        label: 'Tool palette',
        cells: {
          'copilot-studio': {
            value: 'Built-in + 600+ Power Platform connectors + custom REST/OpenAPI + MCP',
            note: 'Code interpreter (GA Aug 2025), Computer Use (preview), Work IQ (preview Mar 2026), model picker incl. GPT-5 + Claude Sonnet 4.5/4.6',
            sourceRefs: ['ms-cps-whatsnew'],
          },
          'declarative-agents': {
            value: 'Capability set defined in v1.7 manifest',
            note: 'v1.7: web search · OneDrive/SharePoint · Copilot connectors · code interpreter · embedded knowledge · API plugins (1-10/agent) · worker agents — see manifest docs for full list',
            sourceRefs: ['ms-da-manifest'],
          },
          'custom-engine-agents': {
            value: 'Any — orchestrator can call any API, tool, or model',
            note: 'M365 data via Microsoft Graph; Azure AI Foundry agents integratable via ATK template',
            sourceRefs: ['ms-cea-overview'],
          },
        },
      },
      {
        key: 'mcp',
        label: 'MCP support',
        cells: {
          'copilot-studio': {
            value: 'Client — GA (August 2025)',
            note: 'Connect to existing MCP servers via guided UI; Streamable HTTP transport (SSE deprecated after Aug 2025)',
            sourceRefs: ['ms-cps-mcp', 'ms-cps-whatsnew'],
          },
          'declarative-agents': {
            value: 'Via ATK CLI scaffolding — GA in ATK 6.8.0 (Apr 17 2026)',
            note: '`atk add action --api-plugin-type mcp` CLI command added in 6.8.0. MCP integration for DAs was in preview in ATK 6.4.0 (Nov 14 2025) and went GA in ATK 6.6.0 (Mar 9 2026).',
            sourceRefs: ['ms-atk-changelog'],
          },
          'custom-engine-agents': {
            value: 'Client — via your orchestrator',
            note: 'Use the open MCP SDKs (github.com/modelcontextprotocol) inside your orchestrator code',
            sourceRefs: ['ms-cea-overview'],
          },
        },
      },
      {
        key: 'appsource',
        label: 'AppSource publishing',
        cells: {
          'copilot-studio':       { value: 'Tenant catalogue only',  note: 'Standalone Copilot Studio agents publish to the tenant catalogue; commercial AppSource path requires DA-mode authoring via ATK', sourceRefs: ['ms-cps-what'] },
          'declarative-agents':   { value: 'Yes',  note: 'Packaged as a Teams app; published via Teams Developer Portal', sourceRefs: ['ms-da-overview'] },
          'custom-engine-agents': { value: 'Yes (via Teams SDK · Agents SDK · Foundry-via-ATK)',  note: 'Copilot Studio standalone agents are tenant-catalogue-only; commercial AppSource requires the pro-code paths above', sourceRefs: ['ms-cea-overview'] },
        },
      },
      {
        key: 'best-for',
        label: 'Best for',
        sourceRefs: ['ms-decision'],
        cells: {
          'copilot-studio': {
            value: 'Quick low-code multi-channel agents on managed infra',
            note: 'Especially: ISVs and enterprises wanting WhatsApp/Teams/web simultaneously without standing up infrastructure',
          },
          'declarative-agents': {
            value: 'M365-focused agents that inherit MS compliance + foundation models',
            note: 'When you don\'t need external channels or custom orchestration; M365 Copilot does the heavy lifting',
          },
          'custom-engine-agents': {
            value: 'Custom orchestration · choice of model · external channels · proactive flows',
            note: 'When you have specific orchestration, channel, or model requirements that the managed paths can\'t meet',
          },
        },
      },
    ],
  },
  'cli-coding-agents': {
    title: 'CLI coding agents',
    intro: 'Four shell-native AI coding CLIs that run in your terminal, edit files, run commands, and talk to MCP servers. They look similar from a distance and diverge fast once you actually use them. This is the "which fits which job" cut — not a benchmark.',
    tools: ['claude-code', 'codex-cli', 'gemini-cli', 'copilot-cli'],
    sources: {
      'cc-readme':       'https://github.com/anthropics/claude-code',
      'cc-pricing':      'https://claude.com/pricing',
      'cc-auth':         'https://code.claude.com/docs/en/authentication',
      'cc-perms':        'https://code.claude.com/docs/en/permission-modes',
      'cc-mcp':          'https://code.claude.com/docs/en/mcp',
      'codex-readme':    'https://github.com/openai/codex',
      'codex-docs':      'https://developers.openai.com/codex',
      'codex-auth':      'https://developers.openai.com/codex/auth',
      'codex-sandbox':   'https://developers.openai.com/codex/sandbox',
      'gemini-readme':   'https://github.com/google-gemini/gemini-cli',
      'gemini-config':   'https://www.geminicli.com/docs/reference/configuration',
      'gemini-sandbox':  'https://www.geminicli.com/docs/cli/sandbox',
      'gemini-trusted':  'https://www.geminicli.com/docs/cli/trusted-folders',
      'copilot-readme':  'https://github.com/github/copilot-cli',
      'copilot-changelog': 'https://github.com/github/copilot-cli/blob/main/changelog.md',
      'copilot-docs':    'https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli',
      'copilot-deprecation': 'https://github.com/github/gh-copilot',
    },
    rows: [
      {
        key: 'install',
        label: 'Install (recommended)',
        cells: {
          'claude-code': {
            value: 'curl -fsSL https://claude.ai/install.sh | bash',
            note: 'npm install deprecated; brew + WinGet + PowerShell installer also supported',
            sourceRefs: ['cc-readme'],
          },
          'codex-cli': {
            value: 'npm install -g @openai/codex',
            note: 'brew install --cask codex or binary release also supported',
            sourceRefs: ['codex-readme'],
          },
          'gemini-cli': {
            value: 'npm install -g @google/gemini-cli',
            note: 'brew install gemini-cli or npx (no install) also supported',
            sourceRefs: ['gemini-readme'],
          },
          'copilot-cli': {
            value: 'curl -fsSL https://gh.io/copilot-install | bash',
            note: 'Renamed from gh-copilot (deprecated Oct 2025) to standalone copilot-cli; brew/winget/npm also supported',
            sourceRefs: ['copilot-readme', 'copilot-deprecation'],
          },
        },
      },
      {
        key: 'auth',
        label: 'Auth',
        cells: {
          'claude-code': {
            value: 'Subscription OAuth (Pro/Max/Team/Enterprise) or API key',
            note: 'Also: Bedrock, Vertex, Foundry env vars; OAuth tokens; apiKeyHelper for rotating creds',
            sourceRefs: ['cc-auth'],
          },
          'codex-cli': {
            value: 'Sign in with ChatGPT (Plus/Pro/Business/Edu/Enterprise) or API key',
            note: 'Also: device code (beta), enterprise access tokens, custom model providers',
            sourceRefs: ['codex-auth'],
          },
          'gemini-cli': {
            value: 'Personal Google OAuth, Gemini API key, or Vertex AI',
            note: 'OAuth path has no API key — just run `gemini`',
            sourceRefs: ['gemini-readme'],
          },
          'copilot-cli': {
            value: 'GitHub OAuth (browser /login) or fine-grained PAT with Copilot Requests scope',
            note: 'Subject to org/enterprise Copilot policy',
            sourceRefs: ['copilot-readme'],
          },
        },
      },
      {
        key: 'free-tier',
        label: 'Free tier',
        cells: {
          'claude-code': {
            value: 'None — paid plan required',
            note: 'Pro from $17/mo billed annually ($20/mo monthly); or pay-per-token via Anthropic API',
            sourceRefs: ['cc-pricing'],
          },
          'codex-cli': {
            value: 'None — ChatGPT Plus or API key required',
            note: 'The old $5 trial credit no longer exists in current docs',
            sourceRefs: ['codex-auth'],
          },
          'gemini-cli': {
            value: '1,000 req/day on personal Google OAuth (60 req/min cap) or AI Studio API key',
            note: 'Both free-tier paths give the same daily cap; OAuth uses no API key, AI Studio key gives model-selection control',
            sourceRefs: ['gemini-readme'],
          },
          'copilot-cli': {
            value: 'Available with GitHub Copilot Free (limited premium requests)',
            note: 'Each prompt counts against the plan\'s monthly premium-request quota',
            sourceRefs: ['copilot-readme', 'copilot-docs'],
          },
        },
      },
      {
        key: 'mcp',
        label: 'MCP support',
        cells: {
          'claude-code': {
            value: 'Client (stdio · SSE · streamable-HTTP)',
            note: 'Project-scoped `.mcp.json` + user-scoped `~/.claude.json`; not exposed as an MCP server itself',
            sourceRefs: ['cc-mcp'],
          },
          'codex-cli': {
            value: 'Client (stdio); built-in MCPs as first-class runtime servers (v0.130.0+)',
            note: 'Destructive MCP tool calls always require approval',
            sourceRefs: ['codex-readme'],
          },
          'gemini-cli': {
            value: 'Client (stdio · SSE · streamable-HTTP)',
            note: 'Configure in `~/.gemini/settings.json`; resource tools added v0.40.0; OAuth-aware',
            sourceRefs: ['gemini-readme'],
          },
          'copilot-cli': {
            value: 'Client (stdio); ships with GitHub\'s MCP server by default',
            note: 'Custom servers via /mcp; OAuth client-credentials grant for headless auth; experimental MCP Tasks',
            sourceRefs: ['copilot-readme', 'copilot-changelog'],
          },
        },
      },
      {
        key: 'sandbox',
        label: 'Sandboxing',
        cells: {
          'claude-code': {
            value: 'Permission modes (no container/VM)',
            note: 'default · acceptEdits · plan · auto · dontAsk · bypassPermissions; protected: .git, .claude/',
            sourceRefs: ['cc-perms'],
          },
          'codex-cli': {
            value: 'OS-enforced sandbox: workspace-write · read-only · danger-full-access',
            note: 'Network off by default; web search cached/live/disabled; auto_review checks data exfiltration',
            sourceRefs: ['codex-sandbox'],
          },
          'gemini-cli': {
            value: 'Opt-in sandbox: macOS Seatbelt · Docker/Podman · Windows Native · gVisor · LXC',
            note: 'Disabled by default; enable via `-s` flag or `GEMINI_SANDBOX` env var',
            sourceRefs: ['gemini-sandbox'],
          },
          'copilot-cli': {
            value: 'Trust + per-tool approval (no container)',
            note: 'Per-directory trust; --allow-tool · --deny-tool · --allow-all-tools; read-only `gh` cmds auto-approved',
            sourceRefs: ['copilot-readme', 'copilot-changelog'],
          },
        },
      },
      {
        key: 'plan-mode',
        label: 'Plan mode',
        cells: {
          'claude-code': {
            value: 'First-class — Shift+Tab cycles default → acceptEdits → plan',
            note: 'Also /plan prefix, --permission-mode plan, or settings default',
            sourceRefs: ['cc-perms'],
          },
          'codex-cli': {
            value: 'No dedicated plan mode',
            note: 'Closest: --sandbox read-only --ask-for-approval on-request',
            sourceRefs: ['codex-sandbox'],
          },
          'gemini-cli': {
            value: 'First-class plan mode (enabled by default)',
            note: 'Routes Pro for planning + Flash for implementation; --yolo flag bypasses (CLI-only)',
            sourceRefs: ['gemini-config'],
          },
          'copilot-cli': {
            value: 'First-class — Shift+Tab cycles ask/execute → plan',
            note: 'Plus experimental Autopilot mode via /autopilot or Shift+Tab cycle',
            sourceRefs: ['copilot-docs', 'copilot-changelog'],
          },
        },
      },
      {
        key: 'trusted-folder',
        label: 'Trusted folder behaviour',
        cells: {
          'claude-code': {
            value: 'No folder-trust dialog',
            note: 'Uses permission rules + per-project MCP server approval instead',
            sourceRefs: ['cc-perms'],
          },
          'codex-cli': {
            value: 'Detects version-control state; recommends Auto for git repos',
            note: 'Read-only mode recommended for non-VC folders; no formal trusted-folders file',
            sourceRefs: ['codex-sandbox'],
          },
          'gemini-cli': {
            value: 'Off by default; opt in via settings.json',
            note: 'When enabled: first-run dialog; untrusted runs in safe mode (no MCP, no extensions, no .env)',
            sourceRefs: ['gemini-trusted'],
          },
          'copilot-cli': {
            value: 'Prompted on first use per directory',
            note: 'Choose session-only · remember this folder · exit; persistent across sessions since v1.0.37',
            sourceRefs: ['copilot-readme'],
          },
        },
      },
      {
        key: 'default-model',
        label: 'Default model',
        cells: {
          'claude-code': {
            value: 'Claude Sonnet 4.6 (auto-mode uses Opus 4.7 on eligible plans)',
            note: 'Fast-mode default bumped to Opus 4.7 in 2.1.142 (CLAUDE_CODE_OPUS_4_6_FAST_MODE_OVERRIDE=1 pins back to 4.6); switch via /model · --model · ANTHROPIC_MODEL env',
            sourceRefs: ['cc-auth'],
          },
          'codex-cli': {
            value: 'gpt-5.5 (recommended); gpt-5.4 (alt high-end); gpt-5.4-mini (fast); gpt-5.3-codex (coding specialist)',
            note: 'Also gpt-5.3-codex-spark research preview (Pro subs only). Switch via /model · -m flag · config.toml',
            sourceRefs: ['codex-docs'],
          },
          'gemini-cli': {
            value: 'gemini-2.5-pro (stable channel); gemini-3-pro-preview (preview channel)',
            note: 'Per Gemini CLI docs: Auto (Gemini 3) routes between gemini-3-pro-preview and gemini-3-flash-preview; on the API side, gemini-3-pro-preview redirects to gemini-3.1-pro-preview since 2026-03-09. Gemma 4 also enabled by default via Gemini API since v0.42.0; plan mode auto-routes Pro for planning, Flash for implementation',
            sourceRefs: ['gemini-readme'],
          },
          'copilot-cli': {
            value: 'Claude Sonnet 4.5 (per README)',
            note: 'Also GPT-5 and others via /model picker; default subject to change',
            sourceRefs: ['copilot-readme'],
          },
        },
      },
      {
        key: 'os-support',
        label: 'OS support',
        cells: {
          'claude-code':  { value: 'macOS · Linux · Windows native (+ WSL)', sourceRefs: ['cc-readme'] },
          'codex-cli':    { value: 'macOS · Linux · Windows', sourceRefs: ['codex-readme'] },
          'gemini-cli':   { value: 'macOS · Linux · Windows (incl. Windows Native Sandbox)', sourceRefs: ['gemini-sandbox'] },
          'copilot-cli':  { value: 'macOS · Linux · Windows (PowerShell 6+) + WSL', sourceRefs: ['copilot-readme'] },
        },
      },
    ],
  },
  'hosted-agent-platforms': {
    title: 'Agent platforms — managed runtimes and open frameworks',
    intro: 'Four cross-vendor agent platforms a production builder picks between when deciding where the agent loop runs. Three are managed runtimes (Microsoft and Google host the compute); OpenAI Agents SDK is an open framework you host yourself, with hosted tools and the model API delegated to OpenAI. This is the "who runs your agent" cut — not a model-quality benchmark.',
    tools: ['foundry-agent-service', 'vertex-ai-agents', 'openai-agents-sdk', 'copilot-studio'],
    sources: {
      // Microsoft Foundry Agent Service
      'fdy-agent-overview':  'https://learn.microsoft.com/azure/ai-foundry/agents/overview',
      'fdy-tool-catalog':    'https://learn.microsoft.com/azure/ai-foundry/agents/concepts/tool-catalog',
      'fdy-hosted-agents':   'https://learn.microsoft.com/azure/ai-foundry/agents/concepts/hosted-agents',
      'fdy-limits':          'https://learn.microsoft.com/azure/ai-foundry/agents/concepts/limits-quotas-regions',
      'fdy-agent-pricing':   'https://azure.microsoft.com/pricing/details/foundry-agent-service/',
      'fdy-ai-foundry-pricing': 'https://azure.microsoft.com/pricing/details/ai-foundry/',
      'fdy-py-sdk':          'https://pypi.org/project/azure-ai-agents/',
      // Google Vertex AI Agents
      'vai-overview':        'https://cloud.google.com/vertex-ai/generative-ai/docs/agent-builder/overview',
      'vai-adk-py':          'https://pypi.org/project/google-adk/',
      'vai-adk-releases':    'https://github.com/google/adk-python/releases',
      'vai-mcp':             'https://google.github.io/adk-docs/tools-custom/mcp-tools/',
      'vai-pricing':         'https://cloud.google.com/products/gemini-enterprise-agent-platform/pricing',
      // OpenAI Agents SDK
      'oai-agents-docs':     'https://openai.github.io/openai-agents-python/',
      'oai-agents-mcp':      'https://openai.github.io/openai-agents-python/mcp/',
      'oai-agents-models':   'https://openai.github.io/openai-agents-python/models/',
      'oai-agents-tracing':  'https://openai.github.io/openai-agents-python/tracing/',
      'oai-agents-pypi':     'https://pypi.org/project/openai-agents/',
      'oai-agents-releases': 'https://github.com/openai/openai-agents-python/releases',
      // Microsoft Copilot Studio
      'cps-what':            'https://learn.microsoft.com/microsoft-copilot-studio/fundamentals-what-is-copilot-studio',
      'cps-billing':         'https://learn.microsoft.com/microsoft-copilot-studio/billing-licensing',
      'cps-mcp':             'https://learn.microsoft.com/microsoft-copilot-studio/agent-extend-action-mcp',
      'cps-channels':        'https://learn.microsoft.com/microsoft-copilot-studio/publication-fundamentals-publish-channels',
      'cps-triggers':        'https://learn.microsoft.com/microsoft-copilot-studio/authoring-triggers-about',
    },
    rows: [
      {
        key: 'hosting-model',
        label: 'Hosting model',
        cells: {
          'foundry-agent-service': {
            value: 'Managed runtime — Microsoft hosts the loop',
            note: '3 modes: Prompt agents (GA, serverless) · Workflow agents (preview) · Hosted agents (preview, container-based, per-session VM-isolated sandboxes). BYO VNet supported for Hosted agents.',
            sourceRefs: ['fdy-agent-overview', 'fdy-hosted-agents'],
          },
          'vertex-ai-agents': {
            value: 'Managed runtime — Cloud Run-based, fully managed',
            note: 'Configurable: min_instances 0-10, max_instances 1-1000, container_concurrency default 9. Cold start ~4.7s with min_instances=1; ~1.4s with min_instances=10.',
            sourceRefs: ['vai-overview'],
          },
          'openai-agents-sdk': {
            value: 'Framework — developer hosts the agent loop',
            note: 'OpenAI hosts only the model + hosted tools (web/code/file search · ComputerTool · HostedMCP). The agent loop logic runs in your Python or Node code wherever you deploy it.',
            sourceRefs: ['oai-agents-docs'],
          },
          'copilot-studio': {
            value: 'Managed runtime — Microsoft hosts on Power Platform',
            note: 'Or publish as a declarative agent to M365 Copilot, which then runs on the M365 Copilot orchestrator instead. Two different runtimes for the same authoring tool.',
            sourceRefs: ['cps-what'],
          },
        },
      },
      {
        key: 'build-surface',
        label: 'Primary build surface',
        cells: {
          'foundry-agent-service': {
            value: 'Python + JS SDK · closed-source',
            note: '`azure-ai-agents` + `@azure/ai-agents`; also `azure-ai-projects` for project management. Agents defined via `PromptAgentDefinition` or a container image (Hosted agents).',
            sourceRefs: ['fdy-py-sdk', 'fdy-tool-catalog'],
          },
          'vertex-ai-agents': {
            value: 'Python + Java + Go SDK · Apache 2.0',
            note: '`google-adk` (Python primary); `@google/adk-web` for the web dev UI only. Code-first `LlmAgent` / `BaseAgent` classes; "Agent Config" YAML option for no-code authoring.',
            sourceRefs: ['vai-adk-py'],
          },
          'openai-agents-sdk': {
            value: 'Python + JS/TS SDK · MIT',
            note: '`openai-agents` + `@openai/agents`. Python class-based: `Agent(name, instructions, tools, mcp_servers, guardrails)` + `Runner.run()`. `@function_tool` decorator for Python functions.',
            sourceRefs: ['oai-agents-pypi', 'oai-agents-docs'],
          },
          'copilot-studio': {
            value: 'Low-code visual canvas — no code SDK',
            note: 'Agent authoring via the maker portal (natural-language description or visual designer). Power Platform CLI + REST APIs exist but are not the primary developer surface.',
            sourceRefs: ['cps-what'],
          },
        },
      },
      {
        key: 'package-release',
        label: 'Current package · release cadence',
        cells: {
          'foundry-agent-service': {
            value: '`azure-ai-agents` on PyPI · tied to Azure platform releases',
            note: 'SDK versioned with `/azure/ai-foundry/` docs. Specific PyPI version listed on the package page; check there before pinning.',
            sourceRefs: ['fdy-py-sdk'],
          },
          'vertex-ai-agents': {
            value: '`google-adk` 1.33.0 (8 May 2026) · weekly–monthly releases',
            note: '2.0.0-beta.1 in parallel (`Workflow(BaseNode)` graph orchestration, `NodeRunner`). Java + Go ADKs released alongside.',
            sourceRefs: ['vai-adk-releases'],
          },
          'openai-agents-sdk': {
            value: '`openai-agents` 0.17.2 (12 May 2026) · weekly–bi-weekly releases',
            note: 'Still on 0.x but positioned as production-ready. Session backends (Redis · MongoDB · SQLite) fixed in 0.17.1.',
            sourceRefs: ['oai-agents-releases'],
          },
          'copilot-studio': {
            value: 'N/A — SaaS release notes only',
            note: 'No installable package. Release notes tracked on `learn.microsoft.com/microsoft-copilot-studio/whats-new`.',
            sourceRefs: ['cps-what'],
          },
        },
      },
      {
        key: 'local-dev',
        label: 'Local dev path',
        cells: {
          'foundry-agent-service': {
            value: 'Yes — agents playground in portal; Hosted agents runnable locally',
            note: 'MCP server integrations testable in the playground via chat. Full local round-trip before deploying.',
            sourceRefs: ['fdy-agent-overview'],
          },
          'vertex-ai-agents': {
            value: 'Yes — `adk web` UI + `adk run` CLI + `adk eval`',
            note: 'Built-in local dev server with tracing and tool inspection. Full local execution before deploying to Agent Runtime.',
            sourceRefs: ['vai-adk-py'],
          },
          'openai-agents-sdk': {
            value: 'Yes — runs anywhere with `OPENAI_API_KEY`',
            note: 'No cloud deploy needed for the SDK itself. Local sandbox via `UnixLocalSandboxClient`. Realtime via WebSocket.',
            sourceRefs: ['oai-agents-docs'],
          },
          'copilot-studio': {
            value: 'No — test panel in portal only',
            note: 'Cannot run an agent outside Copilot Studio infrastructure. "Demo website" is for stakeholder preview, not production.',
            sourceRefs: ['cps-what'],
          },
        },
      },
      {
        key: 'model-surface',
        label: 'Model surface',
        cells: {
          'foundry-agent-service': {
            value: 'Azure OpenAI GPT-5 series + Foundry catalogue (1,900+ models)',
            note: 'Anthropic Claude · xAI Grok · Llama · DeepSeek · Mistral · MAI-DS-R1 · gpt-oss-120b · Phi. Region-pinned — not all models in all regions.',
            sourceRefs: ['fdy-limits'],
          },
          'vertex-ai-agents': {
            value: 'Gemini family primary; ADK is model-agnostic',
            note: 'Claude (with thinking blocks since ADK v1.32.0) · 100+ LLMs via LiteLLM · Apigee LLM (`ApigeeLlm`).',
            sourceRefs: ['vai-adk-py', 'vai-adk-releases'],
          },
          'openai-agents-sdk': {
            value: 'OpenAI Responses API by default (`gpt-5.4-mini` default model)',
            note: '100+ other LLMs via LiteLLM / any-llm extensions. Realtime via `gpt-realtime-2`. Mixing models across one workflow is supported.',
            sourceRefs: ['oai-agents-models'],
          },
          'copilot-studio': {
            value: 'Microsoft-managed Azure OpenAI GPT model',
            note: 'Low-code makers cannot swap models. Pro-code developer path ("Full control") mentions choice of language models; standard experience uses Microsoft\'s managed LLM stack.',
            sourceRefs: ['cps-what'],
          },
        },
      },
      {
        key: 'tool-catalog',
        label: 'Tool catalogue (built-in)',
        cells: {
          'foundry-agent-service': {
            value: 'Web search · Code Interpreter · File Search · Azure AI Search · Azure Functions · function calling',
            note: 'Preview: Custom Code Interpreter · Image Generation · Browser Automation · Computer Use · SharePoint · Microsoft Fabric. Custom: MCP · OpenAPI · A2A.',
            sourceRefs: ['fdy-tool-catalog'],
          },
          'vertex-ai-agents': {
            value: '`google_search` · `code_execution` (sandboxed) · `ComputerUseToolset` · `load_web_page`',
            note: 'BYO via native Python functions · OpenAPI spec tools · A2A protocol agents. Agent Registry catalogues tools + MCP servers org-wide.',
            sourceRefs: ['vai-overview'],
          },
          'openai-agents-sdk': {
            value: '`web_search` · `code_interpreter` · `file_search` · `ComputerTool` · `image_generation`',
            note: 'All hosted tools execute on OpenAI\'s infrastructure via the Responses API. Function tools: any Python function via `@function_tool` or automatic schema generation.',
            sourceRefs: ['oai-agents-models'],
          },
          'copilot-studio': {
            value: 'Power Automate flows · Knowledge sources · 400+ Power Platform connectors · HTTP requests',
            note: 'Topics for scripted flows; generative orchestration for LLM-driven flow. Event triggers via Power Automate connector library (SharePoint, OneDrive, Planner, scheduled, etc.).',
            sourceRefs: ['cps-what', 'cps-triggers'],
          },
        },
      },
      {
        key: 'mcp-support',
        label: 'MCP support',
        cells: {
          'foundry-agent-service': {
            value: 'Client: yes · Server: partial (Toolbox) · Transport: Streamable HTTP only · Status: tool catalogue GA',
            note: 'MCP auth: key · Entra · managed identity · OAuth OBO. Toolbox exposes an MCP-compatible endpoint that any MCP client can consume (not general-purpose server, but the closest equivalent inside Foundry). Docs describe HTTP-based endpoints exclusively; no SSE mention for MCP clients.',
            sourceRefs: ['fdy-agent-overview', 'fdy-tool-catalog'],
          },
          'vertex-ai-agents': {
            value: 'Client: yes · Server: yes · Transport: stdio + SSE · Status: GA since ADK v0.1.0',
            note: 'Most symmetric MCP story of the four — explicit "Exposing ADK Tools via an MCP Server" pattern documented. `McpToolset` for the client side; tool filtering supported.',
            sourceRefs: ['vai-mcp'],
          },
          'openai-agents-sdk': {
            value: 'Client: yes (4 modes) · Server: not documented · Transport: stdio + SSE + Streamable HTTP + HostedMCP · Status: GA in 0.17.x',
            note: '`HostedMCPTool` (OpenAI-side execution) · `MCPServerStreamableHttp` · `MCPServerSse` · `MCPServerStdio`. Tool filtering, caching, approval policies. SDK is consumer of MCP servers, not exposed as one.',
            sourceRefs: ['oai-agents-mcp'],
          },
          'copilot-studio': {
            value: 'Client: yes · Server: partial (connector publishing) · Transport: Streamable HTTP only · Status: GA (Aug 2025)',
            note: 'Tools ✓ · Resources ✓ · Prompts ✗. SSE transport dropped after Aug 2025. No stdio (cloud-hosted SaaS, so local-process MCP is meaningless). MCP servers surfaced as Power Platform custom connectors; publish-for-cross-tenant supported.',
            sourceRefs: ['cps-mcp'],
          },
        },
      },
      {
        key: 'state-sessions',
        label: 'State · sessions',
        cells: {
          'foundry-agent-service': {
            value: 'Threads + Runs (prompt agents) · Conversations + Sessions (Hosted agents)',
            note: 'Up to 100K msgs/thread. Hosted agent `$HOME` filesystem persisted across idle periods; new compute provisioned on resume with state restored.',
            sourceRefs: ['fdy-hosted-agents', 'fdy-limits'],
          },
          'vertex-ai-agents': {
            value: 'Session rewind available in ADK; initial-state preservation fixed in v1.32.0',
            note: 'Sessions persisted automatically when using the managed `VertexAiSessionService`; `InMemorySessionService` for local dev.',
            sourceRefs: ['vai-adk-releases'],
          },
          'openai-agents-sdk': {
            value: 'Session abstraction · backends: in-memory · SQLite · Redis · MongoDB',
            note: 'Or use the OpenAI Responses API with `openai-conversations` session type for server-side conversation management. In-memory backend is the default; not persisted.',
            sourceRefs: ['oai-agents-releases', 'oai-agents-docs'],
          },
          'copilot-studio': {
            value: 'Per-conversation state · topic variables · 30 min inactivity timeout',
            note: 'In-session state is automatic. No built-in cross-session long-term memory; BYO via Dataverse or SharePoint knowledge sources.',
            sourceRefs: ['cps-what'],
          },
        },
      },
      {
        key: 'memory',
        label: 'Long-term memory',
        cells: {
          'foundry-agent-service': {
            value: 'No dedicated long-term memory service',
            note: 'BYO via File Search (vector stores) or Azure AI Search for RAG-style retrieval. Conversation history auto-persists; cross-session memory is not a first-class primitive.',
            sourceRefs: ['fdy-agent-overview'],
          },
          'vertex-ai-agents': {
            value: 'Memory Bank — persistent memory across sessions',
            note: 'User preferences and facts stored per-agent. $0.25 per 1,000 memories per month (storage) · $0.50 per 1,000 memories returned (retrieval; first 1,000/month free). The most fully-baked long-term memory primitive of the four.',
            sourceRefs: ['vai-overview', 'vai-pricing'],
          },
          'openai-agents-sdk': {
            value: 'No dedicated long-term memory in the SDK',
            note: 'BYO via vector stores or databases. Sessions cover working memory within a run; cross-session memory is the developer\'s responsibility.',
            sourceRefs: ['oai-agents-docs'],
          },
          'copilot-studio': {
            value: 'No dedicated memory primitive',
            note: 'Knowledge sources (grounded RAG over SharePoint · uploaded files · web) partially substitute. No agent-specific user memory.',
            sourceRefs: ['cps-what'],
          },
        },
      },
      {
        key: 'tracing',
        label: 'Tracing · observability',
        cells: {
          'foundry-agent-service': {
            value: 'End-to-end tracing → Foundry portal + Application Insights',
            note: 'OpenTelemetry integration for Hosted agents. Every model call, tool invocation, and decision traced. Application Insights connection string auto-injected.',
            sourceRefs: ['fdy-hosted-agents', 'fdy-agent-overview'],
          },
          'vertex-ai-agents': {
            value: 'OpenTelemetry + Cloud Trace → GCP Console Unified Trace Viewer',
            note: 'Native OTel agentic metrics added in ADK v1.32.0. `adk web` for local trace inspection. Cloud Logging + Cloud Monitoring integrations.',
            sourceRefs: ['vai-adk-releases', 'vai-overview'],
          },
          'openai-agents-sdk': {
            value: 'Automatic tracing → `platform.openai.com/traces`',
            note: 'Every `Runner.run()` wrapped in a `trace()`. Custom processors for OTel · Langfuse · Logfire. Unavailable under OpenAI Zero Data Retention policy.',
            sourceRefs: ['oai-agents-tracing'],
          },
          'copilot-studio': {
            value: 'Activity map (step-by-step) → Copilot Studio Analytics dashboard',
            note: 'Export to Application Insights · Microsoft Purview audit logs · Microsoft Sentinel for admin monitoring + alerts.',
            sourceRefs: ['cps-what'],
          },
        },
      },
      {
        key: 'identity',
        label: 'Identity · auth',
        cells: {
          'foundry-agent-service': {
            value: 'Microsoft Entra ID (`DefaultAzureCredential`) · per-agent Entra identity',
            note: 'OBO passthrough for user-level identity to downstream services. RBAC: Foundry User · Foundry Owner roles. End users auth via Entra automatically through Teams · M365 Copilot · Power Apps.',
            sourceRefs: ['fdy-py-sdk', 'fdy-hosted-agents'],
          },
          'vertex-ai-agents': {
            value: 'GCP IAM service accounts · per-agent Agent Identity',
            note: 'End-user: API keys · 2LO/3LO OAuth · IAM conditions on sessions. Agent Gateway as the central policy enforcement point for tool calls.',
            sourceRefs: ['vai-adk-releases', 'vai-overview'],
          },
          'openai-agents-sdk': {
            value: 'OpenAI API key (`OPENAI_API_KEY` env var)',
            note: 'No managed identity concept — developer holds and rotates the key. End-user auth is the developer\'s responsibility; the SDK doesn\'t define a layer for it.',
            sourceRefs: ['oai-agents-docs'],
          },
          'copilot-studio': {
            value: 'Microsoft Entra ID (Power Platform identity)',
            note: 'End-user: Entra automatic in Teams/M365/Power Apps; "No authentication" option for anonymous access on a public link; certificate auth supported. Event triggers run under the maker\'s credentials.',
            sourceRefs: ['cps-channels', 'cps-triggers'],
          },
        },
      },
      {
        key: 'channels',
        label: 'Channels · consumption',
        cells: {
          'foundry-agent-service': {
            value: 'REST endpoint · Teams · M365 Copilot · Entra Agent Registry · A2A (preview)',
            note: 'OpenResponses and Activity protocols for M365 publishing. Direct API consumption from any OpenAI-compatible SDK acting as a Responses-protocol client.',
            sourceRefs: ['fdy-agent-overview', 'fdy-hosted-agents'],
          },
          'vertex-ai-agents': {
            value: 'REST endpoint · Agent Registry · A2A protocol',
            note: 'Developer-facing API surface. No built-in end-user channels (Teams · Slack · etc.) — you front the REST endpoint with your own app or channel adapter.',
            sourceRefs: ['vai-overview'],
          },
          'openai-agents-sdk': {
            value: 'Developer-managed REST API (BYO deploy: FastAPI · Cloud Run · Azure Functions · Lambda · …)',
            note: 'No vendor channels. Realtime Agents via WebSocket transport. Channel and end-user-auth layer are both the developer\'s responsibility.',
            sourceRefs: ['oai-agents-docs'],
          },
          'copilot-studio': {
            value: 'Teams · M365 Copilot · SharePoint · Direct Line web · WhatsApp · Facebook · Slack · Telegram · Twilio/SMS · Line · Kik · Email · WeChat · Omnichannel for Customer Service',
            note: 'Widest channel surface of the four. Custom website via Direct Line API (iframe or custom UI). Teams app store distribution. Mobile via Direct Line.',
            sourceRefs: ['cps-channels'],
          },
        },
      },
      {
        key: 'pricing-model',
        label: 'Pricing model',
        cells: {
          'foundry-agent-service': {
            value: 'No platform fee; pay for model tokens + agent compute + tools + Azure infra',
            note: 'Hosted agents: vCPU/hour + GiB/hour; rates rendered as JavaScript on the pricing page (use the Azure pricing calculator). Microsoft Agent Pre-Purchase Plan for bulk ACUs at 5% / 10% / 15% off (20K / 100K / 500K tiers; documented on the broader Microsoft Foundry pricing page).',
            sourceRefs: ['fdy-agent-pricing', 'fdy-ai-foundry-pricing'],
          },
          'vertex-ai-agents': {
            value: 'Agent Runtime: $0.0864/vCPU-hr · $0.009/GiB-hr · $0.25/1K events · $0.25/1K memories/mo',
            note: 'First 50 vCPU-hours + 100 GiB-hours free per month. Memory Bank retrieval billed separately at $0.50/1,000 memories returned (first 1,000/month free). Gemini API per-token billing separate. Two published scenarios: Lightweight (0.16 QPS) ~$595/mo · Standard (10 QPS) $43K+/mo — at scale, sessions dominate compute. Re-verify; Agent Runtime billing has restructured during 2025–2026.',
            sourceRefs: ['vai-pricing'],
          },
          'openai-agents-sdk': {
            value: 'SDK free (MIT); pay for your own hosting + OpenAI API per-token + hosted-tool charges',
            note: 'Hosted tools (web_search · code_interpreter · file_search · HostedMCP) billed via the OpenAI API. Hosting cost depends entirely on where you run the agent.',
            sourceRefs: ['oai-agents-docs'],
          },
          'copilot-studio': {
            value: 'Copilot Credits (PAYG via Azure or 1-year prepaid pack)',
            note: 'M365 Copilot licensed users (B2E, agent runs under user\'s identity): ALL meters zero-rated with fair-use limits. Standalone agents: per-event credits, complexity-dependent. 125% overage triggers enforcement at next attempt.',
            sourceRefs: ['cps-billing'],
          },
        },
      },
      {
        key: 'ga-status',
        label: 'GA status',
        cells: {
          'foundry-agent-service': {
            value: 'Core (prompt agents) + tool catalogue framework GA · Hosted agents preview · Workflow agents preview',
            note: 'Some individual tools preview: Image Generation · Browser Automation · Computer Use · SharePoint · Microsoft Fabric · A2A.',
            sourceRefs: ['fdy-limits', 'fdy-tool-catalog'],
          },
          'vertex-ai-agents': {
            value: 'ADK + Agent Runtime + Memory Bank + Agent Gateway GA',
            note: 'ADK v1.33.0 stable; 2.0.0-beta.1 in parallel (workflow graph orchestration). Some preview models in the Gemini 3.x family.',
            sourceRefs: ['vai-overview', 'vai-adk-releases'],
          },
          'openai-agents-sdk': {
            value: 'Production-ready in 0.17.x (still on 0.x versioning)',
            note: 'OpenAI positions the Assistants API as legacy in favor of Responses API + Agents SDK. No hard Assistants shutdown date verifiable from canonical docs as of 16 May 2026.',
            sourceRefs: ['oai-agents-docs', 'oai-agents-models'],
          },
          'copilot-studio': {
            value: 'Core + MCP support + classic + generative answers GA · Agent flows (new format) preview',
            note: 'Copilot Studio for Teams app for classic chatbots: end-of-life June 2026.',
            sourceRefs: ['cps-what'],
          },
        },
      },
    ],
  },
};

/**
 * Build-time validator — throws on the first invariant violation. Astro build
 * fails loudly with the message; readers never see a silently-broken matrix.
 */
function validateComparisons(map: Record<string, Comparison>): void {
  const knownTools = new Set(Object.keys(toolRegistry));
  for (const [slug, c] of Object.entries(map)) {
    if (!c.title) throw new Error(`comparisons["${slug}"]: title is required`);
    if (!c.intro) throw new Error(`comparisons["${slug}"]: intro is required`);
    if (!Array.isArray(c.tools) || c.tools.length < 2) {
      throw new Error(`comparisons["${slug}"]: tools array must have ≥2 entries`);
    }
    if (!Array.isArray(c.rows) || c.rows.length < 1) {
      throw new Error(`comparisons["${slug}"]: rows array must have ≥1 entry`);
    }

    // Every tool key must exist in the registry.
    for (const t of c.tools) {
      if (!knownTools.has(t)) {
        throw new Error(`comparisons["${slug}"]: tool key "${t}" not found in toolRegistry. Add to src/data/toolRegistry.ts first.`);
      }
    }

    // No duplicate tool keys within the same comparison.
    const seenTools = new Set<string>();
    for (const t of c.tools) {
      if (seenTools.has(t)) throw new Error(`comparisons["${slug}"]: duplicate tool key "${t}"`);
      seenTools.add(t);
    }

    // No duplicate row keys within the same comparison.
    const seenRowKeys = new Set<string>();
    for (const row of c.rows) {
      if (!row.key) throw new Error(`comparisons["${slug}"]: row missing key`);
      if (!row.label) throw new Error(`comparisons["${slug}"].rows[${row.key}]: label is required`);
      if (seenRowKeys.has(row.key)) {
        throw new Error(`comparisons["${slug}"]: duplicate row key "${row.key}"`);
      }
      seenRowKeys.add(row.key);

      // Every row must have a cell for every listed tool — no silent missing data.
      for (const t of c.tools) {
        const cell = row.cells[t];
        if (!cell) {
          throw new Error(`comparisons["${slug}"].rows["${row.key}"]: missing cell for tool "${t}"`);
        }
        if (!cell.value) {
          throw new Error(`comparisons["${slug}"].rows["${row.key}"].cells["${t}"]: value is required`);
        }
        // Per-cell sourceRefs must resolve.
        if (cell.sourceRefs) {
          for (const ref of cell.sourceRefs) {
            if (!c.sources[ref]) {
              throw new Error(`comparisons["${slug}"].rows["${row.key}"].cells["${t}"]: sourceRef "${ref}" not found in sources map`);
            }
          }
        }
      }

      // Per-row sourceRefs must resolve.
      if (row.sourceRefs) {
        for (const ref of row.sourceRefs) {
          if (!c.sources[ref]) {
            throw new Error(`comparisons["${slug}"].rows["${row.key}"]: sourceRef "${ref}" not found in sources map`);
          }
        }
      }
    }

    // Cells for tools NOT in the tools array are forbidden (silent typo guard).
    for (const row of c.rows) {
      for (const cellKey of Object.keys(row.cells)) {
        if (!seenTools.has(cellKey)) {
          throw new Error(`comparisons["${slug}"].rows["${row.key}"]: cell key "${cellKey}" is not in the tools list`);
        }
      }
    }

    // Source URLs must look well-formed.
    for (const [ref, url] of Object.entries(c.sources)) {
      if (!/^https?:\/\//.test(url)) {
        throw new Error(`comparisons["${slug}"].sources["${ref}"]: URL must start with http:// or https://`);
      }
    }
  }
}

validateComparisons(comparisons);

/**
 * Helper: look up a comparison by slug, returning undefined if not found.
 * (ComparisonMatrix component throws on undefined — fail-fast.)
 */
export function getComparison(slug: string): Comparison | undefined {
  return comparisons[slug];
}

/**
 * Helper: resolve a tool key to its registry meta (label + href).
 * Returns undefined for unknown keys (caller decides how to handle).
 */
export function resolveTool(key: string): { label: string; href: string } | undefined {
  return (toolRegistry as Record<string, { label: string; href: string }>)[key];
}
