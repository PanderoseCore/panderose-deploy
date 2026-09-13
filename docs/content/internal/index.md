---
slug: /
sidebar_position: 1
title: Internal Engineering Docs
---

# Internal Engineering Docs

:::danger Access-gated
This instance is meant to be restricted to Panderose org members via Azure
Static Web Apps role-based routing (Entra ID / GitHub org membership). See
[`staticwebapp.config.json`](https://github.com/PanderoseCore/panderose-deploy/blob/dev-docs/staticwebapp.config.json)
— the `/docs/internal/*` route requires the `authenticated` (or a custom
`employee`) role. **Do not put anything here before that gate is actually
wired up in the Azure resource** — this scaffold ships the routing rule,
but someone with portal access still has to configure the identity
provider and role assignment.
:::

This is the internal counterpart to the [public docs](/). It's where
engineering standards, cyber-assessment infrastructure notes, internal API
internals, and cross-team practices live — things that are true and useful
inside the company but aren't ready (or appropriate) to publish.

## Sections

- **[Standards & practices](/internal/standards)** — how we build things
  (API conventions, review process, coding standards).
- **[Cyber assessment infrastructure](/internal/cyber-assessment)** — internal
  tooling/infra used for assessments, scoped to what's safe to write down
  in a docs site rather than a runbook/wiki with tighter access control.
- **[Opportunity / ontology program](/internal/opportunity-ontology)** — the
  Cambium-backed opportunity/ontology system.
