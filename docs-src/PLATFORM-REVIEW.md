# Docs Platform — Architecture & Security Review

**Purpose of this document:** an honest audit of every decision made
while standing up this docs platform, evaluated against how an
enterprise/government-grade system is actually supposed to be built —
not how fast we can make something appear to work. Written after a real
incident (internal content leaked, unauthenticated — see ADR 0006)
exposed that we'd been building access control before validating the
architecture it depended on. This is the correction, and it's the
reference going forward: nothing about this system's security posture
changes without checking it against this document first.

This is not build-restricted content (unlike `content/internal/`) —
it lives at the `docs-src/` root deliberately, so it's readable by
anyone reviewing this repo's history, independent of whether the docs
site itself is built or gated at any given moment.

## 1. What went wrong, at the process level

The technical bug (ADR 0006) was: HTTP-route-level access control doesn't
secure content in a single-build SPA, because the security boundary and
the content-delivery boundary don't line up. That bug is fixed and has a
regression test. But the bug is a symptom. The actual failure was
sequencing:

1. A hosting decision got made for cost/ops-simplicity reasons (ADR
   0002: one Azure resource, one build) — reasonable on its own terms,
   but made **without a data classification or threat model** informing
   it.
2. Real content (internal architecture, product internals, security
   ADRs) got written and merged into that hosting model.
3. Access control (Azure roles, then Cloudflare Access with MFA) got
   layered on **after**, treated as sufficient because the login screen
   worked.
4. Nobody verified the actual delivery path — every asset, not just the
   HTML route — before calling any of it "done."

**The standard practice this violates:** in a real SDLC, you categorize
data and define a system boundary *before* architecture decisions get
made, and you threat-model access control *before* it ships, not after.
NIST calls this categorize → select controls → implement → **assess** →
authorize; we implemented, half-assessed after the fact via one manual
`curl` sweep, and only built the automated assessment (the CI leak
check) after an incident forced it. Right instinct, backwards order.

This review exists to stop doing it backwards.

## 2. System categorization (do this first, from now on)

**What data classes actually flow through this system:**

| Class | Examples | Where it lives |
|---|---|---|
| Public | Marketing site, published product docs (Clerid) | `content/public/`, root marketing HTML |
| Internal | Engineering standards, internal system architecture (Fox, RemMe internals, pdr-lapse, Cambium), ADRs about our own infra | `content/internal/` — **currently not built at all**, per ADR 0006 |
| Never in this system | CUI, classified, export-controlled (ITAR/EAR) technical data, contract/customer-specific detail, secrets of any kind | Explicitly out of scope — see `content/internal/standards/classification.md` |

This table already existed in spirit (the classification policy), but it
was never elevated to something that gates *architecture* decisions —
it only ever governed *content* decisions (what to write where). Going
forward: **no new hosting/access-control architecture ships without
checking it against this table first**, not just against whether the
login page renders.

**Confidentiality impact if internal content leaks (realistic
assessment, not worst-case theater):** moderate, not catastrophic —
nothing in scope is CUI/classified/contract-specific by policy, but real
harm exists (internal system architecture, security control design
details, unreleased product internals — exactly the kind of information
that makes a follow-on attack easier, per this repo's own classification
rule). This is why the incident was still treated as an emergency,
correctly — "not the worst category" is not the same as "fine."

## 3. Trust boundary — as it actually exists, gaps named

```
Browser
   │
   ▼
Cloudflare edge (DNS-proxied, Full-strict TLS)
   │  — Access application scoped to /docs/internal* (ADR 0005, partial)
   ▼
Azure Static Web Apps origin ("Panderose" resource)
   │  — allowedRoles: employee on /docs/internal/* (ADR 0004)
   │  — /docs/assets/* UNGATED (required for public docs; this is the
   │    path that leaked, ADR 0006)
   ▼
Static build artifact
   │  — committed to panderose-deploy main by build-docs.yml (ADR 0003)
   ▼
??? — UNCONFIRMED SYNC MECHANISM ???
   │  — an actor/account named "PanderoseCore" pushes panderose-deploy's
   │    main into Panderose/panderose-site; the actual trigger (manual?
   │    scheduled? webhook? who/what has credentials to do this?) has
   │    never been identified, despite being flagged as an open item
   │    since content/internal/architecture/index.md was first written.
   ▼
Panderose/panderose-site main
   │  — Azure's own GitHub Actions workflow (not authored in this repo)
   ▼
Same Azure Static Web Apps origin, live
```

**This is a real, standing gap, independent of the docs leak**: a
production deployment pipeline has an unidentified actor with push
access to a production-serving repository, and nobody currently
overseeing this docs platform can name what it is or who controls it.
In any real enterprise/gov environment this alone would block a security
sign-off — you cannot authorize a system whose deployment mechanism you
cannot name. **This needs to be resolved before any further
access-control work on internal docs is worth doing** — a perfectly
isolated internal-docs build still ships through a pipeline step nobody
can audit.

## 4. ADR-by-ADR audit

| ADR | Decision | Audit finding |
|---|---|---|
| 0001 | Docusaurus as the platform | Sound, low-risk, stands. Real trade study, real alternatives considered. |
| 0002 | One Azure resource/build for public+internal | **Effectively superseded by the ADR 0006 incident**, not just "revisit if a reason shows up" — the reason showed up. Should be formally marked superseded once the isolated build (§5) exists, not left saying "revisit." |
| 0003 | Commit built output vs. downstream build | Still reasonable given the unconfirmed sync mechanism (§3) — but that same unconfirmed mechanism is itself the bigger problem this ADR works around rather than resolves. |
| 0004 | Azure `employee` role, invite-only | Sound mechanism. **Gap**: no offboarding process (what happens when someone leaves?), no periodic access recertification, and it was verified directly against **production** — no staging/preview environment was used to test an access-control change before it took effect on the live public site. |
| 0005 | Cloudflare Access + hardware-key MFA | Sound design. **Sequencing failure**: built and partially deployed before §3's hosting-boundary problem was known, let alone resolved — real infrastructure layered onto a foundation that hadn't been verified end-to-end yet. |
| 0006 | Leak found, internal disabled, CI leak-check added | Correct reactive fix, defense-in-depth of the future is well handled. **What it can't fix**: it's still a reactive discovery — the checklist it produced (`security-review-checklist.md`) is what should have gated 0004/0005 *before* they shipped, not after. |

## 5. Corrected roadmap — in the right order this time

**Internal docs stay disabled through all of this.** Empty and secure
beats full and leaking, and there is no deadline pressure that changes
that trade.

1. **Resolve the sync mechanism (§3).** Identify what/who pushes
   `panderose-deploy` → `panderose-site`, and put a real, nameable,
   auditable process in its place (a documented person's action, or a
   real CI/CD pipeline this repo can see — not an unidentified actor).
   Nothing past this point is worth doing while this stays unknown.
2. **Baseline hygiene this project currently lacks**, regardless of
   internal docs:
   - Dependency vulnerability scanning in CI (Dependabot or equivalent —
     `npm audit` showed real findings in `docs-src/` during setup that
     were never triaged).
   - Branch protection on `main` requiring review before merge — right
     now nothing structurally prevents an unreviewed merge of a
     security-relevant change, which is exactly how 0004/0005 shipped
     directly to production without a second look.
3. **Design the isolated internal-docs architecture as a design
   document first, reviewed before any code is written** — not another
   fast build. Pick one model explicitly (a genuinely separate build/
   deployment with its own asset namespace — see ADR 0006's options) and
   write the ADR that supersedes 0002 *before* implementing it.
4. **Re-enable internal docs against that new architecture**, gated
   through:
   - The existing `check-no-internal-leak.sh` CI gate (already in place,
     keep it — it's the right kind of control, just needs a correct
     architecture underneath it now).
   - A **staging/preview verification step** before anything touches
     production — Azure Static Web Apps' PR preview environments are
     available and unused; use them, or the equivalent, so the *next*
     access-control change is verified somewhere that isn't
     `panderose.com` first.
   - A human review (not just CI) of the specific `curl`/artifact-sweep
     evidence, before merge — per the Security Review Checklist's "get
     it checked before it ships" rule.
5. **Ongoing practice, not a one-time fix:**
   - Periodic (quarterly is a reasonable default) review of who holds
     the Azure `employee` role and any Cloudflare Access grants —
     access that's never revisited is access that outlives the reason
     it was granted.
   - Revisit this review document whenever the hosting/access
     architecture changes materially, not just when something breaks.

## 6. What "too much, too little" looked like concretely

- **Too much, too soon**: Cloudflare Access with hardware-key MFA and
  RemMe-matched branding, built before the hosting boundary it protects
  was verified safe. Real infrastructure, wrong sequencing.
- **Too little, too late**: no data categorization step before hosting
  decisions; no dependency scanning; no branch protection; no staging
  verification; an unresolved production deployment mechanism nobody can
  name. These are foundational and were skipped in favor of visible
  progress (a login screen, a themed page) that didn't actually rest on
  solid ground.

The fix isn't "slow down forever" — it's doing the boring, unglamorous
steps (§5, steps 1-2 especially) *before* the next visible feature, not
after the next incident.
