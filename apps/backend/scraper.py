import hashlib
import re
import time
from collections import deque
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
import trafilatura


def scrape_website(url: str, max_paragraphs: int = 15) -> str:
    """
    Extract meaningful text from a single URL.
    Returns a plain text string (<= ~5000 chars) or an "Error ..." message.
    """
    try:
        resp = requests.get(url, timeout=20, headers={"User-Agent": "RAGBot/1.0 (+contact@example.com)"})
        resp.raise_for_status()
        html = resp.text

        # Prefer trafilatura (main content extraction)
        extracted = trafilatura.extract(html, include_comments=False, favor_precision=True) or ""
        if extracted and len(extracted.strip()) >= 100:
            return extracted[:5000]

        # Fallback: soup-based heuristics
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception:
            soup = BeautifulSoup(html, "html.parser")

        content_parts = []

        # 1) paragraphs
        for p in soup.find_all("p")[:max_paragraphs]:
            text = p.get_text(strip=True)
            if len(text) > 20:
                content_parts.append(text)

        # 2) headings
        for h in soup.find_all(["h1", "h2", "h3"])[:10]:
            text = h.get_text(strip=True)
            if len(text) > 5:
                content_parts.append(text)

        # 3) divs (filter common boilerplate)
        for div in soup.find_all("div")[:20]:
            text = div.get_text(strip=True)
            if len(text) > 50 and not re.match(r"^\s*$", text):
                if not any(skip in text.lower() for skip in ["cookie", "privacy", "terms", "login", "sign up", "menu", "navigation"]):
                    content_parts.append(text)

        # 4) spans
        for span in soup.find_all("span")[:15]:
            text = span.get_text(strip=True)
            if len(text) > 20:
                content_parts.append(text)

        content = "\n".join(content_parts).strip()
        if len(content) < 100:
            # worst-case fallback
            txt = soup.get_text("\n")
            txt = re.sub(r"\n\s+\n", "\n", txt)
            txt = re.sub(r"[ \t]+", " ", txt)
            content = txt.strip()

        if len(content) < 100:
            return f"Error: Insufficient content scraped from {url}. Content length: {len(content)}"

        return content[:5000]
    except Exception as e:
        return f"Error scraping site: {e}"


def compute_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ----------------- BFS crawler (same domain) -----------------

def _ok_url(u: str, base_host: str, allow_subdomains: bool = True) -> bool:
    try:
        p = urlparse(u)
        if p.scheme not in ("http", "https"):
            return False
        host = p.netloc.lower()
        if allow_subdomains:
            return host == base_host or host.endswith("." + base_host)
        return host == base_host
    except Exception:
        return False


def _clean_text_from_html(html: str) -> tuple[str, str]:
    """Prefer trafilatura; fallback to soup text. Returns (title, text)."""
    text = trafilatura.extract(html, include_comments=False, favor_precision=True) or ""
    title = ""

    try:
        md = trafilatura.metadata.extract_metadata(html)
        title = (md.title or "").strip() if md else ""
    except Exception:
        title = ""

    if text and len(text.strip()) >= 80:
        return title, text.strip()

    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    if not title and soup.title:
        title = (soup.title.string or "").strip()

    for sel in ["nav", "header", "footer", "script", "style", "noscript", "form"]:
        for t in soup.select(sel):
            t.decompose()

    txt = soup.get_text("\n")
    txt = re.sub(r"[ \t]+", " ", txt)
    txt = re.sub(r"\n{2,}", "\n", txt)
    text = txt.strip()
    return title, text


def crawl_site(
    base_url: str,
    extra_seeds: list[str] | None = None,
    max_pages: int = 250,
    delay_sec: float = 0.5,
    allow_subdomains: bool = True,
    user_agent: str = "RAGBot/1.0 (+contact@example.com)",
) -> list[dict]:
    """
    BFS crawl within the same domain. Returns a list of dicts:
      { "url": str, "title": str, "text": str, "hash": str, "ts": int }
    """
    seeds = [base_url] + (extra_seeds or [])
    parsed_base = urlparse(base_url)
    base_host = parsed_base.netloc.lower()

    headers = {"User-Agent": user_agent}
    queue = deque(seeds)
    visited = set()
    results: list[dict] = []

    while queue and len(visited) < max_pages:
        url = queue.popleft()
        if url in visited:
            continue
        if not _ok_url(url, base_host, allow_subdomains=allow_subdomains):
            continue

        visited.add(url)
        try:
            r = requests.get(url, headers=headers, timeout=25)
            if r.status_code != 200 or "text/html" not in r.headers.get("content-type", ""):
                continue

            title, text = _clean_text_from_html(r.text)
            if text and len(text) >= 120:  # skip thin pages
                h = hashlib.sha1((url + "\n" + text).encode("utf-8")).hexdigest()
                results.append({"url": url, "title": title or "", "text": text, "hash": h, "ts": int(time.time())})

            # discover more links if still under page budget
            try:
                soup = BeautifulSoup(r.text, "lxml")
            except Exception:
                soup = BeautifulSoup(r.text, "html.parser")

            for a in soup.find_all("a", href=True):
                nxt = urljoin(url, a["href"])
                # skip feeds/search/wp-admin, etc.
                if any(bad in nxt for bad in ("/wp-json", "/?s=", "/feed", "/wp-admin", "#", "mailto:", "tel:")):
                    continue
                if _ok_url(nxt, base_host, allow_subdomains) and nxt not in visited:
                    queue.append(nxt)

            time.sleep(delay_sec)
        except Exception:
            # ignore fetch/parse errors; continue crawling
            continue

    return results
