---
sidebar_position: 4
title: Security Review Checklist — Access-Controlled Content
---

# Security Review Checklist — Access-Controlled Content

This exists because of a real incident, not a hypothetical: internal docs
went live gated by both Cloudflare Access and Azure's `employee` role,
and were nonetheless fully readable by anyone, unauthenticated, because
neither gate covered the JS bundle that actually rendered the content —
only the HTML route. See [ADR 0006](./adrs/shared-bundle-leak) for the
full writeup. This checklist is the mechanical fix: a mandatory
pre-ship gate for anything in this repo (or any Panderose repo) that
claims to restrict access to something, so this class of mistake can't
happen silently again.

**This is not optional, and it is not satisfied by testing the happy
path.** "I checked that the login screen appears" is not a security
review. The standard below is.

## The rule

**Before anything is described as "access-controlled," "gated,"
"internal-only," or "restricted," its actual delivery mechanism — every
URL, asset, API response, and cached artifact a client's browser or a
script could reach — must be individually verified against an
unauthenticated request. Not the primary route. Every artifact that
could carry the protected data.**

If the thing being gated is served by a shared build (a single-page app,
a monorepo build artifact, a CDN with shared cache keys, anything where
"public" and "private" content are compiled/packaged together), assume
by default that the delivery mechanism does **not** respect your route-
level access rule, and prove otherwise — don't assume it does because the
top-level page redirected correctly.

## Checklist

1. **Map every artifact, not just the route.** For a web app: the HTML
   page, every JS/CSS chunk it loads, every XHR/fetch it makes, any
   server-rendered data embedded in the page source, any sitemap/search
   index/RSS feed that might enumerate it. For an API: every response
   field, not just the endpoint's auth check — a "public" list endpoint
   that includes a nested object from a "private" resource is the same
   bug in a different shape.
2. **Test each one with a bare, unauthenticated request.** `curl` with no
   cookies, no session, no special headers — not a browser tab you're
   still logged in from ten minutes ago. Confirm each artifact either
   requires auth or is genuinely fine to be public.
3. **If the platform doesn't visibly separate these artifacts by access
   level, assume it can't, and design around that** — a shared build
   process that compiles all content together (regardless of what
   framework, regardless of how confident the framework's own routing
   claims to be) is not a place to also enforce your data's confidentiality
   boundary. Confidentiality boundaries need to exist at the point where
   the artifact is physically produced/deployed, not layered on
   afterward via a reverse-proxy rule.
4. **Automate the check.** A one-time manual `curl` sweep proves the
   state at that moment; it says nothing about the next commit. Every
   access-controlled feature needs an automated, CI-enforced regression
   test that fails the build if the boundary breaks — see
   `docs-src/scripts/check-no-internal-leak.sh` for the pattern this repo
   uses (extract every gated page's identifying content automatically,
   fail if any of it appears in what's about to ship publicly).
5. **Get it checked before it ships, not after.** If you're the only
   person who looked at it, that's not a review. On a solo/small team,
   this can mean deliberately re-verifying with fresh eyes after a break,
   or literally re-running the automated check on a clean checkout —
   not skipping the step because you already believe it works.

## What "done" looks like

A feature is not "access-controlled, done" until:

- Every artifact in its delivery path has been individually tested
  unauthenticated, with the actual command/output recorded (in the PR,
  an ADR, or a commit message) — not just asserted.
- An automated check exists that would fail CI if the boundary
  regresses, and that check actually ran and passed before merge.
- The design assumption (route-level gate, platform-level gate,
  build-level isolation — whichever applies) is written down somewhere
  a future change would actually see it, so the next person modifying
  this feature knows what they'd need to re-verify.

Anything short of that is a feature that *looks* done and isn't — which
is exactly what happened here.
