---
sidebar_position: 1
title: Standards & Practices
---

# Standards & Practices

See [Architecture Decision Records](./adrs) for the trade studies behind
this docs site's own design (platform choice, hosting architecture). The
rest of this section is a placeholder. Suggested pages to fill in first, roughly in order of
how much day-to-day ambiguity they'd remove:

- **API design conventions** — REST/FastAPI conventions (versioning, error
  shape, auth pattern, pagination) so every service looks the same from the
  outside.
- **Service checklist** — what a new backend service needs before it's
  considered production-ready (health check, `/openapi.json`, logging,
  the spec-sync CI step described in [`specs/README.md`](/internal) so it
  shows up in this docs site automatically).
- **Code review expectations**.
- **Incident/on-call practices**, if applicable.
