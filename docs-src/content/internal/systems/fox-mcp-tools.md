---
sidebar_position: 3
title: "Fox — MCP tool reference"
---

# Fox — MCP tool reference

Full tool surface for the `panderose-context` MCP server. See
[Fox](./fox) for the architecture behind these tools.

## Connecting

Transport is stdio by default; a network transport (`sse` or
`streamable-http`) is available via the `PANDEROSE_TRANSPORT` environment
variable for a networked deployment.

```bash
python -m panderose_context.service.mcp_server
```

From Claude Code, on the machine running the server:

```bash
claude mcp add panderose -- python -m panderose_context.service.mcp_server
```

Environment variables the server reads at startup:

| Variable | Purpose | Default |
|---|---|---|
| `PANDEROSE_TRANSPORT` | `stdio`, `sse`, or `streamable-http` | `stdio` |
| `PANDEROSE_HOST` | bind host, network transports only | `127.0.0.1` |
| `PANDEROSE_PORT` | bind port, network transports only | `8420` |
| `PANDEROSE_TOKENS` | bearer-token map (see Authentication) | unset |
| `PANDEROSE_AUTHOR` | default `author` value for tool calls that omit it | `unknown` |
| `PANDEROSE_DATA_DIR` | root directory for the SQLite store | `./data/` |

## Authentication

Over stdio there is no client-server boundary, so no authentication is
applied. A network transport activates a static bearer-token verifier
only if `PANDEROSE_TOKENS` is set, in the form:

```
PANDEROSE_TOKENS="token1:principal_a,token2:principal_b"
```

Each token maps to exactly one named principal. There is one shared
access scope (`panderose`) — a validated token grants access to the whole
store; token identity is used for attributing writes to whoever made
them, not for narrowing what they can read. There is no scope-narrowing,
per-tool permissioning, or expiry on these tokens.

## Data model

Every write (from `remember` or `relate`) becomes a row in the underlying
engram store with these fields: a stable id, a label, a vector encoding of
extracted signals, the raw signal list, a `node_type`, an optional
`source`, an `author`, a `scope` (always `panderose` for tool-originated
writes), and the original body text.

## Tools

### `remember(label, body, node_type="Artifact", source=None, author=None) -> dict`

Stores a new fact or note in the shared context.

- `label` — a short title for the note.
- `body` — the actual content.
- `node_type` — one of the registered ontology entity types (see
  `list_ontology_types`); an unregistered type does not fail the call, it
  falls back to generic signal weighting.
- `source` — free-text provenance for the note (e.g. a document path, a
  system name, `"manual"`).
- `author` — who is writing this; defaults to `$PANDEROSE_AUTHOR` if
  omitted.

Returns `{"ok": true, "id": <engram_id>, "signals_extracted": <int>}` on
success, or `{"ok": false, "error": "no extractable signal from label/body"}`
if nothing salient could be pulled from the text (label/body were too
sparse to encode).

### `relate(subject, predicate, obj, author=None) -> dict`

Stores a structured subject-predicate-object fact, e.g. relating one
tracked organization to a person who works there. `predicate` is
conventionally `UPPER_SNAKE_CASE` (not enforced by the tool). Internally
this is stored as its own node with `node_type="Relation"` and a label of
the form `subject —[predicate]→ object`.

Returns `{"ok": true, "id": <relation_id>}`.

### `query(text, top_k=10) -> list[dict]`

Runs a hybrid semantic + lexical search over the shared context and
returns up to `top_k` ranked results. Each result has:

```
{
  "label": str,
  "body": str | None,
  "node_type": str | None,
  "source": str | None,
  "author": str | None,
  "similarity": float,
  "rrf_score": float
}
```

Retrieval pipeline: text → extracted signals → synonym expansion → an
engram vector → an approximate (Hamming-distance) nearest-neighbor search
over the store → a BM25 lexical re-rank of the candidates → top-K by
combined score. A minimum similarity threshold filters candidates before
the BM25 pass.

Any answer built from these results should be grounded in and attributed
to the specific result(s) it drew from, not treated as ambient knowledge.

### `get_entity(name, top_k=15) -> list[dict]`

Thin wrapper over `query`, biased toward an exact name — returns
everything currently known that mentions a given person, organization, or
engagement by name. Same result shape as `query`.

### `list_ontology_types() -> dict`

Returns the full current entity ontology as `{type_name: {"description":
str, "fields": list[str]}}`. The built-in types are `Org`, `Person`,
`Engagement`, `Playbook`, `Artifact`, and `Product`; a small fixed set of
non-entity signal roles (`DATE`, `TIME`, `LOC`, `EVENT`, `CONCEPT`) also
exists for signal extraction but is not itself an entity type.

### `register_new_entity_type(name, fields, description="") -> dict`

Adds a new entity type to the ontology at runtime — the mechanism for
extending the ontology without a code change. `fields` is a list of
field-name strings the new type is expected to carry (advisory; not
schema-enforced elsewhere). Returns `{"ok": true, "registered": <name>}`.

The ontology itself lives in a JSON registry file, not in code — adding a
type either through this tool or by editing that file directly has the
same effect, and both take effect without restarting the service module
that reads it.

## Notes on tool design

- Every write tool is idempotent-by-id where the id is derived
  deterministically from its inputs (label/source for `remember`,
  subject/predicate/object for `relate`), so re-running the same call
  replaces rather than duplicates the row.
- There is no delete tool exposed over MCP; removing a row requires
  direct store access outside the MCP surface.
- All six tools are synchronous, in-process calls against a local SQLite
  database — there is no queuing, batching, or async write path.
