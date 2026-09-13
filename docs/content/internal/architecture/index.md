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
├── docs/                                              # developer docs (Docusaurus) — see docs/README.md
├── infra/                                             # IaC to (re)create the Azure SWA resource
├── scripts/package-site.sh                            # local build of the exact artifact CI deploys
└── .github/workflows/azure-deploy.yml                 # the one CI/CD pipeline for this whole property
```

## Marketing site

Static HTML/CSS, intentionally no build step, no JS framework. Clean URLs
(`/about` instead of `/about.html`) are handled by
`staticwebapp.config.json` route rewrites — Azure does not do this
automatically, so that file is load-bearing, not optional.

### Design tokens (`tokens/`)

A CSS custom-property design-token system, imported in a fixed order by
`styles.css`: `fonts.css` → `colors.css` → `typography.css` →
`spacing.css` → `effects.css` → `base.css`. Then `site.css` (component/layout
styles) and the docs site's `src/css/custom.css` both consume these tokens
rather than hardcoding values — e.g. `--pan-blue: #0066b3` is the single
source of truth for the brand blue used across both the marketing site and
the docs site's Infima theme overrides.

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

## Developer docs (`docs/`)

Docusaurus, two doc instances (public + internal) sharing one theme. Full
detail in [`docs/README.md`](https://github.com/PanderoseCore/panderose-deploy/tree/main/docs/README.md)
and the ADRs in [Standards & Practices → ADRs](../standards/adrs). Short
version: `content/public/` → served at `/docs/`; `content/internal/` →
`/docs/internal/`, gated; API reference for both is generated from OpenAPI
specs in `docs/specs/` rather than hand-written.

## Deployment pipeline

One Azure Static Web Apps resource, one GitHub Actions workflow
(`.github/workflows/azure-deploy.yml`), triggered on push to `main` and on
pull requests (for SWA's automatic PR preview environments):

1. Build the docs site (`docs/`: `npm ci && npm run build:ci`), which
   regenerates API reference from `docs/specs/` and produces
   `docs/build/`.
2. Assemble a `dist/` folder = the repo root's static files (marketing
   site) + `docs/build/` copied to `dist/docs/` — matching the docs site's
   `baseUrl: '/docs/'`.
3. Deploy `dist/` via `Azure/static-web-apps-deploy@v1` using the
   `AZURE_STATIC_WEB_APPS_API_TOKEN` repo secret.

`scripts/package-site.sh` runs the same build+assemble steps locally, for
testing the merged site before pushing.

### DNS / hosting

Cloudflare hosts DNS for `panderose.com`; Azure Static Web Apps hosts the
content and issues its own managed TLS certs. Cloudflare records for the
site should stay **DNS-only (grey cloud)**, not proxied — proxying blocks
Azure's certificate issuance and validation. See `MIGRATION-GUIDE.md` for
the original Proxmox/Cloudflare-Tunnel → Azure migration history (kept for
context; the actual current setup is whatever `infra/` + this page say,
not that guide, if the two ever disagree).

### Security posture

- `staticwebapp.config.json` sets `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, and a long-lived HSTS header
  site-wide.
- `/docs/internal/*` requires the `authenticated` SWA role (any signed-in
  identity, once an identity provider is actually configured on the
  resource — see ADR 0002) and is additionally excluded from
  `robots.txt`/`sitemap.xml` so it isn't indexed even before that gate is
  live.
- No secrets are committed anywhere in this repo. CI references secret
  *names* only (`secrets.AZURE_STATIC_WEB_APPS_API_TOKEN`); the actual
  token lives in the GitHub repo's encrypted secrets store, added by
  whoever has Azure portal access.
