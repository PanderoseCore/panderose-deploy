---
slug: /
sidebar_position: 1
title: Introduction
---

# Panderose Developer Docs

Welcome to the developer documentation for software and tools published by
Panderose.

This is the **public** documentation instance — guides, SDK references, and
API documentation for anything we ship outside the company. If you're
looking for internal engineering standards, cyber-assessment infrastructure
docs, or unpublished API internals, see the
[internal docs](/internal) instead (requires sign-in).

## What's here

- **Getting started** — install and make your first call/import in minutes.
- **Guides** — task-oriented walkthroughs for common integrations.
- **API reference** — generated directly from each service's OpenAPI spec,
  so it never drifts from what's actually deployed.

## Structure

```
docs/
├── content/public/      # this instance — public guides + reference
├── content/internal/    # gated instance — internal standards & infra docs
└── specs/               # OpenAPI specs synced from source repos (see below)
```

## Keeping API reference current

Reference pages under **API** are not hand-written. Each backend service
(built with FastAPI) already exposes a live `/openapi.json`. A CI step in
that service's own repository exports the spec and syncs it into
[`specs/public/`](https://github.com/PanderoseCore/panderose-deploy/tree/main/docs/specs/public)
or `specs/internal/` here on every merge to its main branch. This docs site
regenerates the reference section from those specs on every build via
[`docusaurus-plugin-openapi-docs`](https://github.com/PalmettoSoftware/docusaurus-openapi-docs) —
so reference docs are always in sync with what's actually deployed, with
zero hand maintenance.

See [`specs/README.md`](https://github.com/PanderoseCore/panderose-deploy/tree/main/docs/specs)
for the exact sync contract each service repo should implement.
