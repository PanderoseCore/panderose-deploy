---
sidebar_position: 4
title: pdr-lapse
---

# pdr-lapse

## What it is

`pdr-lapse` is a standalone temporal-decay library: one decay curve and a
stale/low-signal threshold check, with no storage opinion of its own. It
does not know about Neo4j, Postgres, bitemporal ranges, or any consumer's
node/claim model — those decisions stay in each consumer.

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

The curve is `initial * e^(-ln2 * elapsed / half_life)`. "Reset on
confirm" is left to the caller — it's just storing a new reference
timestamp; `ExponentialDecay().reset(now=...)` exists for that and simply
returns `now`.

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
shared analogue), and any storage/write-back logic — it computes a
number, it does not decide how or where that number gets persisted.

## Install

Not published to a package index. Install pinned to a specific commit:

```
pip install "pdr-lapse @ git+https://github.com/jhockersmith/pdr-lapse.git@<commit sha>"
```

Both current consumers pin this way; each one's own dependency file names
the exact commit it uses.

## Module layout

```
src/pdr_lapse/
  core.py         rate_from_half_life, decay_factor — the curve itself
  exponential.py  ExponentialDecay — a ready-made DecayFunction implementation
  threshold.py    should_flag — the stale/low-signal gate
  protocol.py     DecayFunction — the interface a decay mechanism satisfies
  py.typed        marks the package as fully typed for downstream mypy/pyright
```

## API reference

### `decay_factor(elapsed: timedelta, half_life: timedelta, *, initial: float = 1.0) -> float`

The core curve: `initial * e^(-ln2 * elapsed / half_life)`.

- `elapsed` — time since the reference point (e.g. since last
  confirmation). Negative or zero returns `initial` unchanged.
- `half_life` — the time at which the value reaches half of `initial`.
  Must be positive; a non-positive `half_life` raises `ValueError`.
- `initial` — starting confidence (Cambium's `confidence_0`; RemMe always
  passes `1.0`). Must be positive; a non-positive value raises
  `ValueError`.

Returns a value that decays asymptotically toward zero — in practice
strictly positive for any realistic input, though a 64-bit float
underflows to exactly `0.0` past roughly 1024 half-lives elapsed.

### `rate_from_half_life(half_life: timedelta) -> float`

Converts a half-life directly to a per-second decay rate (`lambda =
ln(2) / half_life_seconds`). Raises `ValueError` if `half_life` is not
positive. `decay_factor` calls this internally; it is exposed separately
for a caller that wants the bare rate (matching RemMe's
`decay_factor(t) = e^(-lambda * days)` form) rather than working in
half-lives directly.

### `class ExponentialDecay`

A frozen dataclass implementing the `DecayFunction` protocol, for a
consumer that wants the protocol satisfied without writing its own thin
wrapper around `decay_factor`.

- `score(*, elapsed: timedelta, half_life: timedelta, initial: float = 1.0) -> float`
  — delegates directly to `decay_factor`.
- `reset(*, now: datetime) -> datetime` — returns `now` unchanged.
  "Reset on confirm" has no state of its own to update: the caller stores
  the returned timestamp as its new reference point (RemMe's
  `last_accessed`, Cambium's `last_confirmed`), and the next `score()`
  call computes `elapsed` from that new reference.

### `class DecayFunction(Protocol)`

A `runtime_checkable` `Protocol` describing the shape any decay mechanism
must satisfy to be used interchangeably by a consumer that dispatches
across more than one mechanism (this package implements only the
continuous-decay branch; a consumer like Cambium that also has
hard-expiry and refutation-only mechanisms implements those separately
against the same protocol):

```python
class DecayFunction(Protocol):
    def score(self, *, elapsed: timedelta, half_life: timedelta, initial: float) -> float: ...
    def reset(self, *, now: datetime) -> datetime: ...
```

### `should_flag(decay_factor: float, touch_count: int, *, decay_threshold: float, touch_threshold: int) -> bool`

The stale/low-signal gate: `True` only if the decay factor has fallen
below `decay_threshold` **and** the touch count is below
`touch_threshold`. A decay factor alone is not a verdict — something
heavily decayed but still frequently touched is a materially different
case from something decayed and ignored, and this gate requires both
conditions to hold before flagging. Generalizes RemMe's `should_archive`
gate and matches the shape of Cambium's `VALID → SUSPECT` transition
check; the function is named generically (`should_flag`, not
`should_archive` or a Cambium-specific name) because each consumer
attaches its own meaning to a positive result.

## Conventions

- Fully typed (`py.typed` marker included); no dependency on any
  consumer's storage or domain model — the package computes a number and
  returns it; it never decides how or where that number gets persisted.
- Durations are always `timedelta`, never a bare number of days or
  seconds, so a caller cannot silently mix units.
- Naming stays deliberately generic (`should_flag`, not a
  consumer-specific verb) since more than one consumer attaches its own
  meaning to the same gate.
