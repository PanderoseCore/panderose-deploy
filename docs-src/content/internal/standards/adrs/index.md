---
sidebar_position: 1
title: Architecture Decision Records
---

# Architecture Decision Records (ADRs)

This section holds ADRs for this repo, in the lightweight
[MADR](https://adr.github.io/madr/)-style format used across industry,
enterprise, and government software programs (DoD Software Factory
guidance and 18F/USDS both recommend ADRs for exactly this reason): a
short, permanent record of *why* a non-obvious technical decision was
made, so it isn't re-litigated or silently reversed by someone who wasn't
there for the trade study.

- [0001 — Docs platform: Docusaurus vs. alternatives](./docs-platform)
- [0002 — Single Azure Static Web Apps resource vs. a second one for docs](./single-swa-resource)
- [0003 — Commit built docs/ output rather than relying on a downstream build](./built-output-committed)
- [0004 — Gate /docs/internal/* on a custom employee role, not authenticated](./employee-role-gate)
- [0005 — Cloudflare Access as the employee login](./cloudflare-access)

New ADRs go here as `NNNN-short-title.md`. Don't edit a merged ADR's
decision in place — if circumstances change, write a new one that
supersedes it and link back.
