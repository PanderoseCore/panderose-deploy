# A public MCP server for panderose.com — scoping notes

Not built yet. This is the design sketch for a follow-up task, written so
whoever (or whichever Claude session) picks it up next doesn't have to
re-derive the reasoning.

## Why this is a different thing from the crawler/SEO pass

Everything else in this round (robots.txt, llms.txt, JSON-LD, Cloudflare's
AI Crawl Control) makes the *existing static pages* cheaper and more
reliable for an agent to read. An MCP server is a step further: instead of
an agent inferring structured facts from prose, it calls a typed tool and
gets a typed answer — no parsing, no risk of misreading a page, and it can
serve data that doesn't have a good static-page shape (e.g. "is this the
current UEI" as a single fact rather than a paragraph to re-read each time).

Worth it once the static-content pass is live and you want the next
increment; not a prerequisite for anything else in this round.

## Proposed tool surface

Keep it read-only and scoped to what's already public on panderose.com —
this is not a channel into anything gated:

- `get_company_overview()` — name, legal name, founding date/location,
  founders, one-paragraph description. Mirrors the Organization JSON-LD
  already on `index.html`.
- `get_clerid_overview()` — product description, the three configured
  domains (vendor screening, capital projects, contract tracking),
  links to the enterprise/investor pages for more detail.
- `get_compliance_status()` — SAM.gov status, UEI, NIST SP 800-171 / CMMC
  posture, as published on `/compliance`. High-value for procurement-side
  agents specifically screening vendors — this is close to the audience
  Clerid itself serves.
- `search_news(query?)` — returns the dated announcements from `/news`,
  structured (headline, date, description) instead of scraped HTML.
- `list_pages()` — a directory of every public URL with its title and
  `dateModified`, i.e. `llms.txt` as a callable tool instead of a static
  file, for a client that wants to decide what to fetch next itself.

Each tool's response should cite the source page URL, so an agent surfacing
this to a person can link back to panderose.com rather than presenting it as
free-floating fact — same spirit as `Redirects for AI Training` canonicalizing
crawler traffic back to the real page.

## What it would take to build

- Cloudflare Workers + the Agents SDK, per
  `developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/`
  — Streamable HTTP transport, no auth needed since every tool only returns
  already-public information.
- Content source: either read the same static HTML/JSON-LD this repo already
  serves (fetch + parse at request time, cached), or maintain a small
  hand-written JSON/YAML fact sheet in this repo that both the MCP server and
  the static pages pull from — the second avoids scraping your own site but
  is a new single source of truth to keep in sync with the HTML. Worth a
  decision before starting, not during.
- Hosting: a Worker, deployed separately from the Azure static site — e.g.
  `mcp.panderose.com`, its own Cloudflare DNS record. Independent of the
  Azure/Cloudflare proxy work in `CLOUDFLARE-SETUP.md`.
- No secrets, no write path, no user data — this stays clear of the SBIR/
  background-IP boundary concerns that apply elsewhere in the Panderose
  codebase (that boundary is a Clerid/cambium concern, not relevant to a
  public marketing-site MCP server).

## Not now

Skipping for this round per your call — revisit once the crawler/SEO changes
are live and you have a sense of whether AI-driven traffic to the static
pages is showing up in Cloudflare's AI Crawl Control metrics. That data
should inform whether an MCP server is worth the build, or whether the
static pages plus `llms.txt` are already doing the job.
