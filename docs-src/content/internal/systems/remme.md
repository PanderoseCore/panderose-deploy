---
sidebar_position: 5
title: "RemMe — internal"
---

# RemMe — internal

## What it is

RemMe (remme.panderose.com) connects Canvas, Outlook, and a student's own
notes into one knowledge layer that remembers coursework for them. This
repository is the self-hosted knowledge-graph engine behind that product:
ingestion, semantic search, proactive association discovery, and
LLM-assisted reasoning, deployed as five independent services — not a
finished consumer product on its own.

The product and engine were previously named Synapse. That name still
appears in file paths, service names, and comments throughout the
codebase, but RemMe is the current product name and the only one that
belongs in anything written about the system going forward — "Synapse"
should never appear as a product, service, or engine name in generated
material.

## Services

| Service | Responsibility | Core dependencies |
|---|---|---|
| Vault | vector store + graph store | Qdrant, Neo4j |
| Inference | local LLM + embedding + speech-to-text | Ollama, faster-whisper |
| API | ingestion/query/chat gateway | FastAPI, Redis, Celery |
| UI | web client | React 18 + Vite, served by Nginx |
| Ops | observability | Prometheus, Grafana, Loki |

Each service is its own Docker Compose stack.

## API reference

Generated automatically from the live FastAPI app below — see
[`specs/README.md`](https://github.com/PanderoseCore/panderose-deploy/tree/main/docs-src/specs)
for the sync mechanism.

## API architecture (`03_implementation/api/app/`)

```
main.py          FastAPI entry point: app construction, lifespan, router registration
config.py        pydantic-settings Settings object; every configuration value lives here
auth.py          JWT auth, get_current_user dependency
db/
  qdrant.py      Qdrant async client
  neo4j.py       Neo4j async driver — authoritative for node ownership
  postgres.py    Postgres connection for user/conversation/integration state
routers/
  auth_router.py     /auth/register, /login, /onboard, /me, password reset/change
  ingest.py          /ingest, /ingest/async, /ingest/batch
  query.py           /query, /node/{id}, /associations/{id}, /export
  chat.py            /chat, /chat/stream
  discover.py        /discover
  integrations.py    Outlook, Canvas, Google OAuth connect/callback/status/sync, PST import
  lecture.py         lecture-transcription endpoints
  conversations.py   conversation history + "smart surface" endpoint
  reinforce.py       /reinforce/{node_id}
  health.py          /health, /health/public
services/
  embedding.py       nomic-embed-text via Ollama, 768-dim vectors
  query.py           embed -> ANN search -> graph BFS -> score
  association.py     three-strategy association discovery
  chat.py             intent parse -> context retrieval -> generation
  generation.py        provider-agnostic generation wrapper with a character-budget trimmer
  intent.py             lightweight intent classification ahead of generation
  context.py             context-node selection/formatting for a chat turn
  reasoning.py            multi-step reasoning helpers for chat
  decay.py                confidence decay for stored knowledge nodes
  scoring.py               combined-score ranking for query results
  surface.py / surface_smart.py   "what should the user see right now" logic
  titling.py                 auto-titling for conversations
  queue.py                    background task submission helpers
  outlook.py / outlook_sync.py / pst_import.py    Outlook integration
  canvas.py                    Canvas LMS integration
  google_sync.py / google_oauth.py   Google Calendar/Drive integration
  whisper.py                     audio transcription via faster-whisper
  email.py                       outbound email
  ingestion.py                     shared ingestion pipeline logic
tasks/
  celery_app.py    Celery + Redis configuration
  outlook.py       background Outlook sync tasks
  (a Celery beat schedule runs the association-discovery pass periodically)
```

### Query pipeline

Embed the query text (Ollama, 768-dim) → approximate nearest-neighbor
search in Qdrant → graph traversal (BFS) from the resulting nodes in
Neo4j → combined scoring of the expanded candidate set → ranked results.

**Neo4j is authoritative for node ownership.** Qdrant vector payloads can
carry stale `user_id` values left over from pre-auth ingestion, so every
query path re-filters Qdrant results against the current Neo4j node set
for the requesting user rather than trusting the Qdrant payload directly.
`user_id` is always a UUID string; it is never cast to `int()` anywhere in
an ownership check.

### Graph edges

Three edge types connect nodes:

- `SIMILAR_TO` — semantic similarity, cosine ≥ 0.68
- `TAGGED_TOGETHER` — tag-set Jaccard similarity ≥ 0.20, excluding a fixed
  set of system tags (`memory`, `conversation`, `auto`) so conversation/
  memory nodes don't form artificial cliques with each other
- `REFERENCES` — label substring match, fixed weight 0.80

Association discovery runs all three strategies as a periodic Celery beat
task rather than at ingestion time, so relationships between
already-ingested content continue to surface as new content arrives.

### Chat pipeline

Intent parsing → context retrieval (top-N relevant nodes, scored and
trimmed) → generation. The generation layer is provider-agnostic (a
config value selects the active provider and model, no code change
required to switch) and applies a fixed character budget before calling
the provider: 24,000 characters total, 1,200 characters per history
message, up to 8 context nodes, 400 characters per node body. This keeps
requests under the active provider's context limit deterministically
rather than reactively handling a context-length error.

### Configuration

All configuration is a single `pydantic-settings` `Settings` object read
from environment variables — there is no hardcoded value in service code
and no direct `os.getenv()` call inside a service function; anything a
service needs comes from `config.get_settings()`.

## UI architecture (`03_implementation/ui/`)

React 18 + Vite, deliberately no TypeScript, served behind Nginx.

```
App.jsx               root component: all state, routing between home/chat modes
api.js                 Axios client, JWT interceptor, every API call in one place
components/
  LeftPanel.jsx         slide-in: session history, account, logout
  RightPanel.jsx         slide-in: GRAPH | INFO | INGEST tabs
  BottomBar.jsx           status bar, domain filter, home button
  NodeCard.jsx             a knowledge node's home-screen pill
  MiniGraph.jsx             D3 force-directed graph, right panel
  Login.jsx / Register.jsx / Onboard.jsx   auth and first-run flows
```

The home screen surfaces real knowledge nodes (`source !== 'behavioral'`).
Conversation/behavioral nodes are deprioritized in the UI and sorted last
in association lists, since they represent transcript history rather than
substantive knowledge.

## Running it locally

Each service is its own Docker Compose stack. API dependencies
(`03_implementation/api/app/requirements.txt`): FastAPI 0.115, Qdrant
client, Neo4j driver, asyncpg, Celery + Redis, PyJWT, passlib/bcrypt for
password hashing, fastembed, `slowapi` for rate limiting, and
`prometheus-fastapi-instrumentator` for metrics.

```bash
pip install -r 03_implementation/api/app/requirements.txt
# populate environment variables the Settings object expects (Qdrant/Neo4j/
# Postgres/Redis endpoints, Ollama endpoint, JWT secret, generation-provider
# credentials as applicable)
uvicorn main:app --reload   # from 03_implementation/api/app/
```

The UI is built with `npm run build` and served as static assets behind
Nginx.

## Internal conventions

Python (API):
- Type hints required on every function signature; `str | None` over
  `Optional[str]`, `list[str]` over `List[str]`.
- Every service function is `async def`; no `asyncio.run()` inside a
  service.
- One job per function; 40-line soft limit, extract past that.
- Routers validate input and raise `HTTPException`; services trust their
  callers and never `return {"error": ...}` from a 200 response.
- No bare `except Exception` in a service unless it logs and re-raises.
- Comments explain non-obvious *why*, never *what*; no docstrings on
  self-evident functions.

JavaScript/JSX (UI):
- No TypeScript, functional components only, one component per file named
  for the component.
- Local state via `useState`; state needing to be shared lives in
  `App.jsx` and flows down as props — no global state library until one
  is actually needed.
- All API calls go through `api.js`; no direct `fetch()` in a component,
  and no silent error catches.

API design:
- Plural resource names (`/nodes`, not `/node`); non-CRUD actions are
  `POST` with a verb noun (`/ingest`, `/query`, `/discover`).
- Consistent response shapes: a flat model or `{data, meta}` on success,
  `{detail: str}` on error — never a 200 response carrying an error body.
- Bearer JWT in the `Authorization` header on every protected route; no
  cookies, no server-side sessions.
- Any list endpoint that can exceed 50 items takes `limit`/`offset` query
  parameters.

Naming:

| Thing | Convention | Example |
|---|---|---|
| Python file | `snake_case` | `embedding.py` |
| Python class | `PascalCase` | `QueryRequest` |
| Python constant | `UPPER_SNAKE_CASE` | `MAX_CONTEXT_NODES` |
| JSX component file | `PascalCase.jsx` | `NodeCard.jsx` |
| JS utility file | `camelCase.js` | `api.js` |
| API endpoint | `/kebab-case` | `/ingest/async` |
| DB table/column | `snake_case` | `oauth_tokens`, `user_id` |
| Env var | `UPPER_SNAKE_CASE` | `GROQ_API_KEY` |
| Git branch | `kebab-case` | `feat/eval-runner` |
| Docker service | `kebab-case` | matches the service's role |

Git:
- `main` is stable-only, merged via PR from `dev`; never pushed to
  directly, never force-pushed.
- `dev` is where active development happens; `feat/*` branches are for
  larger work needing isolation before merging into `dev`.
- Commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`,
  `refactor:`, `test:`), imperative subject line, ≤ 72 characters.
- `.env` files, secrets, build artifacts, and local eval output are never
  committed.

Other:
- Rate limiting is IP-keyed, 200 requests/minute by default globally,
  with tighter limits on individual auth endpoints.
- Deploys currently go out via direct file transfer to each service's VM
  rather than a CI/CD pipeline; this is a known interim step, not a
  target architecture.
