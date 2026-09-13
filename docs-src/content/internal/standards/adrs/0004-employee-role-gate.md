---
sidebar_position: 5
title: "ADR 0004 — employee role, not authenticated"
---

# ADR 0004 — Gate `/docs/internal/*` on a custom `employee` role, not `authenticated`

**Status:** Accepted

## Context

After `/docs/internal/*` went live gated on `allowedRoles: ["authenticated"]`,
verification showed `https://panderose.com/.auth/login/github` completes
a full sign-in with **zero prior configuration** — no app registration, no
allowlist, nothing. Azure Static Web Apps ships several built-in identity
providers (GitHub, Microsoft Entra ID, Twitter/X, Google, Apple —
availability varies by plan) that work out of the box specifically so
`authenticated` is trivial to reach. That means `allowedRoles:
["authenticated"]` does not mean "a Panderose employee" — it means
**"anyone on the internet willing to click sign-in."** For a route meant
to hold cyber-assessment infrastructure notes and other non-public
material, that's not a real access boundary.

## Decision

`/docs/internal/*` requires a **custom role, `employee`**, which Azure
Static Web Apps only grants through explicit invitation — the portal's
**Role management** blade (or `az staticwebapp users invite`), where an
admin picks a specific identity (a GitHub username, an email on a given
provider, etc.) and assigns it a role. Nobody has `employee` until someone
with admin access on the SWA resource invites them to it, one person at a
time. This is a deny-by-default posture: right after this change shipped,
`/docs/internal/*` returns 401 for **everyone**, including Panderose
staff, until invitations go out.

## Consequences

- Onboarding a new person to internal docs is an explicit action (send
  them an invite), not something that happens automatically by them
  having *any* account anywhere — slightly more ops overhead than
  `authenticated`, in exchange for the gate actually meaning something.
- Invitations are per-provider-identity. If someone signs in with a
  different provider/account than the one they were invited on, they
  won't have the role — worth standardizing on one provider (e.g. GitHub,
  since Panderose already lives on GitHub) for who gets invited on what.
- This still isn't SSO/group-based access tied to an actual Panderose
  Entra ID tenant — it's invite-by-identity. If Panderose later stands up
  its own Entra ID tenant/app registration, switching `employee` to be
  granted by AAD group membership instead of individual invites is a
  natural follow-up ADR, not a reason to hold off on this one now.
- Verified live: `curl https://panderose.com/docs/internal/` returns 401
  for anonymous requests after this change deployed.
