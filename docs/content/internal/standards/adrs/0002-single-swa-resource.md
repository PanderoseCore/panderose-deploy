---
sidebar_position: 3
title: "ADR 0002 — Single Azure Static Web Apps resource"
---

# ADR 0002 — Single Azure Static Web Apps resource vs. a second one for docs

**Status:** Accepted (supersedes the original dev.panderose.com-as-a-second-resource plan)

## Context

The original plan (see earlier chat history / superseded design) was a
second Azure Static Web Apps resource dedicated to docs, on its own
custom domain `dev.panderose.com`, with its own deployment token and its
own GitHub Actions workflow. Two things changed that:

1. Azure Static Web Apps routing (`staticwebapp.config.json`, including
   `allowedRoles` and rewrite rules) applies **per resource, not per
   custom domain**. Adding `dev.panderose.com` as a second custom domain
   on a resource that already serves panderose.com would show *identical*
   content on both hostnames — there is no way to make `dev.panderose.com/`
   show something different from `panderose.com/` on the same resource.
   So a second custom domain on the *same* resource buys nothing beyond a
   vanity alias.
2. A genuinely separate resource (to get real separation) means a second
   deployment token, a second GitHub Actions workflow, and a second thing
   to keep in sync — real ongoing cost for a docs site that has no
   functional need to live on a different hostname than the main site.

## Decision

**One Azure Static Web Apps resource** serves both the marketing site
(repo root) and the docs site (`/docs`, built from `docs/` with
Docusaurus). One GitHub Actions workflow
(`.github/workflows/azure-deploy.yml`) builds both and deploys them
together. Docs live at `panderose.com/docs` (and `www.panderose.com/docs`)
— not a separate subdomain.

Public vs. internal separation happens **within** that one deployment, at
the routing layer: `staticwebapp.config.json` gates `/docs/internal/*`
behind `allowedRoles: ["authenticated"]`, and `robots.txt` /
`sitemap.xml` keep that section out of search indexing. This is the same
mechanism a second resource would have needed anyway (an identity
provider + role assignment configured on the SWA resource) — the
resource count didn't add any real security, only extra ops surface.

## Consequences

- If a real product reason later shows up for a distinct hostname (e.g. a
  customer-facing docs product that needs to be on its own domain with
  independent scaling/caching/CDN rules), that's a new ADR and an actual
  second resource — this one doesn't rule that out, it just says "not for
  the current internal+public docs split."
- `dev.panderose.com` is free to add later as a pure DNS alias (CNAME to
  the same resource) if someone wants a memorable "docs" URL, with the
  explicit understanding it will show the exact same site as
  panderose.com, not a different one.
- One deployment token (`AZURE_STATIC_WEB_APPS_API_TOKEN`), one workflow,
  one place to configure auth/roles.
