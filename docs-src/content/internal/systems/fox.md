---
sidebar_position: 2
title: "Fox — Panderose context server"
---

# Fox — Panderose context server

## What it is

Fox is Panderose's internal unified-context server: a single,
always-current source of truth for the company's own operating context —
engagements, contacts, decisions, playbooks, and product/compliance
knowledge — served as an MCP server (`panderose-context`) so that context
is available from any MCP-capable client (Claude Code included) rather
than living in one device's chat history or one person's head.

The repository `jhockersmith/fox` is the cloud/deployment-target home for
the server; it was first prototyped locally as `panderose-context-server`
and carried its git history over once a dedicated host ("Fox") became
available to run it on. See the repository's own README for current
deployment status.

## Architecture

- **`panderose_context/locus/`** — the retrieval kernel: hyperdimensional
  computing / vector-symbolic architecture (binary spatter codes) engram
  math plus BM25/RRF hybrid search. Promoted out of a vendored fallback
  library inside Clerid's pipeline once its core math had proven itself
  there; the vector dimension is 4096 (raised from 2048 during
  promotion). The module set:
  - `bind`/`bundle` primitives — XOR bind and weighted-majority-vote
    bundle over binary spatter codes.
  - Named-entity-recognition-weighted signal extraction — per-entity-type
    weights (0.9 for the strongest signal classes down to 0.6 for
    weaker ones), a flat 0.55 weight for a secondary signal source, and
    0.40 for a tertiary one.
  - `TYPE_WEIGHT` (0.15) — how strongly node type contributes to overall
    similarity alongside content signal.
  - A Hamming-distance approximate nearest-neighbor search with a 0.5
    baseline similarity floor before candidates reach the BM25 re-rank
    pass.
- **`panderose_context/locus/relations.py`** — subject-predicate-object
  fact encoding (relating one entity to another by a named relationship)
  built on the kernel's bind/unbind primitives.
- **`panderose_context/ontology/`** — the entity type registry (Org,
  Person, Engagement, Playbook, Artifact, Product). Data-driven (a JSON
  registry), not a hard-coded enum — a new entity type is added by
  editing the registry, not by changing code. A small fixed set of
  non-entity signal roles (`DATE`, `TIME`, `LOC`, `EVENT`, `CONCEPT`)
  also exists for signal extraction but is not itself an entity type.
- **`panderose_context/service/mcp_server.py`** — the MCP server itself.
  See [MCP tool reference](./fox-mcp-tools) for the full tool surface,
  request/response shapes, and authentication model.
- **Storage** — SQLite in WAL mode, for both the concept-vector codebook
  and the engram store. Chosen over Postgres/Neo4j at Fox's scale, based
  on RemMe having taken on that heavier storage layer before it was
  needed. On startup the server seeds the ontology's built-in concept
  types into the codebook — cheap, idempotent, safe to run every launch —
  before entering its transport loop.

The retrieval kernel's lineage runs from RemMe's (formerly Synapse's) full
Neo4j+Qdrant knowledge-graph approach, through a lightweight rewrite
inside Clerid's pipeline, to this standalone, promoted-on-merit module —
Panderose's general build pattern for shared infrastructure: prototype in
place, then promote what earns reuse, rather than designing a shared
library up front.

## Running it locally

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -m panderose_context.service.mcp_server        # stdio MCP server
```

Connect it to Claude Code on the same machine:

```bash
claude mcp add panderose -- python -m panderose_context.service.mcp_server
```

Verify the install with `python tests/test_smoke.py`, which runs against a
throwaway temp data directory and never touches real data.

Real data defaults to a local `./data/` directory, which is gitignored —
the repository holds code, not company data. A container image and
compose file exist for a networked deployment, along with a minimal
bearer-token verifier for that transport — see
[MCP tool reference § Connecting](./fox-mcp-tools#connecting) for the
environment variables that control transport and authentication.

## Conventions

- The retrieval/ontology/service split stays reusable independent of
  Panderose-specific content: the kernel and ontology registry know
  nothing about any particular company fact, only about vector math and a
  type registry.
- Content enters the store either through a one-time ingestion script
  (seeding it from existing internal documents) or live through the MCP
  `remember`/`relate` tools during a session. The ingestion script is how
  the initial knowledge base gets populated; the MCP tools are the
  steady-state path.
- Every write tool is idempotent-by-id, where the id is derived
  deterministically from its inputs — re-running the same call replaces
  rather than duplicates the row.
