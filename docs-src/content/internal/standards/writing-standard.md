---
sidebar_position: 5
title: Documentation Writing Standard
---

# Documentation Writing Standard

The rule this page exists to enforce: **a reference page documents the
system. It does not document how the page was written, what was left
out and why, or address a reader as if mid-conversation.** Violating
this isn't a style nitpick — it leaks process (including, in at least
one real case, commentary about redacting a client's information) into
what's supposed to be a stable, standalone technical reference.

## Write as the engineer who owns the system, not as a narrator describing it

A page under `content/internal/systems/` or `content/public/products/`
should read exactly like documentation that engineer would write for a
colleague picking up the system cold — because that's what it is. Test:
if a sentence would only make sense to someone who knows this page was
produced by an extraction/summarization pass, delete it. That includes:

- **No meta-commentary about the page's own creation.** Not "this pass
  covered X," not "extracted from the repo's README," not "as of this
  writing" (say what's actually true now, or note it as a known
  limitation of the *system*, not of the documentation effort). A
  reference page has no author's voice about itself at all.
- **No narration of what was redacted or why.** "Excluded because it
  would identify a specific client" is itself information about a real
  client engagement — worse than silence. If something doesn't belong
  in a doc, it simply isn't in the doc. No footnote, no "Left out"
  section, no acknowledgment that a redaction decision was made at all.
  (The one legitimate exception: an operationally urgent fact that
  itself needs flagging — e.g., a live leaked credential — is a message
  to a person, sent directly, never written into a docs page.)
- **No second-person address to a reader as a conversation partner.**
  Not "you'll want to," not "let's look at," not questions posed to the
  reader. State facts about the system in third person / imperative
  ("Run `X` to do Y," not "You can run X if you want to do Y").
- **No hedging language that belongs in a PR description, not a doc**:
  "confirmed live," "verified specifically," "worth flagging." Those are
  appropriate in an ADR (which is a decision record, a different genre —
  see below) or a commit message. In a reference page, state what's
  true, plainly.

## ADRs are a different genre — this doesn't apply the same way

Architecture Decision Records (`content/internal/standards/adrs/`)
legitimately record *why* a decision was made, including what was found,
considered, and rejected — that's the whole point of an ADR, and
industry-standard ADR format expects exactly that history. The
"no narration" rule above governs **system/reference documentation**:
`systems/`, `opportunity-ontology/`, `architecture/`, product pages,
standards/practice pages describing how something works. An ADR
describing why an access-control decision was made is not the same kind
of document as a page explaining what an API does.

## Depth and completeness

A system's reference page should let someone with **zero prior context**
pick up and work with that system — its real architecture, its actual
conventions, its APIs, its toolchain — without needing to know anything
about how or when the page was written. That means:

- Document what's actually true about the code: real module layout,
  real API surface, real conventions a contributor needs to follow, real
  setup/run instructions — not a summary of "what it does" at a
  distance.
- If a system has an API, its reference belongs here in full (generated
  from a real spec where one exists — see `specs/README.md` — written by
  hand with the same rigor where one doesn't yet).
- If something needs a "why," it goes in an ADR with a link from the
  reference page, not as inline narration on the reference page itself.

## Enforcement

This is a checklist to apply to every page before it merges, same as the
[Security Review Checklist](./security-review-checklist) applies to
anything access-controlled. Read a page back and ask: would a Panderose
engineer, with no memory of how or when this was written, recognize this
as documentation of *their own system* — or does it read like something
explaining itself to an outside reader? If it's the latter, rewrite it.
