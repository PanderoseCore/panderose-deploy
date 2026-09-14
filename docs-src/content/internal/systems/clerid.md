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
  action type — one row per action rather than per contract, so a document
  does not need to be pre-sorted into a document-type bucket before Clerid
  can read it.

Adding a third domain is a configuration change, not a new module — the
domain layer only supplies vocabulary, extraction prompts, and a schema;
the ingest/extract/classify/review engine underneath is shared. Everything
runs locally; nothing from a loaded dataset leaves the machine as part of
normal use.

Both shipping domains currently implement extraction (Level 1) and
classification (Level 2) only; cross-jurisdiction budget integration,
geocoding, live media monitoring, and awarded-firm background research are
not built — see each domain's extraction prompts under `pipeline/docint/`
for the current extraction scope.

## Module layout

```
electron/
  main.js            Electron main process; resolves and spawns the Python
                     pipeline (dev: python interpreter, packaged: the
                     frozen clerid_pipeline executable)
renderer/
  (domain UI)         dashboard, per-record side panels, review-gate UI
  vendor/               vendored local-search/vector fallback — the
                        predecessor of the retrieval kernel now standalone
                        in the [`fox`](./fox) context server
pipeline/
  clerid_pipeline_main.py   single dispatch entry point for the frozen
                            standalone executable (see CLI below)
  clerid_pipeline.spec       PyInstaller build spec
  assess_one.py               single-vendor on-demand assessment
  check_env.py                  environment/dependency probe
  discover_documents.py           source-document discovery
  research_firm.py                  firm background research
  download_candidates.py             candidate-document download
  link_firm_identity.py                entity-identity resolution helper
  assist_prompt.py                       LLM prompt-assist helper
  llm_common.py           shared LLM call wrapper (see below)
  extract_contracts.py     Contract Actions extraction driver
  docint/
    cli.py                shared CLI runner for a docint extraction target
    contracts.py            Contract Actions extraction logic
    discover.py               document discovery
    extract_text.py             PDF/DOCX text extraction (parallelized via
                                ProcessPoolExecutor for multi-page PDFs)
    firm_research.py              firm-background research logic
    research_cache.py               on-disk cache for research lookups
  vendor_llm/
    usaspending.py         USAspending.gov API client
    edgar.py                  SEC EDGAR API client
    revenue_extractor.py        revenue extraction from filings
  vedat/
    schema.py              vendor-assessment record schema, enums
                            (ExtractionMethod, TierClassification,
                            ReviewStatus/Disposition, ContractTypeRisk, ...),
                            and record validation (blank_audit_record,
                            make_no_match_record, validate_record)
    thresholds.json           tier-classification thresholds
    manifest.py                 run manifest / provenance recording
    cache.py                      on-disk cache layer
    pipeline.py                     Vendors domain assessment orchestration
    config.py                         Vendors-domain configuration
tests/
  e2e/                    Playwright end-to-end tests against the packaged
                          Electron app
```

## Architecture

### Electron/pipeline split

The Electron app is the UI and orchestration shell; every extraction,
research, or assessment operation is delegated to a Python subprocess
rather than implemented in JavaScript. In development, Electron spawns
the system Python interpreter against the relevant script directly; in a
packaged release, it spawns a single frozen executable
(`clerid_pipeline.exe`) with a subcommand, since one frozen executable
sharing one Python runtime and one copy of its heavy dependencies (numpy,
pandas, pdfplumber, an LLM SDK, `requests`) avoids duplicating that
runtime once per script — freezing each script independently would
duplicate several hundred megabytes of shared dependencies that many times
over.

### CLI (frozen pipeline)

```
clerid_pipeline <subcommand> [args...]
```

| Subcommand | Backing module | Purpose |
|---|---|---|
| `extract-contracts` | `docint.contracts` via `docint.cli` | Contract Actions extraction |
| `check-env` | `check_env` | reports present/missing Python packages and system dependencies as JSON |
| `assess-one` | `assess_one` | on-demand single-vendor assessment (SAM.gov → USAspending.gov → SEC EDGAR → revenue extraction → tier classification → audit PDF) |
| `discover-documents` | `discover_documents` | finds candidate source documents for a target |
| `research-firm` | `research_firm` | firm background research |
| `download-candidates` | `download_candidates` | downloads discovered candidate documents |
| `link-firm-identity` | `link_firm_identity` | resolves a firm name to a canonical entity identity |
| `assist-prompt` | `assist_prompt` | LLM prompt-assist helper used by the extraction UI |

The dispatcher strips its own subcommand off `sys.argv` before handing
control to the target module's `main()`, so every module's own argparse
handling is unchanged whether it runs standalone (`python assess_one.py
--firm ...`) or through the frozen dispatcher
(`clerid_pipeline.exe assess-one --firm ...`). The frozen build
deliberately excludes the optional spaCy-based NLP fallback path (an
already-optional, gracefully-degrading feature) to keep the installer
size down.

### LLM call layer (`pipeline/llm_common.py`)

A shared, hardened wrapper around cloud LLM calls used by every
extraction path that needs one: automatic failover between two providers
(so one provider's rate limit does not fail an entire run), per-provider
rate gating and concurrency limits, retry-with-backoff on rate-limit and
transient errors, token estimation, and per-call usage/cost tracking. This
module is the proven pattern
[Cambium's](/internal/opportunity-ontology) own agent-layer LLM call
plumbing was later modeled on.

### Data model

An assessment (or a domain's extracted records) is a flat JSON file:
`{records, run_log}` for Capital Projects/Contract Actions, a
vendor-universe JSON for Vendors. **Open file…**/**Save** persist and
reload it, with the last-opened file remembered per domain. The Vendors
domain's record schema and enums live in `vedat/schema.py`
(`ExtractionMethod`, `TierClassification`, `ReviewStatus`/
`ReviewDisposition`, `ContractTypeRisk`, `UeiResolutionSource`, and
others), with `validate_record()` enforcing shape before a record is
accepted and `make_no_match_record()`/`blank_audit_record()` producing the
two other well-defined record shapes (no-match, blank audit).

A `run_log` on every extraction (elapsed time, files, chunks processed,
LLM calls, records extracted, every error encountered) is the direct,
running record of a run's time/cost/error profile, surfaced live under the
domain's title as the run proceeds rather than written up separately
afterward.

A bundled demonstration dataset (`data/demo-assessment.json`) exercises
every Vendors tier; every record in it is synthetic and explicitly flagged
`synthetic: true`.

## Running from source

```bash
npm install
npm start
```

Python 3.9+ is also needed on the machine (`pip install -r
pipeline/requirements.txt`) — a packaged release instead freezes the whole
pipeline (including the OCR toolchain for scanned PDFs) into the
executable via PyInstaller, so an end user needs nothing beyond the two
optional API keys below.

Two API keys configure optional vs. required capability, set under
**Settings**:

- `SAM_API_KEY` — optional, Vendors domain only; without it,
  entity-identity resolution is skipped in favor of name-based lookup.
- `GROQ_API_KEY` — optional for Vendors (NLP-fallback and alt-source
  paths only); **required** for Capital Projects and Contract Actions,
  which have no non-LLM path to parse free-form source documents.

Running from source, Clerid checks for Python and required packages
before starting a pipeline run and reports exactly what is missing; a
packaged build skips this check since nothing can be missing.

## Building a release

Two builds happen in order:

```bash
cd pipeline
pip install -r requirements.txt pyinstaller pyinstaller-hooks-contrib
pyinstaller clerid_pipeline.spec --noconfirm
```

This freezes the pipeline into `pipeline/dist/clerid_pipeline/`; it must
run on Windows, since PyInstaller freezes for the OS it runs on and does
not cross-compile. `electron-builder` then packages the Electron app
around the frozen pipeline into the distributable Windows installer.

## Testing

End-to-end tests (`tests/e2e/`) use Playwright to drive the packaged
Electron app directly, covering both domains' extraction and review flows
against fixture data.

## Conventions

- The pipeline is designed to degrade gracefully and explain what's
  missing (a Python package, an API key) rather than fail mid-run — this
  mirrors [Cambium's](/internal/opportunity-ontology) "no silent failure"
  convention even though the two repositories are otherwise independent.
- Every extraction records its own run log rather than relying on an
  external log file to reconstruct what happened during a run.
- New domains are added by supplying a schema, extraction prompts, and a
  UI configuration — never by branching the shared engine's control flow
  on a domain name.
