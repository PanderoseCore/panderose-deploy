# Panderose.com — turning on Cloudflare's AI-crawler tooling

**Status: done.** The zone is proxied, Managed `robots.txt` / AI Crawl
Control / AI Search are on, and `https://search.panderose.com/mcp` is a
live, verified MCP server (see `MCP-SERVER-PLAN.md`). One thing came out of
turning this on that needed a manual follow-up fix — see the callout in
Step 2.1 below — worth reading if you're redoing this on another zone.

Context: per `MIGRATION-GUIDE.md`, `panderose.com`'s DNS already lives on
Cloudflare — it was kept there on purpose during the Azure move, just set to
**DNS only (grey cloud)** so Azure Static Web Apps could issue its own
certificate without Cloudflare terminating TLS in front of it. Hosting stays
on Azure the whole time here — nothing in this guide touches
`staticwebapp.config.json`, the GitHub Actions deploy, or where the site is
served from. This is a Cloudflare *dashboard* change only, and it's
reversible in one click (grey the cloud back out) if anything looks wrong.

Everything below happens at https://dash.cloudflare.com → the `panderose.com`
zone. I don't have credentials to do this myself — walk through it whenever
you have a few minutes at a keyboard.

## Before you start

Confirm the current state matches what the migration guide left behind:

- **DNS → Records**: `@` and `www` are `CNAME` → your Azure
  `*.azurestaticapps.net` hostname, proxy status **grey** (DNS only).
- **SSL/TLS → Overview**: check the current mode. If it's anything other
  than **Full (strict)**, switch it to **Full (strict)** *before* proxying
  traffic — "Flexible" causes a redirect loop once the cloud goes orange
  (this is called out in `MIGRATION-GUIDE.md` step 5b too).

## Step 1 — Proxy the zone

In **DNS → Records**, click the grey cloud icon next to the `@` and `www`
records to turn them **orange (proxied)**. This is the switch that puts
Cloudflare's edge — and everything below — in front of the Azure origin.

Check immediately after:
- `https://panderose.com` and `https://www.panderose.com` still load over a
  valid cert (Cloudflare now serves its own edge certificate for the
  hostname; Azure's own cert stops being the one clients see, but Azure's
  custom-domain validation itself was a one-time TXT check, not an ongoing
  HTTP challenge, so it doesn't need to be redone).
- Clean URLs still resolve (`/about`, `/clerid`, etc.) — confirms Cloudflare
  is proxying through to the same Azure origin, not caching a stale error.
- `curl -sI https://panderose.com | grep -i cf-ray` shows a `cf-ray` header
  — confirms traffic is actually going through Cloudflare now.

If anything looks wrong, click the cloud back to grey — that's a full,
instant revert to the current working state.

## Step 2 — Turn on the AI-crawler features

All of these are in the zone's **AI Crawl Control** section
(Security → Bot traffic → AI Crawlers, or search "AI Crawl Control" in the
dashboard). They only take effect once the zone is proxied (Step 1).

1. **Managed `robots.txt` / Content Signals** — Cloudflare will detect the
   `robots.txt` already served from this repo (with the `Content-Signal:
   search=yes, ai-input=yes, ai-train=no` line added in this pass) and merge
   with it rather than replace it. Confirm in **AI Crawl Control →
   Robots.txt** that it shows as healthy and reflects those signals — that's
   the check that our origin file and Cloudflare's edge layer agree.

   **Gotcha hit on this zone, fix it immediately after turning this on:**
   Managed `robots.txt` merges in a default block list — named
   `User-agent:` groups with `Disallow: /` for `ClaudeBot`, `GPTBot`,
   `Google-Extended`, `Applebot-Extended`, `meta-externalagent`, `Amazonbot`,
   `CCBot`, `Bytespider`, and Cloudflare's own
   `CloudflareBrowserRenderingCrawler` — turned on by default. A crawler
   always obeys the most specific matching group over the wildcard `*`
   group, so this silently overrides the `Allow: /` further down in the
   file for every bot named above: exactly the crawlers this whole
   exercise is trying to attract end up blocked from the entire site.
   **Immediately go to the AI Crawlers tab (step 2 below) and set Allow on
   each one you want reading the site** — don't assume the default state
   matches the goal here. Verified live on 2026-09-14 that this had
   happened and needed the explicit Allow to fix.
2. **AI Crawlers tab** — set **Allow** on `ClaudeBot`, `GPTBot`,
   `OAI-SearchBot`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`,
   and `meta-externalagent` — the crawlers tied to an assistant, chat, or
   answer-engine product that can actually cite panderose.com back to a
   person. That's the whole point of this exercise; don't leave them on
   whatever Cloudflare defaulted them to. Leave pure-scrape bots
   (`Bytespider`, `CCBot`, `Amazonbot`) blocked, or allow them too — that's
   a real, lower-stakes choice either way.
3. **Markdown for Agents** (Quick Actions in AI Crawl Control) — turn this
   on. It lets any agent request a page with `Accept: text/markdown` and get
   a clean markdown conversion instead of parsing full HTML/CSS — directly
   answers the "let Claude navigate the site cheaply" goal, and needs no
   origin-side work since Cloudflare does the conversion at the edge.
4. **Redirects for AI Training** (same Quick Actions panel) — turn this on
   too. It 301s a verified AI-training crawler straight to the
   `<link rel="canonical">` target when one exists, which matters here
   because `/focus-areas`, `/capabilities`, and `/security` already 301
   client-side via `staticwebapp.config.json` — this makes sure crawlers
   don't index those as separate pages from `/company` and `/compliance`.
5. **Metrics tab** — this is where you'll actually see whether any of this
   is working: which AI services are requesting which pages, how often, and
   whether they're respecting `robots.txt`. Worth checking back on
   periodically rather than a one-time setup.
6. **AI Search** — separate from AI Crawl Control, and also on this zone
   now: an AI Search instance with panderose.com connected as a website data
   source, exposed publicly at `https://search.panderose.com/mcp`. See
   `MCP-SERVER-PLAN.md` for what it does. Since it's Cloudflare's own
   crawler indexing the site, it isn't gated by the AI Crawlers tab above —
   but it does respect zone-level Bot Management/WAF/Turnstile rules if any
   get added later (per Cloudflare's own docs), so if search results ever
   go stale, check there first.

## What I deliberately left off

- **Pay Per Crawl** (still closed beta) — monetizing crawler access cuts
  against the stated goal here, which is maximum legitimate visibility, not
  revenue from access. Skip unless that changes.
- **Blocking any AI crawler by default** — `robots.txt` already said
  `Allow: /` before this pass; the new Content-Signal line narrows *how*
  content may be reused, not *whether* it can be read.

## Rollback

Everything here is additive and reversible from the Cloudflare dashboard
alone: grey the DNS records back out to fully exit Cloudflare's edge, or
leave DNS proxied and just flip individual AI Crawl Control toggles off.
None of it requires a redeploy of the Azure site or a change in this repo.
