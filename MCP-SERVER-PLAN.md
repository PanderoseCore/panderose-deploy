# A public MCP server for panderose.com

**Status: done, via Cloudflare AI Search — not custom-built.** This file
originally scoped a from-scratch Worker for this; superseded once Cloudflare
AI Search was set up on the account (see `CLOUDFLARE-SETUP.md`) and turned
out to already provide it. Left in place as the record of what's live and
why a custom build isn't needed on top of it.

## What's live

- **Endpoint**: `https://search.panderose.com/mcp` — Streamable HTTP
  transport, no auth (fine here: it only serves the same public content
  already on the site).
- **Tool**: `search(query)` — semantic/hybrid search over panderose.com's
  pages. Verified working directly (`tools/list` and an `initialize` round
  trip both returned correctly).
- **How it stays current**: it's a Cloudflare AI Search instance with the
  website connected as a data source — Cloudflare crawls and re-indexes the
  live site itself, rather than reading a hand-maintained fact sheet. That's
  better than the original plan here, which would have needed a second
  source of truth kept in sync with the HTML by hand.
- **Discoverability**: linked from `/llms.txt` under "For agents" so an
  agent that reads that file first knows to call this instead of scraping
  pages one at a time.

## What the original plan proposed (for reference, not pursued)

A hand-written Cloudflare Worker exposing typed tools —
`get_company_overview`, `get_clerid_overview`, `get_compliance_status`,
`search_news`, `list_pages` — each backed by a small fact sheet kept in this
repo. Cloudflare AI Search's single `search` tool over live-crawled content
covers the same need with less to maintain: one index that tracks the site
instead of five endpoints and a duplicate data file. Worth revisiting only
if a specific structured query (e.g. "just the UEI, not a paragraph
containing it") turns out to matter enough to justify typed tools on top of
free-text search — no sign of that yet.

## One thing worth checking periodically

The "Bot protection may block crawling" note in Cloudflare's own AI Search
docs: if Bot Management, WAF, or Turnstile rules ever get added to this
zone, they apply to AI Search's own crawler too and can silently stop it
from re-indexing new pages. No such rules are in place as of this setup
(only AI Crawl Control, which governs external bots, not Cloudflare's own
AI Search crawler) — just something to recheck if the search tool ever
starts returning stale results.
