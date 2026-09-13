---
sidebar_position: 2
title: "ADR 0001 — Docs platform"
---

# ADR 0001 — Docs platform: Docusaurus vs. alternatives

**Status:** Accepted

## Context

Panderose needs a developer docs site covering (a) public guides/API
reference for anything published externally, and (b) internal engineering
standards, cyber-assessment infra notes, and the Cambium-backed
opportunity/ontology program — self-hosted, deployable through the same
Azure + GitHub + Cloudflare pipeline already used for panderose.com, with
API reference generated from FastAPI services' OpenAPI specs rather than
hand-written.

## Options considered

| Option | Model | Fit |
|---|---|---|
| **Docusaurus** | Self-hosted static site generator (React/MDX), OSS, Meta-maintained | Industry-standard choice for OSS/enterprise dev docs (Redux, Jest, countless others). Versioning, i18n, huge plugin ecosystem, first-class OpenAPI plugin (`docusaurus-plugin-openapi-docs`), plain static output → deploys anywhere, including Azure SWA with zero backend. |
| **Starlight (Astro)** | Self-hosted static site generator | Lighter/faster builds, very clean docs UX out of the box. Smaller plugin ecosystem; OpenAPI generation support is less mature than Docusaurus's as of evaluation. Would've been the pick if build speed or bundle weight were the binding constraint — they aren't at this scale. |
| **Mintlify** | Hosted SaaS | Excellent polish with near-zero setup, but it's a paid third-party platform hosting your docs, not something deployed through your own Azure/GitHub pipeline — wrong fit for "self-owned, in Azure, merged via git branches" and for internal/gated content you don't want living on someone else's SaaS by default. |
| **GitBook** | Hosted SaaS | Same objection as Mintlify — hosted, not self-owned infra. |
| **Backstage TechDocs** | Self-hosted, part of a full developer-portal platform (Spotify's Backstage) | The actual enterprise/gov "internal developer portal" standard when you're also doing service catalogs, scorecards, software templates, etc. Overkill here — it's a whole platform (its own backend, database, plugin runtime) to get a docs site; revisit if/when a full internal dev portal (service catalog, not just docs) becomes a real need. |
| **Read the Docs / Sphinx** | Self-hosted or hosted, Python/reST-first | The government/scientific-computing standard for Python-heavy projects (Sphinx is what most Python stdlib-adjacent and many federal open-source projects use). A reasonable alternative given Panderose's FastAPI-heavy stack, but weaker OpenAPI-to-reference tooling and MDX/React ecosystem than Docusaurus, and no native internal/public multi-instance model. |

## Decision

**Docusaurus**, self-hosted, static output only (no backend/database) —
deployed as part of the existing Azure Static Web Apps + GitHub Actions +
Cloudflare pipeline. Two `@docusaurus/plugin-content-docs` instances in one
site (`default` = public, `internal` = gated) share one theme/nav shell.
API reference for both instances is generated at build time via
`docusaurus-plugin-openapi-docs` from OpenAPI specs synced in from each
FastAPI service's own repo (see `docs-src/specs/README.md`) — never
hand-written, so it can't drift from what's actually deployed.

## Consequences

- Node/npm build step is now part of this repo's pipeline (it wasn't
  before — the marketing site has none). Handled by
  `.github/workflows/build-docs.yml`, which commits the built output
  rather than deploying it directly — see
  [ADR 0003](./built-output-committed).
- Internal-vs-public gating is enforced by Azure Static Web Apps'
  route-level `allowedRoles`, not by the docs framework itself — see
  ADR 0002 and `staticwebapp.config.json`.
- If Panderose later builds a full internal developer portal (service
  catalog, ownership, scorecards — not just docs), Backstage TechDocs
  becomes worth revisiting; this decision covers documentation only.
