---
sidebar_position: 1
title: Standards & Practices
---

# Standards & Practices

**Read [Public vs. Internal — Classification Policy](./classification)
before adding content anywhere in this docs site** — it's the rule for
deciding what's public, what's internal, and what belongs in neither.

**Read [Security Review Checklist — Access-Controlled Content](./security-review-checklist)
before shipping anything that restricts access to anything** — mandatory,
not a suggestion, after a real incident ([ADR 0006](./adrs/shared-bundle-leak))
where content described as gated was fully readable, unauthenticated.

See [Architecture Decision Records](./adrs) for the trade studies behind
this docs site's own design (platform choice, hosting architecture,
access control), and [Automation & Tooling Practices](./automation-practices)
for reusable engineering technique generalized out of real work. The rest
of this section is a placeholder. Suggested pages to fill in first,
roughly in order of how much day-to-day ambiguity they'd remove:

- **API design conventions** — REST/FastAPI conventions (versioning, error
  shape, auth pattern, pagination) so every service looks the same from the
  outside.
- **Service checklist** — what a new backend service needs before it's
  considered production-ready (health check, `/openapi.json`, logging,
  the spec-sync CI step described in [`specs/README.md`](/internal) so it
  shows up in this docs site automatically).
- **Code review expectations**.
- **Incident/on-call practices**, if applicable.
