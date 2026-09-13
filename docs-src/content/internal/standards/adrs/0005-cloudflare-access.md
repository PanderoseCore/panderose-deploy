---
sidebar_position: 6
title: "ADR 0005 — Cloudflare Access as the employee login"
---

# ADR 0005 — Cloudflare Access as the employee login for `/docs/internal/*`

**Status:** Accepted, not yet implemented. Requires Cloudflare Zero Trust
portal configuration this repo can't do on its own (no credentials, no
Cloudflare Zero Trust API access from here).

## Context

[ADR 0004](./employee-role-gate) fixed `/docs/internal/*` to require a
custom `employee` role, invited one person at a time through Azure's own
Role management portal. That's a real access boundary, but it's also a
raw portal chore with no session policy, no MFA, and no branding — and
critically, Azure's per-invite roles are tied to whatever identity
provider the person originally authenticated with (GitHub, in practice),
which means the actual security floor is whatever that provider's login
happens to guarantee, not something Panderose controls directly.

**Panderose has no existing identity system.** No Google Workspace, no
Microsoft 365/Entra ID tenant — `@panderose.com` addresses exist today
only as Cloudflare Email Routing forwards to personal inboxes, which is
mail forwarding, not an auth system; nothing can "log in" as one of those
addresses on its own. GitHub is the closest thing Panderose has to an
existing team identity today.

## Decision

Add a Cloudflare Access **Application** scoped to
`panderose.com/docs/internal*`, configured as:

- **Primary login: One-Time PIN, restricted to `@panderose.com`.**
  Cloudflare Access's built-in OTP-by-email login works today with zero
  additional identity infrastructure — a policy rule restricts it to
  emails on the `panderose.com` domain, so only people who can actually
  receive mail at a real Panderose address (i.e. someone who was granted
  a forwarding address) can start a login at all.
- **Required second factor: a registered hardware security key
  (WebAuthn), not GitHub-dependent.** Cloudflare Access can require a
  Cloudflare-registered hardware key on top of *any* login method via a
  policy's `require` rule — this is real step-up MFA that exists
  independent of whichever provider handled the first factor, closing
  the gap where "logged in" and "MFA'd" were being treated as the same
  thing.
- **GitHub stays available as a secondary login option**, for whoever
  already thinks in terms of their GitHub identity — but is not the
  sole/primary path, and PanderoseCore's GitHub org should separately
  enable **"Require two-factor authentication for everyone"** at the org
  level so GitHub-based logins carry a real, org-enforced MFA floor
  rather than an individually-optional one.
- **Branding**: match [RemMe's](/internal/systems/remme) existing login
  page theme — pulled directly from its source (`index.css`,
  `Login.jsx`), not guessed:
  - Background `#f3f5fa` (cool light gray-blue).
  - Card `#ffffff` on `#fafbfd`, 16px corner radius, hairline border
    `rgba(60,60,67,0.12)`, soft float shadow
    (`0 8px 28px rgba(12,27,58,0.16), 0 2px 6px rgba(12,27,58,0.08)`).
  - Text/ink `#0c1b3a`.
  - Accent (button/links) `#3a5fc8`, hover `#4a6fd8`.
  - Layout: centered card, max-width ~400px, small square logo above a
    bold wordmark, with a small-caps, letter-spaced subtitle line
    beneath it (RemMe's reads "by Panderose" under "RemMe" — the
    Panderose Access login should invert that emphasis: the Panderose
    mark/wordmark primary, a subtitle line like "Internal" or
    "Developer Docs" beneath it, not "by Panderose" again).
  - RemMe's own dark/navy tokens (`--rm-navy: #0a1633`, `--rm-navy-2:
    #0e1c40`) exist for its hero surfaces, not this login card — the
    login itself is light-theme only in the source reviewed; don't
    invent a dark variant unless RemMe's login actually has one.
  - Cloudflare Access branding covers logo image, background color, and
    accent color per Application — sufficient to match the above; it
    does not support the card's exact shadow/radius, which is a
    reasonable, minor departure.
- **Session policy**: Cloudflare Access issues its own session (a signed
  cookie with a configurable duration and forced re-auth), independent of
  whatever IdP was used for the underlying login — this is the actual
  fix for "sessions shouldn't be tied to GitHub all the way": the session
  lifecycle becomes Cloudflare's, not the login provider's, regardless of
  which login method was used to start it.

**Keep** the Azure `employee` role gate exactly as ADR 0004 left it — see
that ADR's reasoning: it's the only thing standing between the internet
and the raw `*.azurestaticapps.net` origin hostname, which Cloudflare
Access cannot see or gate.

## Prerequisites (manual, portal, not scriptable from this repo)

1. Cloudflare dashboard → DNS → set the `panderose.com`/`www` records to
   **Proxied** (orange cloud) — currently DNS-only.
2. Cloudflare dashboard → SSL/TLS → Overview → set mode to **Full
   (strict)** — required before proxying, or you get a redirect loop
   (same warning `MIGRATION-GUIDE.md` already gives for the DNS-only
   → proxied transition).
3. Cloudflare dashboard → Zero Trust → Settings → Authentication → add
   **One-Time PIN** (usually on by default) and register at least one
   **hardware key** for testing the `require` rule.
4. Cloudflare dashboard → Zero Trust → Access → Applications → **Add an
   application** → Self-hosted → domain `panderose.com`, path
   `/docs/internal*` → configure the policy: `include` email domain
   `panderose.com` via One-Time PIN, `require` a registered hardware key,
   optionally `include` GitHub as an alternate login. Set branding (logo,
   colors) under the application's appearance settings.
5. GitHub org settings (`PanderoseCore`) → Authentication security →
   enable **"Require two-factor authentication for everyone"**.
6. Verify after: `/docs/internal/*` should show Cloudflare's branded
   Access login (not immediately Azure's), require both the email OTP
   and the hardware key, and the raw `*.azurestaticapps.net` origin
   should still separately 401 anonymously per ADR 0004's gate.

## Consequences

- Two auth layers to reason about instead of one (Cloudflare Access at
  the edge, Azure `employee` role at origin) — more moving parts, but
  each one is a managed product doing the part it's good at, not custom
  code.
- A hardware-key requirement means physically having that key to log in
  — real security, but a real onboarding step for every new invitee
  (they need to register a key with Cloudflare before they can get in at
  all). Worth deciding whether a software passkey is an acceptable
  alternative if hardware keys turn out to be too much friction for the
  team's size.
- Proxying `panderose.com` through Cloudflare changes more than just
  `/docs/internal` — it puts the *entire* site behind Cloudflare's edge
  (WAF, caching, etc. become available/relevant). That's a bigger change
  than "just gate the docs," worth doing deliberately with eyes open, not
  as a side effect.
- If Panderose later stands up a real Workspace/Entra ID tenant, that
  becomes the Access identity provider instead of email-OTP+hardware-key,
  and this ADR should be revisited rather than silently left stale.
- This ADR's implementation isn't verified live yet — update this page
  with the verification command/output once someone with Cloudflare
  Zero Trust access has actually done the above.
