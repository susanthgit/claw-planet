# Claw Planet

A plain-English study reference for the OpenClaw agent runtime. Concepts, setup
paths, connections, plugins, security gotchas, and what's currently changing.
Written for tech-savvy readers in plain English, with every entry declaring
whether it's been verified or only sourced from docs.

**Live at:** https://claw.aguidetocloud.com

**Repo:** https://github.com/susanthgit/claw-planet

**Sister site:** https://agents.aguidetocloud.com (Agentic Planet — cockpit field guide)

---

## Voice rules

This site is written in Sush's voice. Plain English. Honest take. Always
explain with examples · scenarios · comparisons. Always answer "why does
this matter" for important concepts. Quality over speed. No marketing voice.

Voice-lint forbidden words (CI hard-fails on roadmap docs, advisory on public):

`frontier · ecosystem · multimodal · agentic capability · in layman ·
AI-powered · robust · scalable · holistic · synergies · game changer ·
mission-critical · moat · differentiator · SEO magnet · flagship`

See [Claw Planet Playbook](https://learn.aguidetocloud.com/reference/claw-planet-playbook/)
for the full voice guardrails, IA, verification states, and decision log.

---

## Stack

- **Astro 5** + **MDX** + **React islands**
- **Pagefind** for search (built into the build pipeline)
- **Cloudflare Pages** for deployment (custom REST API script — wrangler is
  broken on win32-arm64)
- **Inter** + **JetBrains Mono** via Google Fonts CDN
- **Light + dark modes** via `[data-theme]` attribute with system-preference
  default + localStorage persistence

---

## Local development

```bash
npm install
npm run dev          # http://localhost:4324
```

## Build

```bash
npm run build        # Astro + Pagefind
npm run preview      # serve dist/
```

## Deploy

```bash
npm run deploy       # builds (no Pagefind), then posts to Cloudflare REST API
```

CI auto-deploys on push to `main` via GitHub Actions. The integrity-check
workflow runs on every push and hard-fails on any internal 404 or count
mismatch.

## Quality gates

Run before every push:

```bash
npm run build           # must pass
npm run check:links     # internal 404 detector — hard gate
npm run voice-lint      # forbidden-words check (advisory)
npm run audit:claims    # hero counts match catalog counts
npm run audit:verification  # every applicable page has a verification state
```

Post-deploy:

```bash
npm run smoke           # every prod route returns 200
```

---

## Verification states

Every applicable page (setups, plugins, use cases) carries a visible
verification badge. The discipline is non-negotiable:

| State | Meaning |
|---|---|
| `tested-by-sush` | Sush ran it. Date + version + hardware noted. |
| `tested-by-contributor` | Someone else ran it; PR/issue linked. |
| `sourced-only` | Compiled from docs; we have NOT run it. |
| `planned` | Stub — does NOT appear in top nav until promoted. |

---

## Independence

Claw Planet is an independent guide by Sush. Not affiliated with or endorsed
by OpenClaw, ClawHub, or any plugin author unless explicitly stated. Sush
works at Microsoft — Microsoft makes Azure. We cover Azure where it's a
sensible OpenClaw option; we don't favour it because of who pays the bills.

---

## Licence

MIT for code. CC BY 4.0 for content where applicable.
