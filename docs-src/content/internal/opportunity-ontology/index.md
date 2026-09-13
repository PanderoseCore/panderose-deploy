---
sidebar_position: 1
title: Opportunity / Ontology Program
---

# Opportunity / Ontology Program

This section documents the Panderose opportunity/ontology program, backed
by [`cambium`](https://github.com/jhockersmith/cambium).

This session couldn't pull `cambium`'s actual code into this docs build —
this repo (`panderose-deploy`) and `cambium` are owned by different GitHub
accounts, and this session is scoped to one owner at a time, so cloning it
here would have required starting a separate session. Rather than guess at
cambium's design, this page is a placeholder with the intended shape:

## What should live here

- **Concept overview** — what the ontology models, what "opportunity" means
  in this system, and how it's structured.
- **API reference** — once cambium exports its OpenAPI spec, drop it at
  `specs/internal/cambium.json` (see [`specs/README.md`](/internal)) and it
  renders here automatically via the OpenAPI plugin — no hand-written
  reference needed.
- **Integration guide** — how other internal services are expected to read
  from / write to the ontology.

## Next step

Have a session scoped to `jhockersmith/cambium` (or add it as this repo's
initial source in a fresh session) pull the real spec and API shape, then
replace this placeholder with the actual concept doc and drop the spec file
in `specs/internal/`.
