---
sidebar_position: 7
title: "ADR 0006 — Internal docs leaked via shared JS bundle"
---

# ADR 0006 — Internal content leaked via the shared JS bundle; internal docs disabled pending an isolated build

**Status:** Accepted. Emergency mitigation shipped (internal docs instance
disabled entirely in the live build); the real fix is not yet built.

## What happened

While setting up Cloudflare Access for `/docs/internal/*`, testing showed
a user could reach internal content via client-side navigation without
re-triggering the server-side gate on reload. Investigating further,
confirmed with plain unauthenticated `curl` against the live site:

```
curl -s https://panderose.com/docs/internal/                          # 302, gate working
curl -s https://panderose.com/docs/assets/js/main.<hash>.js            # 200 — no auth
  -> contains the full route manifest for every internal page
     (Cambium, Fox, RemMe, pdr-lapse, every ADR, the architecture page)
curl -s https://panderose.com/docs/assets/js/<per-page-chunk>.js       # 200 — no auth
  -> contains real internal page content, including this repo's own
     architecture writeup (mentions of PanderoseCore, Azure Static Web)
```

**Every "internal" page's content was retrievable by anyone, with zero
authentication, for as long as this site was live with both instances in
one build** — both Cloudflare Access (ADR 0005) and Azure's `employee`
role (ADR 0004) were working exactly as designed, and neither mattered,
because neither gate covers `/docs/assets/*`.

## Root cause

Docusaurus compiles a site into **one shared client-side application**.
Splitting content into two `plugin-content-docs` instances (`default` /
`internal`) changes routing and sidebars, but not the underlying build:
webpack's shared chunks (the app runtime, common vendor code, and the
route manifest used for client-side navigation) include data for *every*
page in the build, public and internal alike, and every chunk — shared
or per-page — is written to the same `/docs/assets/js/` directory. That
directory has to stay unauthenticated for the public docs to load their
own JS/CSS at all. There is no way to gate "only the internal chunks
within that shared directory" — the build doesn't separate them by
access level, only by route.

This means [ADR 0002](./single-swa-resource)'s choice (one build/resource
for both public and internal) has a real cost that wasn't visible until
tested end-to-end with real auth in front of it: **HTTP-route-level
gating cannot secure content in a single-build SPA**, because the
security boundary (a route) and the actual content-delivery boundary (a
shared asset bundle) don't line up.

## Immediate mitigation (shipped)

The internal `plugin-content-docs` and `docusaurus-plugin-openapi-docs`
instances are commented out in `docusaurus.config.js` — internal content
is not compiled into the live build **at all**, so there is nothing to
leak. `content/internal/` itself is untouched in the repo (nothing
deleted), just excluded from this build.

**Consequence**: internal docs are currently unreachable for everyone,
including invited employees, until the real fix ships. That's the
correct tradeoff — no internal docs beats leaked internal docs.

## Real fix (not yet built)

Internal docs need their own **physically isolated build and
deployment** — a separate Docusaurus site (or a separate `outDir` with
no shared chunk graph) served from a path or hostname that Cloudflare
Access gates **in its entirety**, assets included, with zero shared
directory between it and the public site. Concretely, this likely means
reopening the second-Azure-resource question ADR 0002 closed — not for
the reason ADR 0002 considered (hostname vanity), but because asset-level
isolation may require it. Options to evaluate:

- A second Docusaurus build (internal-only) deployed to its own path
  (e.g. `/docs-internal`) or subdomain, with Cloudflare Access scoped to
  that entire path/subdomain (not just an HTML route within a shared
  build).
- Whether Azure Static Web Apps can serve two independently-built static
  roots from one resource without sharing an assets directory, or
  whether this genuinely needs the second resource ADR 0002 avoided.

## Consequences

- Don't re-enable the commented-out plugins in `docusaurus.config.js`
  until an isolated build exists and has been verified the same way this
  leak was found (`curl` every asset path unauthenticated, not just the
  HTML route).
- This is exactly why [ADR 0002](./single-swa-resource) said "revisit if
  a real reason shows up" — this is that reason. Update ADR 0002 to
  reference this once the isolated build lands.
- Whoever builds the isolated deployment should re-verify ADR 0004 and
  0005's gates against it directly — a fresh build could reintroduce this
  exact bug if the new deployment still shares an asset path with
  anything public.
