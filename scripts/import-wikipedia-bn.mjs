#!/usr/bin/env python3
"""Saved news HTML -> clean Markdown -> incident JSON (LLM + geo CSV).

Stage 1  HTML -> Markdown (one .md per article, separate folder).

Supported sites (auto-detected from the article URL / DOM):
  samakal.com, prothomalo.com, bangla.thedailystar.net / thedailystar.net, newagebd.net
  anything else -> generic fallback (JSON-LD / Open Graph + <article>)

Each .md starts with a metadata header, then the cleaned article body:

  ---
  headline, source_url, source_label, site, language, section, author,
  published_at, modified_at, published_at_estimated, description,
  image_url, image_caption, og_image_url, tags, keywords, source_html
  ---
  # <headline>
  ![caption](image_url)
  body paragraphs...

Notes on saved ("Save page as...") pages:
  * the article URL is taken from JSON-LD / canonical / og:url, then the share links,
    then the browser's `<!-- saved from url=... -->` comment. Homepage-only URLs
    (Prothom Alo keeps homepage meta on saved pages) are rejected.
  * image_url is always the REMOTE url (local "_files/..." copies are ignored).
  * Daily Star pages can contain several stacked articles; the one matching
    the page's og:title / canonical is used.

Stage 2  Markdown -> incident (shape of demo-incidents.seed.json)
  * the LLM (local Ollama, http://localhost:11434) reads the article and returns: type, En/Bn title and
    summary, place names, and the division / district / thana the story is about, plus the time.
  * convertcsv.csv is the source of truth for divisionPcode, districtPcode, lat and lng: the LLM's
    names are matched against the CSV (the LLM may also pick from the CSV's thana list); lat/lng are
    the centroid of the most specific matched unit (thana/upazila, or union if named).
  * type is restricted to the types in --seed (or --types); sourceLabel/sourceUrl/image come from
    the article's front matter.

Tracking CSV (<out-dir>/conversion_log.csv, opens fine in Excel)
  One row per .md: html_file, md_file, source_url, headline, site, published_at, converted_at,
  status (pending | done | skipped | failed), incident_slug, incident_type, processed_at, note.
  * HTML -> .md is skipped when the same HTML (sha1) was already converted (use --force to redo).
  * The LLM stage reads the .md files in the HTML_NEWS_MD folder that are `pending` or `failed` in the
    CSV, then marks them `done` / `skipped` (not an incident) / `failed`. Hand-placed .md files are
    adopted automatically. If an .md file is edited it goes back to `pending`.
  * --reprocess runs the LLM again on every .md, including `done` ones.

Usage:
  python news_to_incidents.py "article.md" --csv convertcsv.csv --seed demo-incidents.seed.json \
         --out-json demo-incidents.seed.json            # .md -> incident appended to the seed file
  python news_to_incidents.py                          # <root>/HTML_NEWS/*.html -> .md -> incidents
  python news_to_incidents.py "file.html" --no-incidents   # old behaviour: only write Markdown
  python news_to_incidents.py "a.md" --llm-json extraction.json   # skip the LLM (testing / manual fixes)
  python news_to_incidents.py "a.md" --model qwen2.5:14b --types dengue,measles,kidnap,extortion
  python news_to_incidents.py --out-dir "E:\\Project Next\\LashKoi\\HTML_NEWS_MD" --json

Re-running on the same article (same sourceUrl) updates its incident instead of duplicating it.

Requires: pip install beautifulsoup4 lxml markdownify   (Ollama is called over plain HTTP, no extra package)
"""

from __future__ import annotations

import argparse
import csv
import difflib
import hashlib
import json
import os
import re
import struct
import sys
import unicodedata
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
import urllib.error
import urllib.request
from urllib.parse import parse_qs, unquote, urlparse

from bs4 import BeautifulSoup, Tag
from markdownify import markdownify as html_to_md

DEFAULT_ROOT = Path(os.getenv("LASHKOI_ROOT") or Path(__file__).resolve().parents[1])
DHAKA = timezone(timedelta(hours=6))
BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")

SITES = {
    "samakal.com": ("samakal", "Samakal", "bn"),
    "prothomalo.com": ("prothomalo", "Prothom Alo", "bn"),
    "bangla.thedailystar.net": ("dailystar_bn", "The Daily Star (Bangla)", "bn"),
    "thedailystar.net": ("dailystar_en", "The Daily Star", "en"),
    "newagebd.net": ("newage", "New Age", "en"),
}

# Lines that are page furniture, not article text.
JUNK_LINE = re.compile(
    unicodedata.normalize("NFC", r"(গুগল নিউজ চ্যানেল|Google News channel|ফলো করুন|শেয়ার করুন|^SHARE$|"
    r"^Advertisement$|^বিজ্ঞাপন$|আরও পড়ুন\s*$|Read more|^Follow\b.*(?:Facebook|Google))"),
    re.I,
)
_RELATED_WORDS = unicodedata.normalize("NFC", r"(?:আরও পড়ুন|Read more|Related (?:news|stories))")
# Embedded "Read more" teaser inside the article: marker + teaser headline (+ ---- underline) + optional date line.
RELATED_BLOCK = re.compile(
    r"(?:^|\n)[ \t]*" + _RELATED_WORDS + r"[ \t]*\n+(?:#+[ \t]*)?[^\n]+\n(?:-{3,}[ \t]*\n)?(?:\s*[০-৯0-9]{1,2} [^\n]{3,20} [০-৯0-9]{4}[ \t]*\n)?",
    re.I,
)
# "রাজনীতি থেকে আরও পড়ুন" / trailing "Read more" lists at the very end of the article.
RELATED_TAIL = re.compile(r"(?:^|\n)[^\n]{0,40}" + _RELATED_WORDS + r"[ \t]*(?:\n|$)", re.I)


def strip_related(md: str) -> str:
    md = RELATED_BLOCK.sub("\n\n", md)
    last = None
    for m in RELATED_TAIL.finditer(md):
        last = m
    if last and len(md) - last.start() < 600:  # only a footer, never real article text
        md = md[: last.start()]
    return md


JUNK_SELECTORS = (
    "script, style, noscript, iframe, form, button, svg, ins, nav, footer, "
    "[id^=js-dfp], .dfp-ad-unit, .adsBox, .adunitContainer, [class*=advert], "
    ".DContentAdd2, .sharethis-wrap, .hide-for-print, .print-none, .share-dropdown"
)


# --------------------------------------------------------------------------- #
# Data
# --------------------------------------------------------------------------- #
@dataclass
class Article:
    headline: str = ""
    source_url: str = ""
    source_label: str = ""
    site: str = ""
    language: str = ""
    section: str = ""
    author: str = ""
    published_at: str = ""  # UTC ISO, e.g. 2026-09-30T07:50:53.000Z
    modified_at: str = ""
    published_at_estimated: bool = False
    description: str = ""
    image_url: str = ""
    image_caption: str = ""
    og_image_url: str = ""
    tags: list[str] = field(default_factory=list)
    keywords: str = ""
    source_html: str = ""
    body_md: str = ""


# --------------------------------------------------------------------------- #
# Generic helpers
# --------------------------------------------------------------------------- #
def read_html(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _text(node) -> str:
    return re.sub(r"\s+", " ", node.get_text(" ", strip=True)).strip() if node else ""


def meta(soup: BeautifulSoup, *keys: str) -> str:
    for key in keys:
        tag = soup.find("meta", attrs={"property": key}) or soup.find("meta", attrs={"name": key})
        if tag and (tag.get("content") or "").strip():
            return tag["content"].strip()
    return ""


def json_ld_nodes(soup: BeautifulSoup) -> list[dict]:
    out: list[dict] = []
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or tag.get_text() or "", strict=False)
        except json.JSONDecodeError:
            continue
        stack = data if isinstance(data, list) else [data]
        for item in stack:
            if isinstance(item, dict):
                out.extend(item["@graph"] if isinstance(item.get("@graph"), list) else [item])
    return [n for n in out if isinstance(n, dict)]


def ld_article(soup: BeautifulSoup) -> dict:
    for node in json_ld_nodes(soup):
        kind = node.get("@type")
        kinds = kind if isinstance(kind, list) else [kind]
        if any(k in ("NewsArticle", "Article", "ReportageNewsArticle") for k in kinds):
            return node
    return {}


def ld_image(node: dict) -> str:
    img = node.get("image")
    if isinstance(img, list):
        img = img[0] if img else ""
    if isinstance(img, dict):
        img = img.get("url", "")
    return img if isinstance(img, str) else ""


def ld_author(node: dict) -> str:
    author = node.get("author")
    if isinstance(author, list):
        author = author[0] if author else ""
    if isinstance(author, dict):
        author = author.get("name", "")
    return author.strip() if isinstance(author, str) else ""


def saved_from_url(html: str) -> str:
    match = re.search(r"<!--\s*saved from url=\(\d+\)(\S+)\s*-->", html)
    return match.group(1) if match else ""


def share_link_url(soup: BeautifulSoup) -> str:
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "sharer" in href or "intent/tweet" in href or "share?url" in href or "wa.me" in href:
            query = parse_qs(urlparse(href.replace("&amp;", "&")).query)
            for key in ("u", "url"):
                if query.get(key):
                    return unquote(query[key][0])
    return ""


def is_article_url(url: str) -> bool:
    if not url.startswith("http"):
        return False
    return len(urlparse(url).path.strip("/")) > 0


def pick_url(soup: BeautifulSoup, html: str, ld: dict) -> str:
    entity = ld.get("mainEntityOfPage")
    entity_id = entity.get("@id", "") if isinstance(entity, dict) else (entity if isinstance(entity, str) else "")
    canonical = soup.find("link", rel="canonical")
    candidates = [
        ld.get("url", ""),
        entity_id,
        canonical.get("href", "") if canonical else "",
        meta(soup, "og:url", "twitter:url"),
        share_link_url(soup),
        saved_from_url(html),
    ]
    for cand in candidates:
        if isinstance(cand, str) and is_article_url(cand.strip()):
            return cand.strip()
    return ""


def detect_site(url: str, soup: BeautifulSoup) -> tuple[str, str, str]:
    host = urlparse(url).netloc.lower().removeprefix("www.")
    for domain, info in SITES.items():
        if host == domain or host.endswith("." + domain):
            # bangla.thedailystar.net must win over thedailystar.net
            if domain == "thedailystar.net" and host.startswith("bangla."):
                continue
            return info
    # DOM fallbacks when the URL was lost
    if soup.select_one(".dNewsDesc"):
        return SITES["samakal.com"]
    if soup.select_one(".story-content-wrapper"):
        return SITES["prothomalo.com"]
    if soup.select_one(".block-field-blocknodenewsbody"):
        return SITES["bangla.thedailystar.net"]
    if soup.select_one(".post-content") and soup.select_one(".post-title"):
        return SITES["newagebd.net"]
    return ("generic", host or "", "")


def _to_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=DHAKA)  # BD sites publish local time
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def parse_iso(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        return ""
    try:
        return _to_utc(datetime.fromisoformat(raw.replace("Z", "+00:00").replace(" ", "T", 1)))
    except ValueError:
        return ""


def relative_time_to_iso(text: str, saved_at: datetime) -> str:
    """'৪৩ মিনিট আগে' / '3 hours ago' -> saved_at minus that delta (an estimate)."""
    norm = text.translate(BN_DIGITS)
    match = re.search(r"(\d+)\s*(মিনিট|ঘণ্টা|ঘন্টা|দিন|সেকেন্ড|minute|hour|day|second)s?\s*(?:আগে|ago)", norm, re.I)
    if not match:
        return ""
    n, unit = int(match.group(1)), match.group(2).lower()
    if unit in ("মিনিট", "minute"):
        delta = timedelta(minutes=n)
    elif unit in ("ঘণ্টা", "ঘন্টা", "hour"):
        delta = timedelta(hours=n)
    elif unit in ("দিন", "day"):
        delta = timedelta(days=n)
    else:
        delta = timedelta(seconds=n)
    return _to_utc(saved_at - delta)


def remote_url(url: str) -> str:
    """Normalise to an absolute remote URL; '' for local saved-page copies."""
    url = (url or "").strip()
    if not url or url.startswith(("./", "../", "data:", "file:")) or "_files/" in url:
        return ""
    if url.startswith("//"):
        url = "https:" + url
    return url if url.startswith("http") else ""


def clean_body_to_md(node: Tag | None) -> str:
    if node is None:
        return ""
    node = BeautifulSoup(str(node), "lxml")  # work on a copy
    for junk in node.select(JUNK_SELECTORS):
        junk.decompose()
    md = html_to_md(str(node), heading_style="ATX", strip=["a", "img", "picture", "source"])
    md = unicodedata.normalize("NFC", md)  # e.g. Prothom Alo uses precomposed ড় (U+09DC)
    # Everything after a "Read more / আরও পড়ুন" line is a related-stories list.
    md = strip_related(md)
    lines = []
    for line in md.splitlines():
        stripped = line.strip()
        if stripped and JUNK_LINE.search(stripped):
            continue
        lines.append(stripped)
    md = "\n".join(lines)
    md = re.sub(r"\n{3,}", "\n\n", md).strip()
    # a leftover teaser date ("২৭ সেপ্টেম্বর ২০২৬") dangling at the very end
    return re.sub(r"\n+[০-৯0-9]{1,2} [^\n\d০-৯]{3,20} [০-৯0-9]{4}\s*$", "", md)


def first_paragraph(md: str, limit: int = 300) -> str:
    """First real paragraph, cut at a sentence end (। . ! ?) when it is longer than `limit`."""
    for para in md.split("\n\n"):
        para = para.strip().strip("*").strip()
        if len(para) > 30 and not para.startswith("#"):
            if len(para) <= limit:
                return para
            cut = max(para.rfind(ch, 0, limit) for ch in "।.!?")
            return para[: cut + 1] if cut > 60 else para[:limit].rstrip() + "…"
    return ""


# --------------------------------------------------------------------------- #
# Site adapters: each fills an Article from the soup
# --------------------------------------------------------------------------- #
def parse_samakal(soup: BeautifulSoup, art: Article, ld: dict) -> None:
    h1 = soup.select_one(".dheading h1") or soup.find("h1")
    art.headline = _text(h1)
    art.published_at = parse_iso(str(ld.get("datePublished", "")))
    art.modified_at = parse_iso(str(ld.get("dateModified", "")))
    art.section = str(ld.get("articleSection", "")).strip()
    for row in soup.select(".row"):
        txt = _text(row)
        if "প্রকাশ:" in txt and len(txt) < 200:
            art.author = txt.split("প্রকাশ:")[0].strip()
            break
    img = soup.select_one(".DNewsImg")
    if img:
        cap = _text(img).replace("×", "").strip()
        art.image_caption = cap
    art.tags = [t.strip() for t in re.split(r"[,\s]{1}", "") if t]  # Samakal tags are space-separated phrases
    tag_area = _text(soup.select_one(".tagArea")).removeprefix("বিষয় :").removeprefix("বিষয়:").strip()
    art.keywords = tag_area
    art.body_md = clean_body_to_md(soup.select_one(".dNewsDesc"))


def parse_prothomalo(soup: BeautifulSoup, art: Article, ld: dict) -> None:
    wrap = soup.select_one(".story-content-wrapper") or soup
    h1 = wrap.select_one(".story-title-info h1") or wrap.find("h1")
    art.headline = _text(h1)
    sections = [_text(e) for e in wrap.select(".print-entity-section-wrapper")]
    art.section = " / ".join(s for s in sections if s)
    art.author = _text(wrap.select_one(".author-read-time-wrapper"))
    time_tag = wrap.select_one(".story-metadata-wrapper time[datetime]") or wrap.find("time", attrs={"datetime": True})
    if time_tag:
        art.published_at = parse_iso(time_tag["datetime"])
    hero = wrap.select_one(".story-page-hero")
    if hero:
        img = hero.find("img")
        if img:
            art.image_caption = (img.get("alt") or "").strip()
            src = (img.get("srcset") or img.get("data-srcset") or "").split(" ")[0]
            src = remote_url(src) or remote_url(img.get("src", ""))
            art.image_url = src.split("?")[0] if "media.prothomalo.com" in src else src
    art.tags = [_text(a) for a in wrap.select(".tag-list a") if _text(a)]
    body = wrap.select_one(".story-content")
    if body:
        body = BeautifulSoup(str(body), "lxml")
        for junk in body.select(".story-page-hero, .print-tags, .print-related-stories-wrapper, .print-none"):
            junk.decompose()
    art.body_md = clean_body_to_md(body)


def _daily_star_article(soup: BeautifulSoup, wanted_title: str) -> Tag | None:
    arts = soup.select("article.node") or soup.find_all("article")
    for art in arts:
        h1 = art.find("h1")
        if h1 and wanted_title and _text(h1) == wanted_title.strip():
            return art
    return arts[0] if arts else None


def parse_dailystar(soup: BeautifulSoup, art: Article, ld: dict, saved_at: datetime) -> None:
    node = _daily_star_article(soup, meta(soup, "og:title") or str(ld.get("headline", "")))
    node = node or soup
    art.headline = _text(node.find("h1")) or str(ld.get("headline", ""))
    art.author = _text(node.select_one(".block-author-info-block")) or _text(
        node.select_one(".block-field-blocknodenewsfield-reporter-name")
    )
    meta_block = node.select_one(".block-article-meta-block")
    if meta_block:
        link = meta_block.find("a")
        art.section = _text(link)
        art.published_at = relative_time_to_iso(_text(meta_block), saved_at)
        art.published_at_estimated = bool(art.published_at)
    time_tag = node.find("time", attrs={"datetime": True})
    if time_tag:
        art.published_at, art.published_at_estimated = parse_iso(time_tag["datetime"]), False
    gallery = node.select_one(".lg-gallery")
    if gallery:
        art.image_url = remote_url(gallery.get("data-src", "") or gallery.get("data-exthumbimage", ""))
    img = node.select_one(".block-news-featured-image img")
    if img:
        art.image_caption = (img.get("alt") or "").strip()
    fig = node.select_one(".block-news-featured-image figcaption, .block-news-featured-image .caption")
    if fig:
        art.image_caption = _text(fig)
    art.tags = [_text(a) for a in node.select(".block-field-blocknodenewsfield-meta-tags a") if _text(a)]
    art.body_md = clean_body_to_md(node.select_one(".block-field-blocknodenewsbody"))


def parse_newage(soup: BeautifulSoup, art: Article, ld: dict) -> None:
    title_box = soup.select_one(".post-title")
    h1 = title_box.find("h1") if title_box else soup.find("h1")
    art.headline = _text(h1)
    if title_box:
        parts = [re.sub(r"\s+", " ", s).strip() for s in title_box.stripped_strings]
        try:
            i = parts.index(art.headline)
        except ValueError:
            i = -1
        if i > 0:
            art.section = parts[0]
        if 0 <= i < len(parts) - 1:
            art.author = parts[i + 1]
    art.published_at = parse_iso(str(ld.get("datePublished", "")))
    art.modified_at = parse_iso(str(ld.get("dateModified", "")))
    body = soup.select_one(".post-content")
    if body:
        body = BeautifulSoup(str(body), "lxml")
        for junk in body.select(".my-2, .mb-20"):
            if not junk.find("p") or len(_text(junk)) < 80:
                junk.decompose()
    art.body_md = clean_body_to_md(body)
    fig = soup.select_one(".post-content figcaption, .post-image figcaption")
    art.image_caption = _text(fig).lstrip("|").strip()


def parse_generic(soup: BeautifulSoup, art: Article, ld: dict) -> None:
    art.headline = str(ld.get("headline", "")) or _text(soup.find("h1"))
    art.published_at = parse_iso(str(ld.get("datePublished", "")) or meta(soup, "article:published_time"))
    art.modified_at = parse_iso(str(ld.get("dateModified", "")) or meta(soup, "article:modified_time"))
    art.section = str(ld.get("articleSection", "")) or meta(soup, "article:section")
    body = soup.find("article") or soup.select_one("[itemprop=articleBody], main") or soup.body
    art.body_md = clean_body_to_md(body)


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def clean_html(html: str, source_name: str = "", saved_at: datetime | None = None) -> Article:
    soup = BeautifulSoup(html, "lxml")
    saved_at = saved_at or datetime.now(timezone.utc)
    ld = ld_article(soup)
    art = Article(source_html=source_name)
    art.source_url = pick_url(soup, html, ld)
    key, label, lang = detect_site(art.source_url, soup)
    art.site, art.source_label, art.language = key, label, lang

    if key == "samakal":
        parse_samakal(soup, art, ld)
    elif key == "prothomalo":
        parse_prothomalo(soup, art, ld)
    elif key in ("dailystar_bn", "dailystar_en"):
        parse_dailystar(soup, art, ld, saved_at)
    elif key == "newage":
        parse_newage(soup, art, ld)
    else:
        parse_generic(soup, art, ld)

    # ---- shared metadata (fill only what the adapter left empty) ----
    # Prothom Alo saved pages carry the HOMEPAGE og:* tags, so ignore og for that site.
    trust_og = key != "prothomalo"
    og_title = meta(soup, "og:title") if trust_og else ""
    art.headline = art.headline or str(ld.get("headline", "")) or og_title
    art.description = (
        str(ld.get("description", "")).strip()
        or (meta(soup, "og:description", "description") if trust_og else "")
        or first_paragraph(art.body_md)
    )
    art.og_image_url = remote_url(ld_image(ld)) or (remote_url(meta(soup, "og:image", "twitter:image")) if trust_og else "")
    art.image_url = art.image_url or art.og_image_url
    art.author = art.author or ld_author(ld)
    if art.author.lower() in ("newagebd", "admin", ""):
        art.author = art.author if art.author.lower() != "newagebd" else art.author
    art.keywords = art.keywords or (meta(soup, "keywords", "news_keywords") if trust_og else "")
    art.published_at = art.published_at or parse_iso(str(ld.get("datePublished", ""))) or parse_iso(
        meta(soup, "article:published_time")
    )
    art.modified_at = art.modified_at or parse_iso(str(ld.get("dateModified", "")))
    return art


def to_markdown(art: Article) -> str:
    data = asdict(art)
    data.pop("body_md")
    front = ["---"] + [f"{k}: {json.dumps(v, ensure_ascii=False)}" for k, v in data.items()] + ["---", ""]
    parts = ["\n".join(front), f"# {art.headline}", ""]
    if art.image_url:
        alt = re.sub(r"[\[\]\n]+", " ", art.image_caption).strip()
        parts += [f"![{alt}]({art.image_url})", ""]
    parts += [art.body_md, ""]
    return "\n".join(parts)


def split_frontmatter(md: str) -> tuple[dict, str]:
    match = re.match(r"^---\n(.*?)\n---\n", md, re.S)
    if not match:
        return {}, md
    meta_out: dict = {}
    for line in match.group(1).splitlines():
        key, _, value = line.partition(":")
        try:
            meta_out[key.strip()] = json.loads(value.strip())
        except json.JSONDecodeError:
            meta_out[key.strip()] = value.strip()
    return meta_out, md[match.end():]


def convert_file(html_path: Path, out_dir: Path, write_json: bool = False) -> Path:
    saved_at = datetime.fromtimestamp(html_path.stat().st_mtime, tz=timezone.utc)
    art = clean_html(read_html(html_path), html_path.name, saved_at)
    out_dir.mkdir(parents=True, exist_ok=True)
    md_path = out_dir / (html_path.stem + ".md")
    md_path.write_text(to_markdown(art), encoding="utf-8")
    if write_json:
        (out_dir / (html_path.stem + ".meta.json")).write_text(
            json.dumps(asdict(art), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    flag = " (published time estimated)" if art.published_at_estimated else ""
    print(f"[md] {html_path.name} -> {md_path.name}  [{art.site or 'unknown'}]  {len(art.body_md)} chars{flag}", flush=True)
    if not art.source_url:
        print("  ! no article URL found", file=sys.stderr)
    if len(art.body_md) < 200:
        print("  ! very short body - check the selectors for this page", file=sys.stderr)
    return md_path


# --------------------------------------------------------------------------- #
# Tracking CSV: which HTML became which .md, and what the LLM did with it
# --------------------------------------------------------------------------- #
MANIFEST_NAME = "conversion_log.csv"
MANIFEST_FIELDS = [
    "md_file", "html_file", "html_sha1", "md_sha1", "source_url", "source_label", "site", "headline",
    "published_at", "body_chars", "converted_at", "status", "incident_slug", "incident_type",
    "processed_at", "note",
]


class NotIncident(ValueError):
    """The article is fine but is not an incident we map (LLM said no / type not allowed)."""


def sha1_of(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()


def now_stamp() -> str:
    return datetime.now(DHAKA).strftime("%Y-%m-%d %H:%M:%S")


class Manifest:
    def __init__(self, path: Path):
        self.path = path
        self.rows: dict[str, dict] = {}
        if path.exists():
            with open(path, encoding="utf-8-sig", newline="") as fh:
                for row in csv.DictReader(fh):
                    if row.get("md_file"):
                        self.rows[row["md_file"]] = {k: row.get(k) or "" for k in MANIFEST_FIELDS}

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_name(self.path.name + ".tmp")
        try:
            with open(tmp, "w", encoding="utf-8-sig", newline="") as fh:  # BOM so Excel shows Bangla correctly
                writer = csv.DictWriter(fh, fieldnames=MANIFEST_FIELDS)
                writer.writeheader()
                writer.writerows(self.rows.values())
            tmp.replace(self.path)
        except PermissionError:
            print(f"  ! cannot write {self.path.name} (open in Excel?) - close it; will retry on the next update", file=sys.stderr)

    def register(self, md_path: Path, html_name: str = "", html_sha1: str = "") -> dict:
        text = md_path.read_text(encoding="utf-8").replace("\r\n", "\n")
        meta_in, body = split_frontmatter(text)
        sha = hashlib.sha1(text.encode("utf-8")).hexdigest()
        row = self.rows.get(md_path.name)
        changed = row is None or row["md_sha1"] != sha
        row = row or {k: "" for k in MANIFEST_FIELDS}
        row.update(
            md_file=md_path.name, md_sha1=sha, body_chars=str(len(body)),
            source_url=str(meta_in.get("source_url", "")), source_label=str(meta_in.get("source_label", "")),
            site=str(meta_in.get("site", "")), headline=str(meta_in.get("headline", "")),
            published_at=str(meta_in.get("published_at", "")),
        )
        if html_name:
            row.update(html_file=html_name, html_sha1=html_sha1, converted_at=now_stamp())
        if changed:  # new or edited .md -> the LLM has to look at it (again)
            row.update(status="pending", incident_slug="", incident_type="", processed_at="", note="")
        self.rows[md_path.name] = row
        return row

    def mark(self, md_name: str, status: str, slug: str = "", inc_type: str = "", note: str = "") -> None:
        row = self.rows[md_name]
        row.update(status=status, incident_slug=slug, incident_type=inc_type, processed_at=now_stamp(), note=note[:300])


def convert_if_needed(html_path: Path, out_dir: Path, manifest: Manifest, write_json: bool, force: bool) -> Path:
    md_path = out_dir / (html_path.stem + ".md")
    sha = sha1_of(html_path)
    row = manifest.rows.get(md_path.name)
    if not force and row and row["html_sha1"] == sha and md_path.exists():
        print(f"[md] {html_path.name} already converted ({row['status']}) - skipped")
        return md_path
    convert_file(html_path, out_dir, write_json)
    manifest.register(md_path, html_path.name, sha)
    return md_path


def write_seed(seed: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(seed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------- #
# Markdown -> incident JSON  (LLM reads the article, the CSV supplies geo data)
# --------------------------------------------------------------------------- #
#   LLM  -> type, titles/summaries (En + Bn), place names, which division /
#           district / thana the story happened in, occurrence time
#   CSV  -> divisionPcode, districtPcode, lat, lng   (never invented by the LLM)
OLLAMA_URL = os.getenv("OLLAMA_HOST", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("LASHKOI_LLM_MODEL") or os.getenv("OLLAMA_MODEL") or ""  # "" -> first installed model
FALLBACK_TYPES = ("dengue", "measles", "kidnap", "extortion")  # used when no --seed / --types

# CSV spellings differ from what news/LLMs write; keys and values are already norm_name()'d.
GEO_ALIASES = {
    "chattogram": "chittagong", "chattagram": "chittagong", "barishal": "barisal",
    "cumilla": "comilla", "bogura": "bogra", "jashore": "jessore", "brahmanbaria": "brahamanbaria",
    "khagrachari": "khagrachhari", "moulvibazar": "maulvibazar", "chapainawabganj": "nawabganj",
    "jhalakathi": "jhalokati", "jhalakati": "jhalokati", "netrokona": "netrakona",
    "sirajgonj": "sirajganj", "dhakacity": "dhaka", "coxbazar": "coxsbazar",
    "narayangonj": "narayanganj", "narsinghdi": "narsingdi", "munshigonj": "munshiganj",
}


def norm_name(s: str) -> str:
    s = unicodedata.normalize("NFC", s or "").lower()
    s = re.sub(r"[^a-z0-9\u0980-\u09ff]+", "", s)
    return GEO_ALIASES.get(s, s)


def decode_centroid(hexstr: str) -> tuple[float, float] | None:
    """PostGIS EWKB hex point (SRID 4326) -> (lat, lng)."""
    try:
        raw = bytes.fromhex(hexstr.strip())
        endian = "<" if raw[0] == 1 else ">"
        wkb_type = struct.unpack(endian + "I", raw[1:5])[0]
        offset = 9 if wkb_type & 0x20000000 else 5  # skip SRID when present
        lng, lat = struct.unpack(endian + "dd", raw[offset:offset + 16])
        return lat, lng
    except (ValueError, struct.error, IndexError):
        return None


@dataclass
class GeoUnit:
    pcode: str
    parent: str
    level: str
    name_en: str
    name_bn: str
    division: str
    district: str
    lat: float | None
    lng: float | None

    @property
    def keys(self) -> set[str]:
        return {k for k in (norm_name(self.name_en), norm_name(self.name_bn)) if k}


class GeoIndex:
    """division > district > upazila (thana) > union, loaded from convertcsv.csv."""

    def __init__(self, csv_path: Path):
        self.by_pcode: dict[str, GeoUnit] = {}
        self.by_level: dict[str, list[GeoUnit]] = {}
        with open(csv_path, encoding="utf-8-sig", newline="") as fh:
            for row in csv.DictReader(fh):
                pos = decode_centroid(row.get("centroid") or "")
                unit = GeoUnit(
                    row["pcode"], row["parent_pcode"], row["level"], row["name_en"], row["name_bn"],
                    row["division_pcode"], row["district_pcode"], pos[0] if pos else None, pos[1] if pos else None,
                )
                self.by_pcode[unit.pcode] = unit
                self.by_level.setdefault(unit.level, []).append(unit)

    def children(self, parent: str, level: str) -> list[GeoUnit]:
        return [u for u in self.by_level.get(level, []) if u.parent == parent]

    def find(self, level: str, name: str | None, parent: str | None = None) -> GeoUnit | None:
        key = norm_name(name or "")
        if not key:
            return None
        pool = self.children(parent, level) if parent else self.by_level.get(level, [])
        for unit in pool:
            if key in unit.keys:
                return unit
        names = {k: u for u in pool for k in u.keys}
        close = difflib.get_close_matches(key, list(names), n=1, cutoff=0.84)
        return names[close[0]] if close else None

    @staticmethod
    def nearest(units: list[GeoUnit], lat: float, lng: float) -> GeoUnit | None:
        located = [u for u in units if u.lat is not None]
        return min(located, key=lambda u: (u.lat - lat) ** 2 + (u.lng - lng) ** 2, default=None)


class PlaceIndex:
    """Exact locality coordinates (e.g. copied from latlong.net) from places.csv.

    Columns: placeNameEn, placeNameBn, lat, lng, aliases (optional, separated by |).
    A match overrides the thana centroid for lat/lng; division/district pcodes still come from convertcsv.csv.
    """

    def __init__(self, csv_path: Path | None):
        self.rows: dict[str, tuple[float, float, str]] = {}
        if not csv_path or not csv_path.exists():
            return
        with open(csv_path, encoding="utf-8-sig", newline="") as fh:
            for row in csv.DictReader(fh):
                try:
                    lat, lng = float(row["lat"]), float(row["lng"])
                except (KeyError, TypeError, ValueError):
                    continue
                names = [row.get("placeNameEn", ""), row.get("placeNameBn", "")]
                names += (row.get("aliases") or "").split("|")
                for name in names:
                    for part in (name, name.split(",")[0]):  # "Banglamotor, Dhaka" and "Banglamotor"
                        key = norm_name(part)
                        if key:
                            self.rows.setdefault(key, (lat, lng, row.get("placeNameEn", "")))

    def find(self, *names: str | None) -> tuple[float, float, str] | None:
        for name in names:
            for part in (name or "", (name or "").split(",")[0]):
                hit = self.rows.get(norm_name(part))
                if hit:
                    return hit
        return None


# ---- LLM client: local Ollama (plain HTTP, no extra dependency) ------------- #
class Ollama:
    def __init__(self, model: str = "", url: str = OLLAMA_URL):
        self.url = (url if url.startswith("http") else "http://" + url).rstrip("/")
        self.model = model or self._first_installed_model()

    def _call(self, path: str, payload: dict | None = None) -> dict:
        req = urllib.request.Request(
            self.url + path, method="POST" if payload is not None else "GET",
            data=json.dumps(payload).encode("utf-8") if payload is not None else None,
            headers={"content-type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=600) as resp:  # local models can be slow on CPU
                return json.load(resp)
        except urllib.error.HTTPError as exc:
            raise RuntimeError(f"Ollama {exc.code}: {exc.read().decode('utf-8', 'replace')[:300]}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"cannot reach Ollama at {self.url} ({exc.reason}) - is `ollama serve` running?") from exc

    def _first_installed_model(self) -> str:
        models = [m["name"] for m in self._call("/api/tags").get("models", [])]
        if not models:
            raise RuntimeError("Ollama has no models - run `ollama pull <model>` or pass --model")
        return models[0]

    def json(self, system: str, user: str, max_tokens: int = 1500, tries: int = 2) -> dict:
        payload = {
            "model": self.model, "stream": False, "format": "json",  # forces valid JSON output
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "options": {"temperature": 0, "num_ctx": 8192, "num_predict": max_tokens},
        }
        text = ""
        for _ in range(tries):
            text = (self._call("/api/chat", payload).get("message") or {}).get("content", "")
            start, end = text.find("{"), text.rfind("}")
            if start >= 0 and end > start:
                try:
                    return json.loads(text[start:end + 1])
                except json.JSONDecodeError:
                    pass
        raise RuntimeError(f"LLM did not return valid JSON: {text[:200]!r}")


EXTRACT_SYSTEM = """You turn one Bangladeshi news article into one incident record for a public safety map.
Reply with a single JSON object only (no prose, no code fences) with exactly these keys:

  "isIncident"      true if the article reports a concrete event at a specific place, else false
  "type"            ONE of: {types}   (pick the closest; the main event decides, not background details)
  "titleEn"         <= 90 chars, neutral news headline in English
  "titleBn"         <= 90 chars, Bangla headline
  "summaryEn"       1-2 sentences, <= 240 chars, English
  "summaryBn"       the same in Bangla
  "placeNameEn"     "Locality, District"  e.g. "Mohakhali, Dhaka"
  "placeNameBn"     the same in Bangla     e.g. "মহাখালী, ঢাকা"
  "divisionEn"      one of: Barisal, Chittagong, Dhaka, Khulna, Mymensingh, Rajshahi, Rangpur, Sylhet
  "districtEn"      English district name, e.g. "Dhaka", "Chittagong", "Cox's Bazar"
  "upazilaEn"       upazila / police-station area as named in the article (English) or null
  "unionEn"         union or ward if named, else null
  "latHint","lngHint"  approximate coordinates of the exact locality (numbers) or null
  "slugWords"       1-3 lowercase English words for the locality, e.g. "mohakhali"
  "occurredAtLocal" when it happened, ISO-8601 with +06:00, resolved from the article text and the
                    publication time you are given (e.g. "Thursday 8:10pm" -> the matching date); null if unknown
  "caseCount"       integer only for disease outbreaks / counted cases, else null
  "bannerCaptionEn" <= 60 char practical caption/advice, or null

Rules: be factual and neutral; say "alleged"/"according to police" for claims; do not name private
individuals (accused, victims) in titles or summaries; never invent facts that are not in the article."""

CHOOSE_SYSTEM = """You map a news location in Bangladesh to ONE administrative unit from a list.
Reply with JSON only: {"pcode": "<pcode from the list>" or null}. Choose the unit whose area contains
the described place (a police station that is not listed belongs to the unit that covers its area).
Return null if none is plausible."""


def dhaka_stamp(iso_utc: str) -> str:
    if not iso_utc:
        return "unknown"
    dt = datetime.fromisoformat(iso_utc.replace("Z", "+00:00")).astimezone(DHAKA)
    return dt.strftime("%A %Y-%m-%d %H:%M") + " (Dhaka time)"


def extract_with_llm(llm: Ollama, meta_in: dict, body: str, types: tuple[str, ...]) -> dict:
    user = (
        f"Article published: {dhaka_stamp(meta_in.get('published_at', ''))}"
        f"{' (estimated)' if meta_in.get('published_at_estimated') else ''}\n"
        f"Source: {meta_in.get('source_label', '')}\n"
        f"Headline: {meta_in.get('headline', '')}\n"
        f"Image caption: {meta_in.get('image_caption', '')}\n\n"
        f"Article:\n{body[:4000]}"
    )
    return llm.json(EXTRACT_SYSTEM.format(types=", ".join(types)), user)


def choose_unit_with_llm(llm: Ollama, ext: dict, units: list[GeoUnit]) -> GeoUnit | None:
    listing = "\n".join(f"{u.pcode}  {u.name_en}" for u in units)
    user = (
        f"District: {ext.get('districtEn')}\nPlace: {ext.get('placeNameEn')} "
        f"(police station / area in article: {ext.get('upazilaEn') or 'n/a'})\n"
        f"Approx. coordinates: {ext.get('latHint')}, {ext.get('lngHint')}\n\nUnits:\n{listing}"
    )
    pcode = llm.json(CHOOSE_SYSTEM, user, max_tokens=100).get("pcode")
    unit = next((u for u in units if u.pcode == pcode), None)  # must be one of the offered units
    return unit


def resolve_area(geo: GeoIndex, ext: dict, llm: Ollama | None, places: PlaceIndex | None = None) -> tuple[dict, list[str]]:
    """Return ({divisionPcode, districtPcode, lat, lng}, notes). Everything comes from the CSV."""
    notes: list[str] = []
    division = geo.find("division", ext.get("divisionEn"))
    district = geo.find("district", ext.get("districtEn"), division.pcode if division else None) \
        or geo.find("district", ext.get("districtEn"))
    if district and (not division or division.pcode != district.division):
        division = geo.by_pcode.get(district.division, division)
    if not district:
        notes.append(f"district {ext.get('districtEn')!r} not found in CSV - falling back to division")
    best: GeoUnit | None = district or division

    if district:
        units = geo.children(district.pcode, "upazila")
        unit = geo.find("upazila", ext.get("upazilaEn"), district.pcode)
        how = "name match"
        if not unit and llm and len(units) > 1:
            try:
                unit, how = choose_unit_with_llm(llm, ext, units), "LLM pick from CSV list"
            except RuntimeError as exc:
                notes.append(f"LLM area pick failed ({exc})")
        if not unit and isinstance(ext.get("latHint"), (int, float)) and isinstance(ext.get("lngHint"), (int, float)):
            unit, how = geo.nearest(units, ext["latHint"], ext["lngHint"]), "nearest centroid to LLM hint"
        if unit:
            notes.append(f"upazila/thana: {unit.name_en} ({unit.pcode}) via {how}")
            best = unit
            union = geo.find("union", ext.get("unionEn"), unit.pcode)
            if union:
                notes.append(f"union: {union.name_en} ({union.pcode})")
                best = union
        else:
            notes.append("no upazila/thana match - using district centroid")

    if not best or best.lat is None:
        raise ValueError("could not resolve any area from the CSV")
    out = {"divisionPcode": division.pcode if division else best.division}
    if district:
        out["districtPcode"] = district.pcode
    out["lat"], out["lng"] = round(best.lat, 3), round(best.lng, 3)
    hit = places.find(ext.get("placeNameEn"), ext.get("placeNameBn"), ext.get("slugWords")) if places else None
    if hit:
        out["lat"], out["lng"] = round(hit[0], 4), round(hit[1], 4)
        notes.append(f"lat/lng from places.csv: {hit[2]}")
    else:
        notes.append(f"{ext.get('placeNameEn')!r} not in places.csv - using thana/district centroid (add a row for exact coordinates)")
    return out, notes


def slugify(*parts: str) -> str:
    text = "-".join(p for p in parts if p)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"-{2,}", "-", re.sub(r"[^a-z0-9]+", "-", text.lower())).strip("-")


def to_occurred_at(local_iso: str | None, published_at: str) -> str:
    """LLM time -> UTC ISO. Falls back to published_at if missing, in the future or >10 days older."""
    pub = datetime.fromisoformat(published_at.replace("Z", "+00:00")) if published_at else None
    try:
        parsed = parse_iso(local_iso or "")
        when = datetime.fromisoformat(parsed.replace("Z", "+00:00")) if parsed else None
    except ValueError:
        when = None
    if when and pub and not (pub - timedelta(days=10) <= when <= pub + timedelta(hours=1)):
        when = None
    if when:
        return when.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    return published_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def build_incident(meta_in: dict, ext: dict, area: dict, existing_slugs: set[str]) -> dict:
    occurred = to_occurred_at(ext.get("occurredAtLocal"), meta_in.get("published_at", ""))
    base = slugify(ext["type"], ext.get("districtEn", ""), ext.get("slugWords", ""), occurred[:4])
    slug, n = base, 2
    while slug in existing_slugs:
        slug, n = f"{base}-{n}", n + 1
    inc: dict = {
        "slug": slug,
        "type": ext["type"],
        "titleEn": ext["titleEn"],
        "titleBn": ext["titleBn"],
        "summaryEn": ext["summaryEn"],
        "summaryBn": ext["summaryBn"],
        "placeNameEn": ext["placeNameEn"],
        "placeNameBn": ext["placeNameBn"],
        **area,
    }
    if isinstance(ext.get("caseCount"), int):
        inc["caseCount"] = ext["caseCount"]
    inc["sourceLabel"] = meta_in.get("source_label", "")
    if meta_in.get("source_url"):
        inc["sourceUrl"] = meta_in["source_url"]
    if ext.get("bannerCaptionEn"):
        inc["bannerCaptionEn"] = ext["bannerCaptionEn"]
    inc["occurredAt"] = occurred
    if meta_in.get("image_url"):
        inc["media"] = {"image": meta_in["image_url"]}
    return inc


def load_seed(path: Path | None) -> dict:
    if path and path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        data.setdefault("incidents", [])
        return data
    return {"incidents": []}


def md_to_incident(
    md_path: Path, geo: GeoIndex, llm: Ollama | None, seed: dict, types: tuple[str, ...],
    preset: dict | None = None, places: PlaceIndex | None = None,
) -> dict:
    meta_in, body = split_frontmatter(md_path.read_text(encoding="utf-8").replace("\r\n", "\n"))
    ext = preset or extract_with_llm(llm, meta_in, body, types)  # type: ignore[arg-type]
    if not ext.get("isIncident", True):
        raise NotIncident("LLM says this article is not a concrete incident")
    if ext.get("type") not in types:
        raise NotIncident(f"type {ext.get('type')!r} is not one of {list(types)}")
    area, notes = resolve_area(geo, ext, None if preset else llm, places)
    for n in notes:
        print(f"  geo: {n}")
    same_source = next((i for i in seed["incidents"] if meta_in.get("source_url") and i.get("sourceUrl") == meta_in["source_url"]), None)
    taken = {i["slug"] for i in seed["incidents"] if i is not same_source}
    inc = build_incident(meta_in, ext, area, taken)
    if same_source:  # re-running on the same article updates it instead of duplicating
        inc["slug"] = same_source["slug"]
        seed["incidents"][seed["incidents"].index(same_source)] = inc
    else:
        seed["incidents"].append(inc)
    return inc


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Saved news HTML / Markdown -> Markdown -> incident JSON (LLM + geo CSV)")
    ap.add_argument("inputs", nargs="*", type=Path, help=".html or .md files (default: <root>/HTML_NEWS/*.html)")
    ap.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    ap.add_argument("--out-dir", type=Path, default=None, help="Markdown folder, default: <root>/HTML_NEWS_MD")
    ap.add_argument("--json", action="store_true", help="also write <name>.meta.json")
    ap.add_argument("--no-incidents", action="store_true", help="only clean HTML to Markdown (old behaviour)")
    ap.add_argument("--csv", type=Path, default=None, help="geo CSV (default: convertcsv.csv next to this script / in root)")
    ap.add_argument("--places", type=Path, default=None, help="exact-locality CSV (default: places.csv next to this script / in config / root)")
    ap.add_argument("--seed", type=Path, default=None, help="existing incidents JSON to append to (also defines allowed types)")
    ap.add_argument("--out-json", type=Path, default=None, help="incidents JSON to write (default: <out-dir>/demo-incidents.seed.json)")
    ap.add_argument("--types", default=None, help="comma list of allowed incident types (default: types in --seed, else built-in)")
    ap.add_argument("--model", default=DEFAULT_MODEL, help="Ollama model, e.g. qwen2.5:14b (default: env LASHKOI_LLM_MODEL, else first installed)")
    ap.add_argument("--ollama-url", default=OLLAMA_URL, help=f"Ollama server (default {OLLAMA_URL}; env OLLAMA_HOST)")
    ap.add_argument("--llm-json", type=Path, default=None, help="skip the LLM: use this pre-made extraction JSON (single input)")
    ap.add_argument("--manifest", type=Path, default=None, help=f"tracking CSV (default: <out-dir>/{MANIFEST_NAME})")
    ap.add_argument("--force", action="store_true", help="re-convert HTML even if it was converted before")
    ap.add_argument("--reprocess", action="store_true", help="run the LLM on every .md again, not just pending/failed")
    args = ap.parse_args()

    out_dir = args.out_dir or args.root / "HTML_NEWS_MD"
    manifest = Manifest(args.manifest or out_dir / MANIFEST_NAME)
    files = args.inputs or sorted((args.root / "HTML_NEWS").glob("*.html"))

    # ---- stage 1: HTML -> .md (+ tracking CSV) ----
    given: list[Path] = []
    for f in files:
        if f.suffix.lower() == ".md":
            manifest.register(f)
            given.append(f)
        else:
            given.append(convert_if_needed(f, out_dir, manifest, args.json, args.force))

    # ---- which .md files does the LLM get? ----
    if args.inputs:
        queue = given  # explicit files are always processed
    else:
        for p in sorted(out_dir.glob("*.md")):  # adopt .md files that were dropped in by hand
            if p.name not in manifest.rows:
                manifest.register(p)
        queue = [
            out_dir / name for name, row in manifest.rows.items()
            if (out_dir / name).exists() and (args.reprocess or row["status"] in ("pending", "failed"))
        ]
    manifest.save()
    print(f"[csv] {manifest.path}  ({len(manifest.rows)} rows)")
    if args.no_incidents:
        return 0
    if not queue:
        print("[incident] nothing pending - every .md in the CSV is done/skipped (use --reprocess to redo)")
        return 0

    csv_path = args.csv or next(
        (p for p in (Path(__file__).with_name("convertcsv.csv"), args.root / "convertcsv.csv", args.root / "config" / "convertcsv.csv", args.root / "HTML_NEWS" / "convertcsv.csv") if p.exists()), None
    )
    if not csv_path or not csv_path.exists():
        print("Geo CSV not found - pass --csv convertcsv.csv", file=sys.stderr)
        return 1
    geo = GeoIndex(csv_path)
    places_path = args.places or next(
        (p for p in (Path(__file__).with_name("places.csv"), args.root / "config" / "places.csv", args.root / "places.csv") if p.exists()), None
    )
    places = PlaceIndex(places_path)
    print(f"[places] {places_path or 'no places.csv'}  ({len(places.rows)} keys)")
    seed = load_seed(args.seed)
    types = tuple(t.strip() for t in args.types.split(",") if t.strip()) if args.types else \
        tuple(dict.fromkeys(i["type"] for i in seed["incidents"] if i.get("type"))) or FALLBACK_TYPES
    preset = json.loads(args.llm_json.read_text(encoding="utf-8")) if args.llm_json else None
    llm = None
    if not preset:
        try:
            llm = Ollama(args.model, args.ollama_url)
        except RuntimeError as exc:
            print(f"! {exc}", file=sys.stderr)
            return 1
        print(f"[llm] Ollama model: {llm.model}")

    out_json = args.out_json or out_dir / "demo-incidents.seed.json"
    failed = 0
    print(f"[incident] {len(queue)} .md file(s) to process")
    for md in queue:
        print(f"[incident] {md.name}", flush=True)
        try:
            inc = md_to_incident(md, geo, llm, seed, types, preset, places)
        except NotIncident as exc:
            print(f"  - skipped: {exc}", file=sys.stderr)
            manifest.mark(md.name, "skipped", note=str(exc))
        except (ValueError, RuntimeError, KeyError) as exc:
            print(f"  ! failed: {exc}", file=sys.stderr)
            failed += 1
            manifest.mark(md.name, "failed", note=f"{type(exc).__name__}: {exc}")
        else:
            print(f"  -> {inc['slug']}  type={inc['type']}  {inc['divisionPcode']}/{inc.get('districtPcode', '-')}  ({inc['lat']}, {inc['lng']})")
            write_seed(seed, out_json)  # write before marking done, so the CSV never gets ahead of the JSON
            manifest.mark(md.name, "done", inc["slug"], inc["type"])
        manifest.save()
    write_seed(seed, out_json)
    print(f"[json] {len(seed['incidents'])} incidents -> {out_json}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())