---
sidebar_position: 6
title: "ADR 0005 — Cloudflare Access as the employee login (proposed)"
---

# ADR 0005 — Cloudflare Access as the employee login for `/docs/internal/*`

**Status:** Proposed — not yet implemented. Requires Cloudflare Zero Trust
portal configuration this repo can't do on its own (no credentials, no
Cloudflare Zero Trust API access from here). Written up so the plan and
its tradeoffs exist somewhere before anyone acts on it, per how this repo
handles decisions (see the ADR index).

## Context

[ADR 0004](./employee-role-gate) fixed `/docs/internal/*` to require a
custom `employee` role, invited one person at a time through Azure's own
Role management portal. That works, but "who's an employee" management
now lives in a UI most people won't think to check, with no SSO, no
group-based access, no branded login experience, and Azure's Free-tier
Static Web Apps invitation flow is exactly that — a portal chore, not a
real identity platform.

Panderose already uses Cloudflare for DNS. Cloudflare's Zero Trust /
Access product is a real access-management platform: branded login pages,
real identity providers (Google Workspace, GitHub org membership, Entra
ID, one-time-PIN by email), session/device policies — the kind of thing
you configure once and stop thinking about, rather than a thing you own
the security correctness of line-by-line.

## Options considered

| Option | Trade-off |
|---|---|
| Keep Azure `employee` role invites only (ADR 0004) as-is | Zero extra infra, but stays a manual per-person portal chore forever, no SSO, no branding. |
| **Add Cloudflare Access in front, keep Azure role as backstop** | Real IdP-backed login with Panderose branding; requires proxying `panderose.com` through Cloudflare (currently DNS-only) and setting Cloudflare SSL/TLS to Full (strict). Azure's `employee` role gate stays as-is underneath — it's the only thing protecting the raw `*.azurestaticapps.net` hostname, which Cloudflare Access cannot see or gate. |
| Cloudflare Access only, drop the Azure role gate | Simpler on paper, but leaves the raw Azure hostname (`*.azurestaticapps.net`) completely open to the internet with zero gate — real exposure. Rejected. |

## Decision (proposed)

Add a Cloudflare Access **Application** scoped to
`panderose.com/docs/internal*`, with:

- **Branding**: Panderose logo/name on the Access login page (Cloudflare
  supports custom app name + logo per Application).
- **Identity provider(s)**: whatever Panderose already uses for team
  identity (Google Workspace / GitHub org / Entra ID) if one exists, or
  one-time-PIN by email as a zero-setup fallback for a small team.
- **Policy**: allow rule scoped to actual employee identities (specific
  emails, or an IdP group if one's configured) — not "anyone who signs
  in," the same mistake ADR 0004 corrected at the Azure layer.

**Keep** the Azure `employee` role gate exactly as ADR 0004 left it — it's
not redundant, it's the only thing standing between the internet and
`*.azurestaticapps.net`.

## Prerequisites (manual, portal, not scriptable from this repo)

1. Cloudflare dashboard → DNS → set the `panderose.com`/`www` records to
   **Proxied** (orange cloud) — currently DNS-only.
2. Cloudflare dashboard → SSL/TLS → Overview → set mode to **Full
   (strict)** — required before proxying, or you get a redirect loop
   (same warning `MIGRATION-GUIDE.md` already gives for the DNS-only
   → proxied transition).
3. Cloudflare dashboard → Zero Trust → Access → Applications → **Add an
   application** → Self-hosted → domain `panderose.com`, path
   `/docs/internal*` → configure branding, identity provider(s), and
   policy as above.
4. Verify after: `/docs/internal/*` should show Cloudflare's Access login
   (not immediately Azure's), and the raw `*.azurestaticapps.net` origin
   should still 401 anonymously per ADR 0004's gate.

## Consequences

- Two auth layers to reason about instead of one (Cloudflare Access at
  the edge, Azure `employee` role at origin) — more moving parts, but each
  one is a managed product doing the part it's good at, not custom code.
- Proxying `panderose.com` through Cloudflare changes more than just
  `/docs/internal` — it puts the *entire* site behind Cloudflare's edge
  (WAF, caching, etc. become available/relevant). That's a bigger change
  than "just gate the docs," worth doing deliberately with eyes open, not
  as a side effect.
- This ADR stays "Proposed" until someone with Cloudflare Zero Trust
  access actually does the above and confirms it live — flip the status
  to "Accepted" then, with the verification command/output that proves it.
