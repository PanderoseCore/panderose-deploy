---
sidebar_position: 3
title: "ADR 0002 — Single Azure Static Web Apps resource"
---

# ADR 0002 — Single Azure Static Web Apps resource vs. a second one for docs

**Status:** Accepted (superseded an earlier dev.panderose.com-as-a-second-resource
plan, and was itself revised once the real deploy pipeline was confirmed —
see the history note at the bottom)

## Context

The original plan (see chat history) was a second Azure Static Web Apps
resource dedicated to docs, on its own custom domain `dev.panderose.com`,
with its own deployment token and its own GitHub Actions workflow. Two
things ruled that out:

1. Azure Static Web Apps routing (`staticwebapp.config.json`, including
   `allowedRoles` and rewrite rules) applies **per resource, not per
   custom domain**. Adding `dev.panderose.com` as a second custom domain
   on a resource that already serves panderose.com would show *identical*
   content on both hostnames — there is no way to make `dev.panderose.com/`
   show something different from `panderose.com/` on the same resource.
2. A genuinely separate resource means a second deployment token, a
   second workflow, and a second thing to keep in sync — real ongoing
   cost for a docs site with no functional need to live on a different
   hostname than the main site.

## Decision

**One Azure Static Web Apps resource** (the existing `Panderose` resource
in resource group `Panderose_group`) serves both the marketing site and
the docs site, at `panderose.com/docs`. Public vs. internal separation
happens within that one deployment, at the routing layer:
`staticwebapp.config.json` gates `/docs/internal/*` behind
`allowedRoles: ["authenticated"]`, and `robots.txt`/`sitemap.xml` keep
that section out of search indexing.

## Consequences

- If a real product reason later shows up for a distinct hostname, that's
  a new ADR and an actual second resource — this one doesn't rule that
  out, it just says "not for the current internal+public docs split."
- `dev.panderose.com` is free to add later as a pure DNS alias (CNAME to
  the same resource) if someone wants a memorable "docs" URL, with the
  explicit understanding it will show the exact same site as
  panderose.com, not a different one.

## History note — how this resource actually gets deployed

An earlier version of this ADR assumed **panderose-deploy** would deploy
directly to that Azure resource via its own GitHub Actions workflow and a
`AZURE_STATIC_WEB_APPS_API_TOKEN` secret. That was wrong: the Azure
resource's actual GitHub source is **`Panderose/panderose-site`**, not
this repo. `panderose-deploy` is the dev/working repo; changes here reach
production through an approval-gated sync into `panderose-site`, which is
what Azure watches. See
[ADR 0003](./built-output-committed) for what that means for how docs
get built, and
[Repo architecture → Deploy pipeline](/internal/architecture#deploy-pipeline)
for the full picture. This repo does not hold Azure deployment credentials
and does not deploy to Azure directly — doing so would bypass the
approval gate.
