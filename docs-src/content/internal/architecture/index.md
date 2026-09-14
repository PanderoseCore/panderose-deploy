---
sidebar_position: 1
title: Repo Architecture
---

# panderose-deploy — repo architecture

Everything currently in this repo, in one place, so nobody has to
reverse-engineer it from the file tree. Internal-only because it
describes live infrastructure/routing — not because any of it is exotic.

## Layout

```
panderose-deploy/
├── index.html, about.html, capabilities.html, ...   # marketing site pages (plain HTML, no build step)
├── styles.css                                        # imports tokens/*.css in order, then site.css
├── site.css                                           # component/layout styles, consumes tokens only
├── tokens/                                            # design-token layer (see below)
├── assets/                                            # images, favicon, logo
├── staticwebapp.config.json                           # Azure SWA routing/headers — read at the app root
├── robots.txt, sitemap.xml
├── docs/                                               # GENERATED — built docs output, served at /docs. Don't hand-edit.
├── docs-src/                                           # Docusaurus SOURCE for docs/ — see docs-src/README.md
├── scripts/package-site.sh                             # rebuilds docs-src/ -> docs/ locally
└── .github/workflows/build-docs.yml                    # builds docs-src/ and commits docs/ on push to main
```

## Marketing site

Static HTML/CSS, intentionally no build step, no JS framework. Clean URLs
(`/about` instead of `/about.html`) are handled by
`staticwebapp.config.json` route rewrites.

### Design tokens (`tokens/`)

A CSS custom-property design-token system, imported in a fixed order by
`styles.css`: `fonts.css` → `colors.css` → `typography.css` →
`spacing.css` → `effects.css` → `base.css`. Then `site.css` (component/layout
styles) and `docs-src/src/css/custom.css` both consume these tokens rather
than hardcoding values — e.g. `--pan-blue: #0066b3` is the single source
of truth for the brand blue used across both the marketing site and the
docs site's Infima theme overrides.

- **Colors** (`tokens/colors.css`): brand blue scale, a dark ("night") and
  light ("paper") neutral scale, ink/bone text-on-surface pairs, hairlines.
- **Typography** (`tokens/typography.css`): Helvetica Neue system stack +
  JetBrains Mono for technical labels, a clamped display scale for
  hero/section heads.
- **Spacing** (`tokens/spacing.css`): 8px base grid.
- **Effects** (`tokens/effects.css`): shadow/blur/motion tokens, used
  sparingly per the brand's "restraint over decoration" direction.
- **Base** (`tokens/base.css`): reset + element defaults wired to the
  tokens above; canvas defaults to the dark theme.

## Developer docs (`docs-src/` → `docs/`)

Docusaurus. **`docs-src/` is the source you edit; `docs/` is generated
output you never touch by hand** — see
[ADR 0003](../standards/adrs/built-output-committed) for why the built
output is committed instead of built downstream. Full detail in
[`docs-src/README.md`](https://github.com/PanderoseCore/panderose-deploy/tree/main/docs-src/README.md).

`content/public/` builds to `/docs/`. `content/internal/` exists as
source but is **not currently compiled into the build** — see
[ADR 0006](../standards/adrs/shared-bundle-leak) and
[`docs-src/PLATFORM-REVIEW.md`](https://github.com/PanderoseCore/panderose-deploy/tree/main/docs-src/PLATFORM-REVIEW.md)
for why, and for the architecture internal docs need before they're
re-enabled. API reference for the public instance is generated from
OpenAPI specs in `docs-src/specs/` rather than hand-written.

## Deploy pipeline

**This repo does not deploy to Azure.** The actual chain is:

```
dev pushes to panderose-deploy (this repo), main branch
        │
        ▼
.github/workflows/build-docs.yml builds docs-src/ → commits docs/
        │
        ▼
someone with approval authority reviews/approves
        │
        ▼
panderose-deploy main is synced into Panderose/panderose-site main
   (mechanism not fully confirmed from this repo — see note below)
        │
        ▼
panderose-site's own Azure-connected GitHub Actions workflow
   (azure_static_web_apps_<hash>.yml, already existing, not authored here)
        │
        ▼
Azure Static Web Apps resource "Panderose" (resource group
Panderose_group) — the same resource for both panderose.com and
panderose.com/docs (see ADR 0002)
```

**Open item:** the exact panderose-deploy → panderose-site sync mechanism
isn't confirmed — a GitHub Actions run in `panderose-site` shows commits
pushed by an actor/service account named `PanderoseCore`, which points at
some automation outside this repo's visibility, not a workflow file
committed here. Whoever owns that sync should document it here once
confirmed. Because it's unconfirmed whether that sync runs a build step,
`panderose-deploy` builds `docs-src/` itself and commits static output to
`docs/` (ADR 0003) rather than assuming the far side will.

### DNS / hosting

Cloudflare hosts DNS for `panderose.com`; Azure Static Web Apps hosts the
content and issues its own managed TLS certs (already provisioned and
live — `panderose.com` shows "Ready" / custom domain complete in the
Azure portal). Cloudflare records for the site should stay **DNS-only
(grey cloud)**, not proxied — proxying blocks Azure's certificate
issuance and validation. `MIGRATION-GUIDE.md` documents the original
Proxmox/Cloudflare-Tunnel → Azure migration history; treat it as
historical context, not a live description of today's pipeline (this page
supersedes it where they'd disagree).

### Security posture

- `staticwebapp.config.json` sets `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, and a long-lived HSTS header
  site-wide.
- `/docs/internal/*` requires the custom `employee` role, not Azure's
  built-in `authenticated` role — `authenticated` is satisfied by anyone
  who completes any zero-config login flow (`/.auth/login/github`, etc.)
  without actually being a Panderose employee. `employee` is invite-only:
  nobody has it until someone with admin access on the Azure resource
  invites them via **Role management** in the portal. Anonymous requests
  to `/docs/internal/*` return 401. Also excluded from
  `robots.txt`/`sitemap.xml` so it isn't indexed regardless.
- No secrets are committed anywhere in this repo. `panderose-deploy`
  holds no Azure deployment token — it can't deploy directly even if a
  workflow here tried to, by design (see ADR 0002's history note).
