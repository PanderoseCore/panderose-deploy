---
sidebar_position: 1
title: Opportunity / Ontology Program (Cambium)
---

# Opportunity / Ontology Program — Cambium

The Panderose opportunity/ontology program is built on **Cambium**
(`jhockersmith/cambium`), a decision-provenance graph with bitemporal
storage.

## What it is

Cambium is a decision-provenance graph with bitemporal storage: claims
decay, decisions record what they assumed when they were made, and
outcomes are kept structurally separate from the decisions that produced
them. It is the shared core beneath several Panderose applications, each a
"profile" that adds domain vocabulary and evaluators on top of one common
core:

| Profile       | Question it answers |
|---------------|----------------------|
| `acquisition` | Why was this alternative chosen, and is that still true? |
| `opportunity` | Which engagements are worth the time, and what did they yield? |
| `dependency`  | Where is supplier concentration dangerous? |

The design goal is a graph that records not just what was chosen, but what
was assumed, what was rejected, and whether the ground has since moved
under a past decision.

The repository is pre-implementation: the type layer, storage, decay, and
API modules exist as package scaffolding, and the architecture is
specified in `docs/` and `plan/ROADMAP.md` before code is written against
it. No API reference generates here yet — see
[`specs/README.md`](https://github.com/PanderoseCore/panderose-deploy/tree/main/docs-src/specs)
for how that lands automatically once one exists.

## Core design commitments

1. **Nothing mutates.** The only permitted `UPDATE` on a content table
   closes a row's transaction-time upper bound; a correction inserts a new
   revision rather than editing in place. No ORM-level `update()` path
   exists on a bitemporal table.
2. **`ingestion_method` (`HUMAN` / `IMPORT` / `AGENT`) is immutable and
   never inferred.** A row written by an agent stays `AGENT` forever, even
   after a human confirms it, and every query can filter on it.
3. **Agents cannot create Commitments or advance Decision lifecycle
   state.** This is enforced in the repository/authority layer at write
   time — not by a prompt, a docstring, or any convention an agent's own
   code could route around.
4. **A stale claim escalates a Decision to `SUSPECT` only if flipping it
   would change the selected option** (the "sensitivity gate").
   Otherwise it is annotated silently, because a system that alarms on
   every stale claim gets ignored within a month regardless of accuracy.
5. **A Decision inferred from old documents is born `RECONSTRUCTED`** and
   keeps that marker permanently, even after a human later confirms it.
6. **Alternatives are recorded, including the null one.** A status-quo
   option is mandatory and auto-generated for every decision.
7. **Decision and outcome are separate objects** — so a sound process that
   got unlucky can be told apart from a broken one that got away with it.

## Module layout

```
src/cambium/
  types/
    enums.py          ClaimClass, ingestion_method, lifecycle states, etc.
    models.py          Pydantic v2 models for the nine core ontology types
  store/
    db.py              SQLAlchemy engine/session setup
    repo.py            repository layer — the only path allowed to write
    temporal.py         bitemporal range handling (valid-time / tx-time)
    authority.py         enforces the agent authority boundary at write time
    lifecycle.py          Decision lifecycle state machine
    access.py              access-class / attestation enforcement
    action.py                 Commitment recording
    decision_hierarchy.py      parent/child decision relationships
    evidence_review.py            reconfirmation/adjudication workflow
    risk.py                        risk-scoring hooks
    stop_rule.py                   stop-rule enforcement for evaluation runs
  decay/
    decay.py             the exponential decay mechanism
    expiry.py            hard-deadline expiry mechanism
    refute.py            refutation-only (STATIC) mechanism
    protocol.py           common interface all three mechanisms implement
    registry.py             per-claim-class mechanism selection
    sweep.py                  batch decay pass over stored claims
  propagate/
    sensitivity_gate.py   the "would this flip the decision" check
    revision_signature.py  detects whether a claim revision is substantive
  evaluate/
    base.py             evaluator interface every evaluator implements
    seal.py              hashing/sealing of evaluation run results
    policy.py             stop-rule/policy hooks for evaluators
    network.py             structural-constraint evaluator
    mcda.py                 multi-criteria decision analysis evaluator
  profiles/
    opportunity.py       entity vocabulary + evaluators for the opportunity profile
    acquisition.py         entity vocabulary + evaluators for the acquisition profile
    bias_governance.py       bias-mitigation hooks for evaluator output
  agent/
    elicitation.py        free text -> draft Need/Options/Claims
    providers.py            LLM client wrapper: schema-constrained calls,
                             retry-with-correction, provider failover
    capabilities.py            per-agent scoped capability manifests
    audit.py                     immutable per-call audit trail (prompt,
                                  response, retry outcome, latency, cost)
  api/                    FastAPI surface (not yet implemented beyond
                          package scaffolding)
```

## Ontology

Nine core types (Source, Claim, Entity, Need, Option, Decision, Commitment,
Outcome, and an evaluation-run type) and fourteen edge types, deliberately
domain-neutral — no type name references a contact, a program office, or a
vendor. Domain profiles add vocabulary and evaluators; they never add new
core types.

Claims are authored coarse and decayed fine: a single authored statement
(`"Person X, Role Y, confirmed <date>"`) contains several independently
decaying assertions with different half-lives, and decay attaches to typed
fields within the claim rather than to the claim as a whole.

## Architecture

- **Storage** — PostgreSQL 16+, bitemporal via explicit valid-time and
  transaction-time ranges. Postgres is the system of record; a graph is a
  projection over it that can be rebuilt from scratch, never itself the
  store. Every timestamp column is `timestamptz`, stored UTC — a naive
  datetime never appears anywhere in the type layer or the store.
- **Type layer** — Pydantic v2 models mirroring the ontology.
- **Decay and propagation** — each claim field uses one of three decay
  mechanisms, chosen per claim class through a registry rather than
  hardcoded per call site:
  - **Exponential decay** — a continuous confidence curve with a
    configurable half-life (shared math with
    [`pdr-lapse`](/internal/systems/pdr-lapse)).
  - **Expiry** — a hard deadline; the claim is valid until a fixed time
    and invalid after.
  - **Refute** — no time-based decay at all; the claim stays valid until
    an explicit refutation is recorded.

  A batch sweep periodically recomputes decayed confidence across stored
  claims. The sensitivity gate is the single chokepoint deciding whether a
  decayed claim's staleness needs to surface as a Decision-level
  escalation.
- **Evaluators** — share one interface and produce sealed, hashed results
  so an evaluation run's inputs and outputs are provenance-tracked the
  same way a claim is. A structural-constraint evaluator and a
  multi-criteria decision analysis evaluator are the two implementations
  today; a stop-rule policy hook governs when an evaluator run halts.
- **API** — a FastAPI surface is planned (`src/cambium/api/`) but not yet
  implemented beyond a placeholder module.

## Agent layer

The agentic layer is a small, fixed set of narrow, single-purpose agents
composed by explicit code (plain functions and a state machine), not by a
general-purpose multi-agent framework — each agent has one responsibility
and a Pydantic-validated output schema, and none of them can call into
Commitment creation or a Decision lifecycle transition. The underlying
LLM-call pattern (a single schema-constrained call with one
retry-with-correction and a deterministic fallback, plus a hardened
multi-provider call wrapper with automatic failover when one provider's
rate limit is hit) was proven in production elsewhere at Panderose before
Cambium adopted it.

On top of the authority boundary, every agent also carries a scoped
capability manifest stating exactly which actions that specific agent is
permitted to take — narrower than "no Commitments, no lifecycle
transitions" where a given agent needs less — and every model call it
makes is recorded in an immutable per-call audit trail: the raw prompt,
the raw response, whether a retry was needed, latency, and cost. A system
whose central claim is auditable provenance cannot have an unauditable
step in its own agent layer, so nothing about a model call is discarded
after its parsed result is kept.

## Local development

```bash
pip install -e ".[dev]"      # install with dev extras
make db-up                   # docker compose: local Postgres 16
make migrate                 # alembic upgrade head
make check                   # ruff lint + format check, mypy --strict, pytest
```

The default local Postgres compose config uses a fixed dev-only user,
password, and database name (`cambium` / `cambium` / `cambium`) — a local
convenience, not a credential used anywhere else.

## Internal conventions

- Python 3.12+, SQLAlchemy 2.x + Alembic, Pydantic v2, FastAPI, networkx,
  pytest + hypothesis.
- Type hints everywhere; `mypy --strict` on `src/`. No bare `except`, no
  silent failure — a failed decay or propagation step must surface.
- Invariant tests live in `tests/test_invariants.py` and are never
  weakened to make a change pass.
- No entity-resolution system (integrate one later rather than build it
  here). No graph database as system of record. No zero-knowledge proofs
  — attestation over hashed inputs is the chosen design instead of a ZK
  approach over decision predicates.
- Cambium reuses [`pdr-lapse`](/internal/systems/pdr-lapse) for temporal
  decay rather than reimplementing it; a regression test pins the two
  packages' output against each other so they cannot silently drift
  apart.
