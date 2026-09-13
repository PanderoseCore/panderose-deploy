---
sidebar_position: 2
title: "Fox — Panderose context server"
---

# Fox — Panderose context server

## What it is

Fox is Panderose's internal unified-context server: a single, always-current
source of truth for the company's own operating context — engagements,
contacts, decisions, playbooks, and product/compliance knowledge — reachable
from any Claude session as an MCP server, so context doesn't live in one
device's chat history or one person's head.

This repository (`jhockersmith/fox`) is the cloud/deployment-target home
for what was first prototyped locally as `panderose-context-server`; the
code and git history carried over once a dedicated server ("Fox") was
available for it to run on. As of writing, it is staged and its tests pass
but it has not yet been deployed anywhere reachable by more than one
machine — see the repository's own README for current deployment status.

## Architecture

- **`panderose_context/locus/`** — the retrieval kernel: hyperdimensional
  computing / vector-symbolic architecture (binary spatter codes) engram
  math plus BM25/RRF hybrid search. This module was promoted out of a
  vendored fallback library inside Clerid's pipeline, on the reasoning
  that its core math had already proven itself there; the vector dimension
  was raised from 2048 to 4096 in the process.
- **`panderose_context/locus/relations.py`** — subject-predicate-object
  fact encoding (e.g. relating one entity to another by a named
  relationship) built on the kernel's existing bind/unbind primitives.
- **`panderose_context/ontology/`** — the entity type registry (Org,
  Person, Engagement, Playbook, Artifact, Product). It is data-driven
  (a JSON registry), not a hard-coded enum, so a new entity type can be
  added by editing the registry rather than changing code.
- **`panderose_context/service/mcp_server.py`** — the MCP server itself,
  exposing tools to query the store, add facts, relate entities, fetch a
  single entity, list ontology types, and register a new entity type.
- **Storage** — SQLite in WAL mode, for both the concept-vector codebook
  and the engram store. This was a deliberate choice over Postgres/Neo4j
  at the current scale, informed by an earlier Panderose project (RemMe)
  having taken on that heavier storage layer before it was needed.

The retrieval kernel's lineage runs from RemMe's (formerly Synapse's) full
Neo4j+Qdrant knowledge-graph approach, through a lightweight rewrite inside
Clerid's pipeline, to this standalone, promoted-on-merit module — a build
pattern of prototype-in-place, then promote what earns reuse, rather than
designing a shared library up front.

## Running it locally

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -m panderose_context.service.mcp_server        # stdio MCP server
```

Connect it to Claude Code on the same machine with `claude mcp add
panderose -- python -m panderose_context.service.mcp_server`. Verify the
install with `python tests/test_smoke.py`, which runs against a throwaway
temp data directory and never touches real data.

Real data defaults to a local `./data/` directory, which is gitignored —
by design, this repository holds code, not company data. A container
image and compose file exist for a future networked deployment, along with
a minimal bearer-token verifier for that transport, but as of writing
neither has been exercised against a real, network-reachable deployment.

## Internal conventions

- The retrieval/ontology/service split is meant to stay reusable
  independent of Panderose-specific content: the kernel and ontology
  registry know nothing about any particular company fact, only about
  vector math and a type registry.
- Content gets into the store either through a one-time ingestion script
  (seeding it from existing internal documents) or live through the MCP
  `remember`/`relate` tools during a session — the former is how the
  initial knowledge base was populated, the latter is the intended
  steady-state path.

:::caution Scope of this page
This document deliberately excludes the specific company facts,
relationships, and third-party board/document snapshots the server has
ingested — that content is operational company data, not architecture,
and does not belong in a docs page even at internal visibility, per the
[classification policy](/internal/standards/classification).
:::
