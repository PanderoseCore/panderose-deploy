---
sidebar_position: 2
title: Public vs. Internal — Classification Policy
---

# Public vs. Internal — what goes where

A decision rule for anyone adding content to this docs site, not a
one-time design note. Read this before adding a page, not after something
ends up in the wrong place.

## The one-sentence version

**Public** (`content/public/`) is anything true you'd be fine with a
competitor, a journalist, or a foreign intelligence service reading in
full. **Internal** (`content/internal/`) is everything else that's still
appropriate to put in a lightweight, invite-gated docs site. **Neither** is
CUI, classified, ITAR/EAR-controlled technical data, or anything
contract-sensitive — that category doesn't belong in this system at all,
gated or not, and is called out separately below because it's the one
mistake that isn't just embarrassing if you get it wrong.

## Public — safe by design, not by omission

Public docs should be complete and genuinely useful on their own terms —
don't write thin public pages that are really just teasers for internal
ones. Appropriate for public:

- Getting-started guides, SDK/library usage, published tool documentation.
- API reference for anything actually shipped externally.
- General engineering philosophy that doesn't reveal specific infra
  (e.g. "we version APIs via URL path" is fine; "our staging DB is at
  10.x.x.x" is not).

## Internal — real content, still not the top tier

Internal is for things that are true and useful *inside* Panderose but
would give away information a competitor or adversary could act on, or
that are simply not ready/relevant for an outside audience:

- Engineering standards, review process, internal API conventions.
- Architecture of Panderose's *own* systems (this repo's deploy pipeline,
  internal tool integration patterns) — operationally useful internally,
  unnecessary to hand an outsider.
- The Cambium-backed opportunity/ontology program, and other
  internal-only product/program documentation.
- ADRs and other decision history for internal systems.

**Cyber-assessment infrastructure is the section to be most conservative
about, even within internal.** "Scoped to what's safe to write down in a
docs site" (per that section's own page) means: methodology, general
tooling categories, and process are fine; specific target details,
findings, credentials, live infrastructure inventories, or anything that
would help someone attack a real system are not — those belong in a
narrower-access system (a runbook/wiki with per-document access control),
with at most a link from here.

## Never — not gated, not public, not in this system at all

This system (Docusaurus + an invite-only Azure SWA role, see
[ADR 0004](./adrs/employee-role-gate)) is a documentation site with a
login wall. It is **not**:

- An accredited system for **CUI** (Controlled Unclassified Information)
  under NIST SP 800-171 / DFARS, or for **classified** information of any
  level. If Panderose handles either under a government contract, they
  require specifically accredited systems with marking, audit, and
  handling controls this repo does not and cannot provide. When in doubt
  whether something is CUI, treat it as CUI until someone who owns that
  determination says otherwise — don't let "it's just internal docs" be
  the reasoning that puts it here anyway.
- A place for **export-controlled technical data** (ITAR/EAR). Aerospace
  and defense-adjacent technical detail can be export-controlled even
  when unclassified — that determination belongs to whoever owns export
  compliance at Panderose, not to whoever is writing the doc page.
- A place for **customer/contract-specific details** — names, contract
  numbers, deliverables, pricing, anything tied to a specific engagement.
  Generalize or omit.
- A place for **secrets** of any kind — API keys, tokens, credentials,
  private keys, internal URLs/IPs that matter operationally. This is a
  static site built from a public GitHub repo; anything committed here is
  in git history forever, gate or no gate. (Also see the repo's own
  secrets sweep discipline — nothing like this should ever be committed,
  full stop, gated section or not.)
- A place for **individually identifying information about employees**
  beyond what's already public on the marketing site (name/role/photo for
  people who've chosen to be public-facing there).

## Practical check before you write a page

1. Would this be fine on the public internet, permanently, unattributed?
   → `content/public/`.
2. Is it useful only inside Panderose, but not sensitive if an employee
   who left last year still remembers it? → `content/internal/`, general
   section.
3. Would it help an adversary, a competitor, or a stalker act on it, or
   is it plausibly CUI/export-controlled/contract-sensitive? → **Not
   here.** Full stop, regardless of section.

When genuinely unsure between (2) and (3), default to (3) and ask,
rather than publish first and reconsider later — this repo has no
retraction story for anything already pushed (see the secrets-handling
note above: committed is permanent).
