---
sidebar_position: 4
title: "ADR 0003 — Committing built docs output"
---

# ADR 0003 — Commit built docs/ output rather than relying on a downstream build

**Status:** Accepted

## Context

`panderose-deploy` is the dev/working repo. Changes to its `main` branch
reach the Azure-connected repo, `Panderose/panderose-site`, through an
approval-gated sync (push to `panderose-deploy` main → review/approval →
synced into `panderose-site` main → Azure's existing workflow there
deploys it). As of writing, it's **not confirmed** whether that sync
process runs any build step, or just copies files as-is — and this repo
has no visibility into `panderose-site` or the sync mechanism to check.

The rest of this property (the marketing site) has always assumed **no
build step on the serving side** — plain HTML/CSS, copied as-is. The docs
site (`docs-src/`), by contrast, is a Docusaurus project that needs
`npm run build` to become servable HTML.

## Options considered

| Option | Risk |
|---|---|
| Commit only `docs-src/` (source), assume the sync/downstream builds it | Breaks silently and completely if that assumption is wrong — raw MDX/config would land in production instead of HTML. Unverified. |
| Commit only `docs-src/` (source), ask whoever owns the sync to add a build step | Correct long-term, but blocked on someone else's infra that we don't have access to confirm or change from here, right now. |
| **Build in panderose-deploy's own CI and commit the output** | Works regardless of what the sync does. A dumb file copy serves it correctly. If the sync *does* build, this is redundant, not broken. No dependency on infra we can't inspect. |

## Decision

`.github/workflows/build-docs.yml` builds `docs-src/` on every push to
`main` and commits the result into `docs/` at the repo root — tracked in
git, not gitignored. `docs/` is therefore **generated**: don't hand-edit
it, edit `docs-src/` and let the workflow (or
`scripts/package-site.sh` locally) regenerate it.

## Consequences

- `docs/` shows up as a normal (large, mostly-binary/minified) diff on
  every docs content change — expected, not a mistake.
- If/when it's confirmed that the sync or `panderose-site` does run its
  own build step, this ADR should be revisited — committing build output
  becomes pure redundancy at that point, though still not harmful.
- The bot commit uses `[skip ci]` in its message and the workflow only
  triggers on `docs-src/**` changes, so it doesn't loop on itself.
