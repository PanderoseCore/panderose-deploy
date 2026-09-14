---
sidebar_position: 2
title: "Cambium — demonstration scripts"
---

# Cambium — demonstration scripts

See [Cambium](./) for the engine these demonstrations exercise.

## Purpose

Two scripts exercise Cambium's full decision-lifecycle engine end to end
against real, cited, publicly-sourced historical case data rather than
synthetic fixtures — demonstrating the schema and evaluators against a
case with genuine stakes and genuine ambiguity, not a toy example built
to make the system look good. Both follow a strict sourcing discipline:
every figure traces to a cited public source, and a figure that cannot be
sourced is left absent and the gap is marked explicitly rather than
filled with an invented number.

**Demo 1** is a **point-in-time trade study**: one Source, several
Entities (one per alternative under consideration), the criterion-score
Claims and narrative assumption Claims backing them, a Need with its
status-quo Option plus the alternative Options, a Decision considering
all of them and assuming every Claim, two sealed Evaluations using
different weighting assumptions over the same criterion matrix, and a
printed "what flips the decision" brief computing closed-form
sensitivity margins.

**Demo 2** is a **multi-episode, long-horizon decision program**: several
real historical decision episodes connected across time, with a later
episode explicitly following from an earlier one rather than re-deriving
shared figures independently.

## Patterns demonstrated

- **Composing the full object graph through the public API** —
  `create_source`, `create_entity`, `create_need`, `create_option`,
  `create_decision`, `insert_claim`, `add_decision_considers`,
  `add_decision_assumes` — rather than constructing rows directly, so
  the demos double as a working integration example of the store's
  repository layer.
- **Sealed, weighting-assumption-driven evaluation** — `WeightedSumEvaluator`
  registered and run twice over one criterion matrix with two different
  named weighting assumptions, each producing its own sealed evaluation
  record via `register_evaluator`/`seal_evaluation`, so two committee
  members' differing priorities are both preserved as distinct, auditable
  evaluation runs rather than one evaluator overwriting the other's
  result.
- **`decision_link` chaining (edge type `R6`, `STRONG_COUPLING`)** — one
  Decision pointing explicitly at the Decision it followed from, used
  across the multi-episode demo to connect a chain of decisions the way
  the schema supports generally: a real, queryable edge rather than
  shared-Need membership or prose narration. This is the general pattern
  for representing "this decision revisited that one" without requiring
  every episode to share one Need object.
- **Extending a demo module for reuse rather than duplicating it** — the
  point-in-time demo's `run()` function gained an optional
  `need_id`/`status_quo_option_id` parameter pair so a second scenario
  could attach its own Decision to a caller-supplied Need instead of
  always creating its own; a later scenario reuses the first module's
  `run()` directly rather than re-deriving the same source figures a
  second time.
- **Sensitivity / "what flips the decision" reporting** — both demos
  print a closed-form sensitivity brief from `evaluate.base.FlipResult`,
  the same mechanism [Cambium's](./) sensitivity gate uses to decide
  whether a stale claim needs to escalate.

## Running them

```bash
python -m demos.demo1     # or: make demo-1
python -m demos.demo2     # or: make demo-2
```

Both run end to end against a clean database. Each has a corresponding
test that re-derives the demo's own transcribed source figures from the
underlying published report and checks them against the demo's stored
criterion data to a stated tolerance, catching transcription drift rather
than only checking that the script runs without error.

## Conventions

- No invented numbers: every figure traces to a citation; an unsourced
  figure is left absent and the gap is stated, not filled.
- A demo built on real historical data is written to be accurate and
  fair to the people and organizations involved in that history, not
  structured to make a case for or against any of them.
