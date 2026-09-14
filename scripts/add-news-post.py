#!/usr/bin/env python3
"""Add a news post to panderose.com in one shot, touching every place a new
post needs to appear so they can't drift out of sync the way
Compliance/Research Automation just did:

  - news.html:   new <article> block, new NewsArticle JSON-LD entry,
                 WebPage dateModified bumped to the post date.
  - index.html:  new entry at the top of the homepage News teaser
                 (trimmed to the 3 most recent), WebPage dateModified bumped.
  - sitemap.xml: <lastmod> bumped for both /news and / (homepage).

Deliberately does NOT touch llms.txt (it links to /news generically, not
per-article) or git add/commit/push anything -- review the diff yourself,
run it past the Earned Visibility Playbook's legitimacy checklist, then
commit. This script automates the mechanical part, not the judgment call
about whether the post should exist or what it should say.

Usage:
  scripts/add-news-post.py \\
    --date 2026-09-20 \\
    --headline "Panderose ships thing that actually happened" \\
    --body "One or two honest sentences. No claim here that isn't checkable." \\
    [--id custom-anchor-id] \\
    [--description "Shorter text for the JSON-LD description, if different from --body"] \\
    [--dry-run]

If --id is omitted, it's derived from the headline (lowercased, non-alphanumerics
to hyphens). The script refuses to run if that id already exists in news.html.
"""
import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NEWS = ROOT / "news.html"
HOME = ROOT / "index.html"
SITEMAP = ROOT / "sitemap.xml"


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    if not slug:
        raise SystemExit("Couldn't derive an id from that headline -- pass --id explicitly.")
    return slug


def load_ld_blocks(html: str):
    """Return list of (full_match_text, parsed_json) for every ld+json script block."""
    blocks = []
    for m in re.finditer(r'<script type="application/ld\+json">\n?(.*?)\n?</script>', html, re.S):
        blocks.append((m.group(0), m.span(), json.loads(m.group(1))))
    return blocks


def replace_ld_block(html: str, span, new_obj: dict) -> str:
    new_text = '<script type="application/ld+json">\n' + json.dumps(new_obj, indent=2) + "\n</script>"
    return html[: span[0]] + new_text + html[span[1] :]


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--date", required=True, help="YYYY-MM-DD, the post's real date")
    p.add_argument("--headline", required=True)
    p.add_argument("--body", required=True, help="Visible paragraph text on /news")
    p.add_argument("--description", help="JSON-LD description, defaults to --body")
    p.add_argument("--id", help="anchor id, derived from headline if omitted")
    p.add_argument("--dry-run", action="store_true", help="print what would change, write nothing")
    args = p.parse_args()

    try:
        date = datetime.strptime(args.date, "%Y-%m-%d")
    except ValueError:
        raise SystemExit(f"--date must be YYYY-MM-DD, got {args.date!r}")

    post_id = args.id or slugify(args.headline)
    description = args.description or args.body
    month_full = date.strftime("%B %Y")   # "September 2026"
    month_abbr = date.strftime("%b %Y")   # "Sep 2026"
    iso_date = date.strftime("%Y-%m-%d")

    news_html = NEWS.read_text()
    home_html = HOME.read_text()
    sitemap_xml = SITEMAP.read_text()

    if f'id="{post_id}"' in news_html:
        raise SystemExit(f"id={post_id!r} already exists in news.html -- pass a different --id.")

    # --- news.html: insert the <article> before the NEWS_ARTICLES:END marker ---
    article = (
        f'    <article class="block" id="{post_id}">\n'
        f'      <p class="dateline">{month_full}</p>\n'
        f'      <h2 class="block__title">{args.headline}</h2>\n'
        f'      <p class="line line--prose">{args.body}</p>\n'
        f"    </article>\n"
    )
    marker = "    <!-- NEWS_ARTICLES:END -->"
    if marker not in news_html:
        raise SystemExit("Couldn't find the NEWS_ARTICLES:END marker in news.html -- has the file structure changed?")
    news_html = news_html.replace(marker, article + marker)

    # --- news.html: append to the ItemList JSON-LD, bump the WebPage dateModified ---
    blocks = load_ld_blocks(news_html)
    itemlist_span = next((span for _, span, obj in blocks if obj.get("@type") == "ItemList"), None)
    webpage_span = next((span for _, span, obj in blocks if obj.get("@type") == "WebPage"), None)
    if itemlist_span is None or webpage_span is None:
        raise SystemExit("Couldn't find both ItemList and WebPage JSON-LD blocks in news.html.")

    itemlist_obj = next(obj for _, span, obj in blocks if span == itemlist_span)
    itemlist_obj["itemListElement"].append(
        {
            "@type": "NewsArticle",
            "headline": args.headline,
            "datePublished": iso_date,
            "author": {"@type": "Organization", "name": "Panderose"},
            "publisher": {"@type": "Organization", "name": "Panderose"},
            "description": description,
        }
    )
    news_html = replace_ld_block(news_html, itemlist_span, itemlist_obj)

    # webpage_span shifted by the itemlist replacement if itemlist came first in the doc;
    # re-locate blocks fresh rather than trust stale spans.
    blocks = load_ld_blocks(news_html)
    webpage_span = next(span for _, span, obj in blocks if obj.get("@type") == "WebPage")
    webpage_obj = next(obj for _, span, obj in blocks if span == webpage_span)
    webpage_obj["dateModified"] = iso_date
    news_html = replace_ld_block(news_html, webpage_span, webpage_obj)

    # --- index.html: prepend to the homepage News teaser, trim to 3, bump dateModified ---
    home_item = (
        f'        <a class="news-item" href="/news#{post_id}">\n'
        f'          <span class="news-item__date">{month_abbr}</span>\n'
        f'          <span class="news-item__headline">{args.headline}</span>\n'
        f"        </a>\n"
    )
    start_m = re.search(r"[ \t]*<!-- HOME_NEWS:START -->\n", home_html)
    end_m = re.search(r"[ \t]*<!-- HOME_NEWS:END -->\n?", home_html)
    if not start_m or not end_m:
        raise SystemExit("Couldn't find HOME_NEWS:START/END markers in index.html.")
    existing_items = re.findall(r'        <a class="news-item".*?</a>\n', home_html[start_m.end() : end_m.start()], re.S)
    kept = ([home_item] + existing_items)[:3]
    home_html = home_html[: start_m.end()] + "".join(kept) + home_html[end_m.start() :]

    blocks = load_ld_blocks(home_html)
    home_webpage_span = next((span for _, span, obj in blocks if obj.get("@type") == "WebPage"), None)
    if home_webpage_span is not None:
        home_webpage_obj = next(obj for _, span, obj in blocks if span == home_webpage_span)
        home_webpage_obj["dateModified"] = iso_date
        home_html = replace_ld_block(home_html, home_webpage_span, home_webpage_obj)

    # --- sitemap.xml: bump lastmod for /news and / ---
    def bump_lastmod(xml: str, loc: str) -> str:
        pattern = rf"(<loc>{re.escape(loc)}</loc>\s*<lastmod>)[^<]+(</lastmod>)"
        new_xml, n = re.subn(pattern, rf"\g<1>{iso_date}\g<2>", xml)
        if n == 0:
            print(f"  warning: no <lastmod> found for {loc} in sitemap.xml -- left untouched", file=sys.stderr)
        return new_xml

    sitemap_xml = bump_lastmod(sitemap_xml, "https://panderose.com/news")
    sitemap_xml = bump_lastmod(sitemap_xml, "https://panderose.com/")

    if args.dry_run:
        print(f"Would add post id={post_id!r} dated {iso_date}. Files that would change:")
        print(f"  {NEWS.relative_to(ROOT)}")
        print(f"  {HOME.relative_to(ROOT)}")
        print(f"  {SITEMAP.relative_to(ROOT)}")
        print("(--dry-run: nothing written)")
        return

    NEWS.write_text(news_html)
    HOME.write_text(home_html)
    SITEMAP.write_text(sitemap_xml)

    print(f"Added post id={post_id!r} dated {iso_date} to news.html, index.html, and sitemap.xml.")
    print()
    print("Before committing:")
    print("  1. Read the diff -- git diff news.html index.html sitemap.xml")
    print("  2. Run the post past the Earned Visibility Playbook's legitimacy checklist")
    print("     (same words for a person and a machine, attributable, every claim checkable,")
    print("     survives being read back to us, earned not manufactured).")
    print("  3. llms.txt is untouched on purpose -- it links to /news generically, nothing to update there.")


if __name__ == "__main__":
    main()
