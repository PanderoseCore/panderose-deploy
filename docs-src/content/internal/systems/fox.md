---
sidebar_position: 2
title: "Fox — Panderose context server"
---

# Fox — Panderose context server

## What it is

Fox is Panderose's internal unified-context server: a single,
always-current source of truth for the company's own operating context —
engagements, contacts, decisions, playbooks, and product/compliance
knowledge — served as an MCP server so that context is available from any
MCP-capable client (Claude Code included) rather than living in one
device's chat history or one person's head.

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
  there; the vector dimension is 4096 (raised from 2048 during promotion).
- **`panderose_context/locus/relations.py`** — subject-predicate-object
  fact encoding (relating one entity to another by a named relationship)
  built on the kernel's bind/unbind primitives.
- **`panderose_context/ontology/`** — the entity type registry (Org,
  Person, Engagement, Playbook, Artifact, Product). Data-driven (a JSON
  registry), not a hard-coded enum — a new entity type is added by
  editing the registry, not by changing code.
- **`panderose_context/service/mcp_server.py`** — the MCP server itself,
  exposing tools to query the store, add facts, relate entities, fetch a
  single entity, list ontology types, and register a new entity type.
- **Storage** — SQLite in WAL mode, for both the concept-vector codebook
  and the engram store. Chosen over Postgres/Neo4j at Fox's scale, based
  on RemMe having taken on that heavier storage layer before it was
  needed.

The retrieval kernel's lineage runs from RemMe's (formerly Synapse's)
full Neo4j+Qdrant knowledge-graph approach, through a lightweight rewrite
inside Clerid's pipeline, to this standalone, promoted-on-merit module —
Panderose's general build pattern for shared infrastructure: prototype
in place, then promote what earns reuse, rather than designing a shared
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

Verify the install with `python tests/test_smoke.py`, which runs against
a throwaway temp data directory and never touches real data.

Real data defaults to a local `./data/` directory, which is gitignored —
the repository holds code, not company data. A container image and
compose file exist for a networked deployment, along with a minimal
bearer-token verifier for that transport.

## Conventions

- The retrieval/ontology/service split stays reusable independent of
  Panderose-specific content: the kernel and ontology registry know
  nothing about any particular company fact, only about vector math and
  a type registry.
- Content enters the store either through a one-time ingestion script
  (seeding it from existing internal documents) or live through the MCP
  `remember`/`relate` tools during a session. The ingestion script is how
  the initial knowledge base gets populated; the MCP tools are the
  steady-state path.
