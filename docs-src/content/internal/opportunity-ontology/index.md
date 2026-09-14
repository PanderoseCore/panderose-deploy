---
sidebar_position: 1
title: Opportunity / Ontology Program (Cambium)
---

# Opportunity / Ontology Program — Cambium

The Panderose opportunity/ontology program is built on **Cambium**
(`jhockersmith/cambium`), a decision-provenance graph with bitemporal
storage.

## What it is

Cambium is a decision-provenance graph with bitemporal storage. It is the
shared core beneath several Panderose applications, each a "profile" that
adds domain vocabulary and evaluators on top of one common core:

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

1. **Nothing mutates.** Claims and evaluation runs are superseded, never
   edited. The only permitted `UPDATE` on a content table closes a row's
   transaction-time upper bound; a correction inserts a new revision.
2. **Assumption is an edge, not a node.** Decisions point at claims rather
   than copying them, so staleness propagates without extra bookkeeping.
3. **Decision and outcome are separate objects** — so a sound process that
   got unlucky can be told apart from a broken one that got away with it.
4. **Alternatives are recorded, including the null one.** A status-quo
   option is mandatory and auto-generated for every decision.
5. **Agents propose, never commit.** An agent-authored row cannot create a
   Commitment or advance a Decision's lifecycle state — enforced in the
   repository layer, not by convention.

## Ontology

Nine core types (Source, Claim, Entity, Need, Option, Decision, Commitment,
Outcome, and an evaluation-run type) and fourteen edge types, deliberately
domain-neutral — no type names a contact, a program office, or a vendor.
Domain profiles add vocabulary and evaluators; they never add new core
types. Two type-level rules carry weight throughout the system:

- **`ingestion_method`** (`HUMAN` / `IMPORT` / `AGENT`) is immutable and
  never inferred — a row written by an agent stays `AGENT` forever, even
  after a human confirms it, and every query can filter on it.
- **Claims are authored coarse, decayed fine.** A single authored statement
  (`"Person X, Role Y, confirmed <date>"`) contains several independently
  decaying assertions with different half-lives; decay attaches to typed
  fields within the claim, not to the claim as a whole.

## Architecture

- **Storage** — PostgreSQL 16+, bitemporal via explicit valid-time /
  transaction-time ranges. Postgres is the system of record; a graph is a
  rebuildable projection over it, never itself the store.
- **Type layer** — Pydantic v2 models mirroring the ontology.
- **Decay / propagation** — one of three decay mechanisms per claim field
  (`EXPIRY`, exponential decay, or refutation-only `STATIC`); staleness
  propagates from a stale claim to the decisions that assumed it. A stale
  claim escalates a decision to `SUSPECT` only if flipping it would change
  the selected option (the "sensitivity gate") — otherwise it is annotated
  silently, to avoid an alarm-on-everything system that gets ignored.
- **Evaluators** — pluggable scoring modules behind one interface; results
  are sealed and hashed for provenance.
- **API** — a FastAPI surface is planned (`src/cambium/api/`) but not yet
  implemented beyond a placeholder module.
- **Reconstructed history** — a Decision inferred from old documents is
  born `RECONSTRUCTED` and keeps that marker permanently, even after a
  human later confirms it.

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
- Every timestamp is `timestamptz`, stored UTC; never a naive datetime.
- Invariant tests live in `tests/test_invariants.py` and are never weakened
  to make a change pass.
- No ORM-level `update()` path on bitemporal tables. No entity-resolution
  system (integrate one later rather than build it here). No graph
  database as system of record. No zero-knowledge proofs — attestation
  over hashed inputs is the chosen design instead.
- Cambium reuses two existing Panderose packages rather than
  reimplementing their logic: [`pdr-lapse`](/internal/systems/pdr-lapse)
  for temporal decay and `pdr-derive` (planned) for intent parsing.
