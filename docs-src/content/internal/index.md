---
slug: /
sidebar_position: 1
title: Internal Engineering Docs
---

# Internal Engineering Docs

:::danger Access-gated — invite-only, not just "signed in"
`/docs/internal/*` requires the custom `employee` role in
[`staticwebapp.config.json`](https://github.com/PanderoseCore/panderose-deploy/blob/main/staticwebapp.config.json),
**not** Azure's built-in `authenticated` role. That distinction matters:
`authenticated` is satisfied by *anyone on the internet* who completes any
of Azure Static Web Apps' zero-config login flows
(`/.auth/login/github`, `/.auth/login/aad`, etc.) — it does not mean
"a Panderose employee." `employee` is a role nobody has until someone
with admin access on the Azure resource explicitly **invites** them to
it (portal: the Static Web App resource → **Role management** → **Invite**
→ pick a provider + the person's identifier on it → assign role
`employee` → send them the single-use invite link). Until invitations go
out, `/docs/internal/*` returns 401 for literally everyone, including
Panderose staff — that's the safe default; ramping up who can see this
section is an invite you send, not a config change.
:::

This is the internal counterpart to the [public docs](/). It's where
engineering standards, cyber-assessment infrastructure notes, internal API
internals, and cross-team practices live — things that are true and useful
inside the company but aren't ready (or appropriate) to publish.

:::info Before you add anything here
Read [Public vs. Internal — Classification Policy](/internal/standards/classification)
first. "Internal" is not the top tier — CUI, classified, export-controlled,
and contract-sensitive material don't belong in this system at all, gated
or not.
:::

## Sections

- **[Repo architecture](/internal/architecture)** — how panderose-deploy
  itself is put together: site structure, design tokens, deployment
  pipeline, security posture. The literal contents of this repo, written
  up.
- **[Standards & practices](/internal/standards)** — how we build things
  (API conventions, review process, coding standards, and the ADRs
  recording why this docs site is built the way it is).
- **[Cyber assessment infrastructure](/internal/cyber-assessment)** — internal
  tooling/infra used for assessments, scoped to what's safe to write down
  in a docs site rather than a runbook/wiki with tighter access control.
- **[Opportunity / ontology program](/internal/opportunity-ontology)** — the
  Cambium-backed opportunity/ontology system.
- **[Internal systems](/internal/systems)** — Clerid's internal
  engine, Fox (context server), pdr-lapse, and RemMe's internal
  architecture + generated API reference.
