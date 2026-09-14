---
sidebar_position: 4
title: "ADR 0003 — Committing built docs output"
---

# ADR 0003 — Commit built docs/ output rather than relying on a downstream build

**Status:** Accepted

## Context

`panderose-deploy` is the dev/working repo. Changes to its `main` branch
reach the Azure-connected repo, `Panderose/panderose-site`, through a
manual push (confirmed: a person with access to both repositories pushes
directly, no build step involved) → Azure's existing native workflow on
`panderose-site` deploys it as-is. At the time this ADR was written, that
sync process hadn't been confirmed and this repo had no visibility into
`panderose-site` to check — see
[PLATFORM-REVIEW.md §3](https://github.com/PanderoseCore/panderose-deploy/tree/main/docs-src/PLATFORM-REVIEW.md)
for how it was later confirmed. The reasoning below held regardless of
that uncertainty and still holds now that it's resolved.

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
- Confirmed: the sync is a manual push with no build step, so committing
  build output here is doing real work, not redundant. If the manual sync
  is later formalized into a real CI/CD pipeline (see PLATFORM-REVIEW.md
  §5), that new pipeline's design should state explicitly whether it
  builds `docs-src/` itself — if it does, this ADR should be revisited at
  that point, since committing build output becomes pure redundancy.
- The bot commit uses `[skip ci]` in its message and the workflow only
  triggers on `docs-src/**` changes, so it doesn't loop on itself.
