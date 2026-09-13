---
sidebar_position: 1
title: "Clerid — internal"
---

# Clerid — internal

See the [public product page](/products/clerid) for the shipped-product
view. This page covers the internal source/build side.

## What it is

Clerid — "Records Intelligence" — is a Windows desktop application that
turns unstructured government and business records into structured,
classified, reviewable datasets. One engine (ingest a source, extract
structured records, classify them, flag what needs review, keep a sourced
review trail) is configured per **domain**. Two domains ship today:

- **Vendors** — screens a monitored vendor universe against
  economic-dependency criteria (ASC 280, SFFAS 47, OMB A-123 §IV, NDAA
  FY2020 §847 FOCI indicators): a quadrant dashboard, a filterable vendor
  universe, a per-vendor side panel, an investigations workflow, per-vendor
  audit evidence packages, and full run provenance.
- **Contract Actions** — extracts AEC-related contract actions (award,
  amendment, task order, work authorization, renewal, change order,
  extension, termination) from unstructured city/county/state meeting
  agendas and minutes, classified by service type, market sector, and
  action type — one row per action rather than per contract.

Adding a third domain is meant to be "write a config," not "build another
module." Everything runs locally; nothing from a loaded dataset is
uploaded anywhere as part of normal use.

Both shipping domains currently implement extraction (Level 1) and
classification (Level 2) only; cross-jurisdiction budget integration,
geocoding, live media monitoring, and awarded-firm background research are
not built — see each domain's extraction prompts under `pipeline/docint/`
for the current extraction scope.

## Architecture

- **Electron app** (`electron/`, `renderer/`) — the desktop shell and UI.
  `renderer/` holds the domain UI (dashboard, side panels, review gate),
  vendored fonts/assets, and a local-search/vector fallback (`vendor/`) —
  the same retrieval kernel later promoted out into the [`fox`](./fox)
  context server.
- **Pipeline** (`pipeline/`) — Python, invoked by Electron as subprocesses.
  `pipeline/docint/` holds document ingestion, discovery, and extraction
  (contracts, firm research, a research cache); `pipeline/vendor_llm/`
  wraps SAM.gov, USAspending.gov, SEC EDGAR, and revenue extraction for the
  Vendors domain; `pipeline/vedat/` is the vendor-assessment schema,
  thresholds, caching, and manifest layer. `pipeline/clerid_pipeline_main.py`
  is a single dispatch entry point covering every CLI subcommand Electron
  spawns (e.g. `extract-contracts`, `check-env`).
- **On-demand assessment** ("Assess now") runs a real pipeline
  (SAM.gov → USAspending.gov → SEC EDGAR → revenue extraction → tier
  classification → audit PDF) rather than a simulation, and needs outbound
  network access to those services.
- **Data model** — an assessment (or a domain's records) is a flat JSON
  file (`{records, run_log}` for Capital Projects/Contracts;
  vendor-universe JSON for Vendors); **Open file…**/**Save** persist and
  reload it, with the last-opened file remembered per domain. A `run_log`
  on every extraction (elapsed time, files, chunks, LLM calls, records
  extracted, every error) is the running answer to time/cost/error
  tracking for a run, surfaced live rather than written up separately.
- A bundled demonstration dataset (`data/demo-assessment.json`) exercises
  every Vendors tier; every record in it is synthetic and explicitly
  flagged `synthetic: true`.

## Running from source

```bash
npm install
npm start
```

Python 3.9+ is also needed on the machine (`pip install -r
pipeline/requirements.txt`) — a packaged release instead freezes the whole
pipeline (including the OCR toolchain) into the executable via PyInstaller,
so an end user needs nothing beyond the two optional API keys below.

Two API keys configure optional/required capability, set under
**Settings**:

- `SAM_API_KEY` — optional, Vendors domain only; without it,
  entity-identity resolution is skipped in favor of name-based lookup.
- `GROQ_API_KEY` — optional for Vendors (NLP-fallback and alt-source
  paths only); **required** for Capital Projects and Contract Actions,
  which have no non-LLM path to parse free-form source documents.

Building a real Windows release freezes the pipeline first (PyInstaller,
must run on Windows), then builds the Electron app around it
(`electron-builder`). See the repository's own `README.md` for the full
freeze/build/release command sequence — that level of packaging detail is
build-tooling reference rather than product architecture and is included
here only at a summary level.

## Conventions

- End-to-end tests under `tests/e2e/` use Playwright to drive the packaged
  Electron app.
- The pipeline is designed to degrade gracefully and explain what's
  missing (Python/package presence, missing API keys) rather than fail
  partway through a run — this mirrors [Cambium's](/internal/opportunity-ontology)
  "no silent failure" convention even though the two repositories are
  otherwise independent.
