---
sidebar_position: 6
title: Dendro
---

# Dendro

## What it is

A capture → transcribe → log pipeline for RTL-SDR/HackRF software-defined
radios: point it at a frequency, let it run, and get back a timestamped
log of whatever was said over the air, with simple keyword extraction for
a quick recap. Panderose IP originating from an early-stage contract
engagement; classified internal.

Two independent front ends share the same capture chain:

1. **CLI** (`listening_post.py` + `summarize.py`) — standalone, spawns
   `rtl_fm` itself, writes a JSONL log, run-and-forget.
2. **Dashboard** (`sdr-dashboard/`) — a WebSocket backend driving an
   Electron frontend, for watching transcripts land live.

## Architecture

```
rtl_fm (subprocess) -> raw audio -> sox -> 16kHz mono WAV
                                              |
                                      faster-whisper (CPU, int8)
                                              |
                                        transcript text
                                              |
                        keyword extraction (stopword-filtered word
                        frequency, top 6 per clip)
```

The CLI runs this chain in a loop, appending each clip's result as one
JSON line to a log file. The dashboard backend
(`sdr-dashboard/backend/server.py`) runs the identical chain inside an
asyncio loop and broadcasts each stage as a WebSocket event to every
connected client instead of writing to a file, so multiple dashboard
windows can watch one capture session simultaneously.

### Dashboard WebSocket protocol

Server listens on `ws://localhost:8765`.

Client → server:
```json
{"cmd": "start", "freq": "118.3M", "mode": "am", "duration": 20,
 "label": "session label", "model": "base.en", "device": "", "gain": ""}
{"cmd": "stop"}
```

Server → client:
```json
{"type": "status", "state": "idle" | "listening", ...}
{"type": "capturing", "timestamp": "..."}
{"type": "transcript", "timestamp": "...", "freq": "...", "mode": "...",
 "label": "...", "text": "...", "keywords": [...], "clip_count": N}
{"type": "error", "message": "..."}
```

Backend and frontend communicate only over this WebSocket connection —
there is no other coupling between them, and the backend has no HTTP
surface beyond the socket. The Electron frontend (`sdr-dashboard/
electron/`) connects as a client, exposes frequency presets, a start/stop
control, a live transcript feed, a running keyword tally, and an
animated capture-in-progress indicator. Everything runs on localhost;
network use is limited to the one-time Whisper model download.

## CLI reference

### `listening_post.py`

```
listening_post.py --freq FREQ [--mode {fm,am,wbfm,usb,lsb}]
                   [--duration SECONDS] [--label TEXT] [--out FILE]
                   [--model MODEL] [--clips N]
```

| Flag | Default | Meaning |
|---|---|---|
| `--freq` | required | capture frequency, e.g. `118.3M`, `145.960M` |
| `--mode` | `fm` | demodulation mode: `fm` (narrowband — ham repeaters, NOAA weather radio), `am` (airband/AM broadcast), `wbfm` (broadcast FM), `usb`/`lsb` (HF single sideband) |
| `--duration` | `20` | seconds captured per clip; shorter is more responsive but choppier (sentences cut mid-word), longer is cleaner but laggier |
| `--label` | `""` | a label attached to every clip in this session |
| `--out` | `session.jsonl` | JSONL log file, appended to |
| `--model` | `base.en` | faster-whisper model; `tiny.en` is fastest/least accurate, `small.en` noticeably better if the machine keeps up; non-`.en` variants only needed for non-English audio |
| `--clips` | `0` (unlimited) | stop after this many clips instead of running forever |

Stops cleanly on Ctrl+C with nothing lost, since each clip is appended to
the log as it completes rather than buffered until exit.

```bash
python3 listening_post.py --freq 118.3M --mode am --duration 20 \
    --label "session label" --out session.jsonl
```

### `summarize.py`

```
summarize.py LOGFILE
```

Reads a JSONL log and prints: time span, clip count, percentage of clips
with detected speech, frequencies monitored, top keywords (simple
frequency count, stopwords stripped), and a timeline of every non-empty
transcript.

### Dashboard backend

```bash
cd sdr-dashboard/backend
pip3 install -r requirements.txt --break-system-packages
python3 server.py
```

Prints `SDR Listening Post backend on ws://localhost:8765` once ready.
The Whisper model downloads on first "start" command (~150MB) — worth
doing once on a stable connection before relying on it away from wifi.

### Dashboard frontend

```bash
cd sdr-dashboard/electron
npm install
npm start
```

## Setup requirements

macOS: `brew install librtlsdr sox`
Linux (Debian/Ubuntu): `sudo apt install rtl-sdr sox`

Both front ends additionally need `pip3 install faster-whisper
--break-system-packages` (CLI) or the dashboard backend's
`requirements.txt` (websockets + faster-whisper). Real RTL-SDR/HackRF
hardware is required — there is no simulated-capture mode.

## Conventions

- Keyword extraction is deliberately simple word-frequency with stopword
  filtering, not real NLP — sufficient for "what came up a lot," not for
  anything treated as an authoritative summary.
- Only `.en`-suffixed Whisper models are used unless capturing
  non-English audio.
- No hardened error handling exists yet for common flaky conditions (for
  example `rtl_fm` failing to open a device already claimed by another
  program) — a capture failure surfaces as a WebSocket `error` message
  (dashboard) or a CLI error (standalone), not a silent skip.
