---
sidebar_position: 2
title: Clerid
---

# Clerid

Clerid is a records intelligence desktop application from Panderose. It turns unstructured government and business records into structured, classified, and reviewable datasets.

Official releases: [github.com/Panderose/Clerid](https://github.com/Panderose/Clerid) (Windows, no source code — this repository hosts releases only).

## What Clerid does

Clerid ingests source documents, extracts structured records, classifies them, flags items that need review, and keeps a sourced, reviewable trail for every result. Two record types are supported today.

**Vendors**
Screens a monitored vendor universe against economic dependency criteria. Includes a filterable vendor universe, per vendor detail, an investigations workflow, audit evidence packages, and full run provenance.

**Contract Actions**
Extracts contract actions, such as awards, amendments, task orders, renewals, and terminations, from government meeting agendas and minutes. Each action is classified by service type, market sector, and action type.

All processing runs locally. No data is uploaded to Panderose or any third party.

## System requirements

| Requirement | Detail |
|---|---|
| Operating system | Windows 10 or later, 64 bit |
| Disk space | 500 MB minimum |
| Python | Required for document extraction features. Clerid checks for Python on first run and reports what is missing. |

## Installation

1. Go to the [Releases](https://github.com/Panderose/Clerid/releases) page.
2. Download the latest `Clerid-Setup-<version>.exe`.
3. Run the installer and follow the prompts.

## Updates

Clerid checks for new versions automatically each time it starts, and periodically while it stays open. When an update is available, it downloads in the background and prompts you to restart when ready. Updates can also be checked manually from Settings.

## Support

For issues or questions, open an issue in the [releases repository](https://github.com/Panderose/Clerid).

## License

Copyright Panderose. All rights reserved.
