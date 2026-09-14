---
sidebar_position: 4
title: "RemMe — internal"
---

# RemMe — internal

## What it is

RemMe (remme.panderose.com) is Panderose's personal AI memory system,
built for college students: it connects Canvas, Outlook, and a student's
own notes into one intelligent knowledge layer that remembers coursework
for them. This repository is the self-hosted knowledge graph engine
behind that product — semantic search, proactive association discovery,
and LLM-assisted reasoning — not a finished consumer product on its own.

The project was previously named Synapse; files, directory names, and some
comments in the repository still reflect that name, but RemMe is the
current and only product name and should be used in anything written
about it going forward.

## API reference

Generated automatically from the live FastAPI app below — see
[`specs/README.md`](https://github.com/PanderoseCore/panderose-deploy/tree/main/docs-src/specs)
for the sync mechanism.

## Architecture

Five services, one Compose stack each:

- **Data layer** — Qdrant (vector store) + Neo4j (graph store).
- **Inference** — Ollama (local LLM + embedding model) and faster-whisper.
- **API** — FastAPI + Redis + Celery.
- **UI** — React 18 + Vite (no TypeScript), served by Nginx.
- **Ops** — Prometheus + Grafana + Loki.

**Neo4j is authoritative for node ownership.** Qdrant vector payloads can
carry stale `user_id`s from pre-auth ingestion, so query code always
post-filters Qdrant results against the current Neo4j node set rather than
trusting Qdrant's payload alone. User IDs are UUIDs, never cast to `int()`
in an ownership check.

Three edge types connect nodes in the graph:
- `SIMILAR_TO` — semantic, cosine similarity ≥ 0.68
- `TAGGED_TOGETHER` — tag-set Jaccard similarity ≥ 0.20 (excluding a small
  set of system tags — `memory`, `conversation`, `auto` — so memory/
  conversation nodes don't form spurious cliques)
- `REFERENCES` — label substring match, fixed weight 0.80

### API structure (`app/`)

```
main.py          FastAPI entry point, lifespan, router registration
config.py        Settings via pydantic-settings, all from environment variables
auth.py          JWT auth, get_current_user dependency
db/               Qdrant + Neo4j + Postgres clients
routers/         auth, ingest, query, chat, discover, integrations, lecture, ...
services/        embedding, query pipeline, association discovery,
                 chat (intent parse -> context -> generation), decay,
                 Outlook/Canvas/Google integrations, PST import
tasks/           Celery + Redis config, a periodic association-discovery pass
```

The query pipeline is embed → approximate-nearest-neighbor search → graph
BFS → score. The chat pipeline is intent parsing → context retrieval →
generation, with a character-budget trimmer to stay under the generation
provider's context limit (24,000 characters total, 1,200 per history
message, up to 8 context nodes, 400 characters per node body).
Association discovery runs three strategies (semantic similarity, tag
Jaccard, label-reference matching) on a recurring background schedule.

### UI structure

React 18 + Vite, no TypeScript, deployed behind Nginx. The home screen
surfaces real knowledge nodes; conversation/behavioral nodes are
deprioritized in the UI and sorted last in associations. Key components: a
left slide-in panel (session history, account), a right slide-in panel
with GRAPH/INFO/INGEST tabs (including a D3 force-directed mini-graph),
a bottom status bar with a domain filter, and separate login/register/
onboarding screens.

## Running it locally

Each service is its own Docker Compose stack. The API's Python
dependencies are pinned in `03_implementation/api/app/requirements.txt`
(FastAPI, Qdrant client, Neo4j driver, asyncpg, Celery + Redis, a JWT
library, `slowapi` for rate limiting, and `prometheus-fastapi-instrumentator`
for metrics). All configuration is environment-variable driven through a
single `pydantic-settings` `Settings` object — there is no
config file with values baked in.

## Internal conventions

- Rate limiting is IP-keyed, 200 requests/minute by default globally, with
  tighter limits on individual auth endpoints.
- The embedding model is a fixed 768-dimensional model served through
  Ollama; the generation model is swappable without a code change (a
  single config value selects it), and no fine-tuning is planned until
  enough real usage data exists.
- No naive/ambiguous timestamps: user IDs are UUIDs; ownership checks
  never assume an integer ID.
- Deploys currently go out via direct file transfer to each service's VM
  rather than a CI/CD pipeline; this is a known interim step, not a
  target architecture.
- Development branch is `dev`; `main` is stable-release only, merged via
  PR from `dev`.
