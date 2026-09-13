# Context: Clerid page redesign (session handoff)

This file summarizes a working session redesigning the Clerid product page,
for anyone (or any fresh Claude session) picking this up next — including
handoff into Claude Design.

## Deploy state — read this first

- **`main`** is what's live on panderose.com right now. It's still the
  original placeholder site (generic "purpose-built software development
  firm" copy, no Clerid page as built here). Confirmed by loading the live
  site and comparing to git history — `main` hasn't moved since the initial
  Azure import commit.
- **`dev`** has all the real work: the Clerid redesign, new assets, and the
  concept exploration page. Nothing here is live yet.
- No GitHub Actions workflow file was found in this repo (checked both
  branches), so how Azure actually pulls from `main` wasn't verified from
  inside this session — worth confirming in the Azure Portal before assuming
  a `dev` → `main` merge will auto-deploy.
- **Nothing has been merged to `main`.** Shipping requires an explicit
  merge + push to `main`, done deliberately, not as a side effect of other work.

## What changed on the live-track page (`clerid.html`)

Went through several rounds based on feedback. Current state:
- Hero: full-bleed (edge-to-edge, breaks out of the normal content gutter),
  rounded panel, rotating through three grayscale photos
  (`assets/clerid/shipping-1.jpg`, `-2.jpg`, `-3.jpg`), centered "Clerid"
  title + intro text on top of a scrim.
- Fixed a real CSS bug: the Problem/Solution grid was nested inside a
  `.block` while also being a `.program-grid`, so two divider lines rendered
  almost on top of each other. Un-nested it to match the pattern already
  used correctly on `clerid-enterprise.html`.
- The three "claims" below now use real product screenshots (not stock
  photos or placeholders): `export-domains.png`, `hero-citation.png`,
  `review-cycle.png`. These came from the user's own saved files
  (`download 1.png`–`download 5.png` in `~/Documents`), sourced from a
  shared "CCA Process Fidelity" walkthrough document — real Clerid runs
  against Delaware DOT records, not synthetic demo data.
- Background changed from a busy blueprint-grid texture (`.page--textured`)
  to a plain surface with a very faint radial glow (`.page--glow`) — the
  grid was judged "messy" and not worth the visual noise.
- A `.text-panel` / `.program-grid__item` fix now makes the Problem and
  Solution boxes always match height regardless of copy length (applies
  site-wide since it's a shared component, not just this page).

## The concept exploration (`clerid-concept.html`)

Unlinked from nav, not part of the live site — exists purely for comparing
a different visual direction before committing to anything. Inspired by
Graylark's Raven product page (graylark.com/raven) and general
Palantir-style enterprise/defense marketing:

- Big, light-weight (font-weight 300) headline instead of the site's usual
  medium-weight display type — this was well-received.
- Real product screenshots framed with quiet corner brackets (viewfinder-
  style), no drop shadows or card chrome.
- **Explicitly rejected** during iteration, worth avoiding going forward:
  - Monospace "system log" text like `/ SOURCE_DOCUMENT · FILE.PDF` —
    called out as "the AI vibe-coded website font/feel."
  - Numbered kickers above each claim (`01 · VENDOR SCREENING`, etc.) with
    green "SOLVED" status pills — same "vibe-coded" reaction.
  - A DLA seal + "proposed under SBIR Phase I" card — pulled per explicit
    instruction (the DLA relationship is pre-award; a federal seal implying
    endorsement was flagged as a risk anyway before the user asked to cut it).
- **Still unresolved**: what color (if any) the Problem/Solution boxes
  should be. Tried, in order: the original dark neutral card, opaque blue
  (`--pan-blue-deep`), light grey (`--paper-2`), cream (`--paper`), no box
  at all (plain text on the page background), coyote tan, and — current
  state — a slate blue-gray (`#708090`) with warm dark-brown text (`#3b2a1a`,
  the color-wheel complement of that slate hue). None of these has been
  confirmed as final. Whoever picks this up should treat the box color as
  an open question, not a decision.

## Working style notes for whoever continues this

- The user reacts strongly against anything that reads as generic
  AI-generated web design — mono "terminal" text, numbered feature
  kickers, glowing status badges used decoratively. When in doubt, prefer
  what the rest of the site already does over inventing a new pattern.
- Real screenshots and real photos only — no stock imagery, no placeholder
  content. When a needed asset doesn't exist yet, ask rather than fabricate.
- Never use em dashes in any written copy on this project.
- The user is iterating visually and by feel — expect several rounds of
  "try X instead" rather than a single locked spec. Small, reversible
  changes beat big rewrites.

## Where things live

- `clerid.html` — the live-track page.
- `clerid-concept.html` — the design exploration, not linked from nav.
- `site.css` — search for `Clerid hero` and `Concept:` section comments to
  find the relevant rules quickly.
- `assets/clerid/` — all real screenshots and photos used above.
