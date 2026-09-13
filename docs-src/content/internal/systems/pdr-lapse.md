---
sidebar_position: 3
title: pdr-lapse
---

# pdr-lapse

## What it is

`pdr-lapse` is a small, standalone temporal-decay library: one decay curve
and a stale/low-signal threshold check, with no storage opinion of its
own. It does not know about Neo4j, Postgres, bitemporal ranges, or any
consumer's node/claim model — those decisions stay in each consumer.

```python
from datetime import timedelta
from pdr_lapse import decay_factor, should_flag

confidence = decay_factor(
    elapsed=timedelta(days=12),
    half_life=timedelta(days=18),
    initial=0.9,
)

flag = should_flag(confidence, touch_count=1, decay_threshold=0.5, touch_threshold=3)
```

The curve is `initial * e^(-ln2 * elapsed / half_life)`. "Reset on confirm"
is left to the caller — it's just storing a new reference timestamp;
`ExponentialDecay().reset(now=...)` exists for that and simply returns
`now`.

## Origin and consumers

Extracted from RemMe's `services/decay.py` (`compute_decay`,
`should_archive`), which was already in production before this package
existed — same formula and reset-on-confirm semantic, generalized from
RemMe's node-type-keyed rate table into a plain `(elapsed, half_life)`
signature. [Cambium's](/internal/opportunity-ontology) decay documentation
independently describes the same curve, parameterized by half-life
directly; a regression test in this repository pins this package's output
against RemMe's rate-based formula so the two consumers cannot silently
drift apart.

Current consumers:
- [`remme`](./remme), `services/decay.py`
- [`cambium`](/internal/opportunity-ontology), `src/cambium/decay/`

What this package deliberately does **not** cover: hard-deadline expiry or
refutation-only staleness (both consumer-specific mechanisms with no
shared analogue), and any storage/write-back logic — it computes a number,
it does not decide how or where that number gets persisted.

## Install

Not published to a package index. Install pinned to a specific commit:

```
pip install "pdr-lapse @ git+https://github.com/jhockersmith/pdr-lapse.git@<commit sha>"
```

Both current consumers pin this way; see each one's own dependency file
for the exact commit it currently uses.

## Layout

```
src/pdr_lapse/
  core.py         decay_factor, rate_from_half_life
  exponential.py  ExponentialDecay (stateful wrapper, reset-on-confirm)
  threshold.py    should_flag
  protocol.py     DecayFunction protocol, for alternate decay curves
```

## Conventions

- Fully typed (`py.typed` marker included); no dependency on any consumer's
  storage or domain model.
- The library takes durations as `timedelta` rather than bare numbers so
  callers can't silently mix units (days vs. seconds vs. an implicit rate).
