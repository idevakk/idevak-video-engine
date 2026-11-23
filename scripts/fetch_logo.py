#!/usr/bin/env python3
"""Helper script to fetch official brand/vendor logos from authentic online services.

Priority order:
1. SVGL API (https://api.svgl.app?search=<query>) -> authentic vector SVGs
2. FaviconDL API (https://favicondl.com/api/extract?url=<domain>) -> authentic site icons/SVGs
3. Fallback guidance for Firecrawl / web search if neither service provides the asset.

LLM Rule: Never let an LLM invent or draw logos. Always source authentic real logos.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "build/cache/logos"
CACHE_FILE = CACHE_DIR / "cache.json"
CACHE_TTL_SECONDS = 3600  # 1 hour cache to prevent rate-limiting

USER_AGENT = "idevak-video-engine/1.1 (https://github.com/idevakk/idevak-video-engine)"


def slugify(text: str) -> str:
    """Convert brand or domain string to a clean filename slug."""
    text = re.sub(r"^https?://", "", text)
    text = re.sub(r"^www\.", "", text)
    text = text.split("/")[0]  # take host if URL
    slug = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", slug) or "logo"


def load_cache() -> dict:
    if not CACHE_FILE.is_file():
        return {}
    try:
        data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        # Prune expired entries
        now = time.time()
        return {k: v for k, v in data.items() if now - v.get("timestamp", 0) < CACHE_TTL_SECONDS}
    except Exception:
        return {}


def save_cache(cache: dict) -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        CACHE_FILE.write_text(json.dumps(cache, indent=2), encoding="utf-8")
    except Exception:
        pass


def http_get(url: str, timeout: int = 15) -> tuple[int, bytes, dict]:
    """Execute HTTP GET with standard user agent."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = resp.status
            content = resp.read()
            headers = dict(resp.headers)
            return status, content, headers
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)
    except Exception as e:
        return 0, str(e).encode(), {}


def fetch_from_svgl(query: str, theme: str = "auto", wordmark: bool = False, force: bool = False) -> dict | None:
    """Search and retrieve an authentic vector SVG from the SVGL API."""
    cache = load_cache()
    cache_key = f"svgl:{query.lower()}:{theme}:{wordmark}"
    if not force and cache_key in cache:
        cached = cache[cache_key]
        if cached.get("not_found"):
            return None
        if "data" in cached:
            return cached["data"]

    search_url = f"https://api.svgl.app?search={urllib.parse.quote(query)}"
    status, body, _ = http_get(search_url)
    if status != 200 or not body:
        return None

    try:
        items = json.loads(body.decode("utf-8"))
    except Exception:
        return None

    if not isinstance(items, list) or len(items) == 0:
        cache[cache_key] = {"timestamp": time.time(), "not_found": True}
        save_cache(cache)
        return None

    # Score candidates: exact title match > starts-with > first result
    q_lower = query.lower()
    best_item = None
    for item in items:
        title = item.get("title", "").lower()
        if title == q_lower:
            best_item = item
            break
    if not best_item:
        for item in items:
            title = item.get("title", "").lower()
            if title.startswith(q_lower):
                best_item = item
                break
    if not best_item:
        best_item = items[0]

    # Resolve route
    route_obj = best_item.get("wordmark") if wordmark and best_item.get("wordmark") else best_item.get("route")
    route_url = None
    if isinstance(route_obj, dict):
        if theme == "dark":
            route_url = route_obj.get("dark") or route_obj.get("light")
        elif theme == "light":
            route_url = route_obj.get("light") or route_obj.get("dark")
        else:  # auto: prefer dark variant for this dark-canvas video engine
            route_url = route_obj.get("dark") or route_obj.get("light")
    elif isinstance(route_obj, str):
        route_url = route_obj

    if not route_url:
        return None

    # Fetch SVG content
    svg_status, svg_bytes, _ = http_get(route_url)
    if svg_status != 200 or not svg_bytes or b"<svg" not in svg_bytes:
        return None

    result = {
        "provider": "svgl",
        "title": best_item.get("title", query),
        "url": route_url,
        "format": "svg",
        "category": best_item.get("category", ""),
        "brandUrl": best_item.get("url", ""),
        "content": svg_bytes.decode("utf-8", errors="replace"),
    }

    cache[cache_key] = {"timestamp": time.time(), "data": result}
    save_cache(cache)
    return result


def fetch_from_favicondl(domain_or_url: str, size: int = 512, force: bool = False) -> dict | None:
    """Fetch official favicon/logo from FaviconDL API."""
    # Clean domain
    domain = domain_or_url.strip()
    domain = re.sub(r"^https?://", "", domain)
    domain = domain.split("/")[0]

    cache = load_cache()
    cache_key = f"favicondl:{domain}:{size}"
    if not force and cache_key in cache:
        cached = cache[cache_key]
        if cached.get("not_found"):
            return None
        if "data" in cached:
            return cached["data"]

    # 1. Fetch metadata first
    meta_url = f"https://favicondl.com/api/extract?url={urllib.parse.quote(domain)}&format=json"
    status, body, _ = http_get(meta_url)
    if status != 200 or not body:
        return None

    try:
        meta = json.loads(body.decode("utf-8"))
    except Exception:
        return None

    if not meta.get("ok"):
        cache[cache_key] = {"timestamp": time.time(), "not_found": True}
        save_cache(cache)
        return None

    # Check if vector SVG is available
    is_vector = meta.get("vector") or meta.get("format") == "svg"
    target_format = "svg" if is_vector else "png"

    # Download image binary
    if is_vector:
        download_url = meta.get("proxyUrl") or meta.get("iconUrl") or f"https://favicondl.com/api/extract?url={urllib.parse.quote(domain)}"
    else:
        download_url = f"https://favicondl.com/api/extract?url={urllib.parse.quote(domain)}&size={size}"

    img_status, img_bytes, _ = http_get(download_url)
    if img_status != 200 or not img_bytes:
        return None

    result = {
        "provider": "favicondl",
        "title": meta.get("domain", domain),
        "url": download_url,
        "format": target_format,
        "is_vector": is_vector,
        "content_bytes": img_bytes,
    }
    if is_vector:
        result["content"] = img_bytes.decode("utf-8", errors="replace")

    # Cache metadata without huge binary bytes
    cache_record = {
        "timestamp": time.time(),
        "data": {k: v for k, v in result.items() if k != "content_bytes"}
    }
    cache[cache_key] = cache_record
    save_cache(cache)
    return result


def fetch_logo(
    query: str,
    domain: str | None = None,
    output: str | Path | None = None,
    theme: str = "auto",
    wordmark: bool = False,
    size: int = 512,
    provider: str = "auto",
    force: bool = False,
    dry_run: bool = False,
) -> dict:
    """Waterfall logo retrieval: SVGL -> FaviconDL -> Fallback guidance."""
    result = None

    # Provider 1: SVGL
    if provider in ("auto", "svgl"):
        result = fetch_from_svgl(query, theme=theme, wordmark=wordmark, force=force)

    # Provider 2: FaviconDL
    if not result and provider in ("auto", "favicondl"):
        target_domain = domain
        if not target_domain:
            if "." in query and " " not in query:
                target_domain = query
            else:
                # heuristic: try query + .com
                target_domain = f"{slugify(query)}.com"
        result = fetch_from_favicondl(target_domain, size=size, force=force)

    if not result:
        return {
            "ok": False,
            "query": query,
            "error": "No logo found via SVGL or FaviconDL",
            "fallback_instructions": [
                f'Firecrawl search: firecrawl search "{query} official vector logo svg"',
                f'Web search: search_web "{query} official brand assets logo svg"',
                f"Check official website press kit / branding page for original SVG.",
                "CRITICAL: Never generate, code, or fake a logo with an LLM.",
            ],
        }

    # Determine destination filename
    fmt = result.get("format", "svg")
    slug = slugify(result.get("title") or query)
    if output:
        dest_path = Path(output)
        if not dest_path.suffix:
            dest_path = dest_path.with_suffix(f".{fmt}")
    else:
        dest_path = ROOT / f"assets/logos/{slug}.{fmt}"

    try:
        rel_path = str(dest_path.relative_to(ROOT)).replace("\\", "/")
    except ValueError:
        rel_path = str(dest_path).replace("\\", "/")
    result["dest_path"] = rel_path

    if not dry_run:
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        if "content_bytes" in result:
            dest_path.write_bytes(result["content_bytes"])
        elif "content" in result:
            dest_path.write_text(result["content"], encoding="utf-8")

    # Generate ready-to-use schema snippet
    result["ok"] = True
    result["schema_snippet"] = {
        "src": result["dest_path"],
        "name": result.get("title") or query.capitalize(),
    }
    return result


def main():
    parser = argparse.ArgumentParser(
        description="Fetch official vector/brand logos from SVGL & FaviconDL without LLM fabrication."
    )
    parser.add_argument("query", help="Brand, tool, or product name (e.g., 'discord', 'docker', 'vercel.com')")
    parser.add_argument("--domain", help="Explicit website domain for FaviconDL lookup (e.g., 'github.com')")
    parser.add_argument("-o", "--output", help="Target output file path (defaults to assets/logos/<name>.<ext>)")
    parser.add_argument("--theme", choices=["auto", "dark", "light"], default="auto", help="Theme preference (default: auto)")
    parser.add_argument("--size", type=int, default=512, help="Preferred raster size if SVG is unavailable (default: 512)")
    parser.add_argument("--wordmark", action="store_true", help="Prefer wordmark version if available in SVGL")
    parser.add_argument("--provider", choices=["auto", "svgl", "favicondl"], default="auto", help="Provider waterfall selection")
    parser.add_argument("--force", action="store_true", help="Bypass local cache")
    parser.add_argument("--dry-run", action="store_true", help="Search and report without saving to disk")
    parser.add_argument("--json", action="store_true", dest="as_json", help="Output machine-readable JSON")

    args = parser.parse_args()
    res = fetch_logo(
        query=args.query,
        domain=args.domain,
        output=args.output,
        theme=args.theme,
        wordmark=args.wordmark,
        size=args.size,
        provider=args.provider,
        force=args.force,
        dry_run=args.dry_run,
    )

    if args.as_json:
        # Strip large raw payload from CLI JSON output
        out_copy = {k: v for k, v in res.items() if k not in ("content", "content_bytes")}
        print(json.dumps(out_copy, indent=2))
        sys.exit(0 if res.get("ok") else 1)

    if res.get("ok"):
        print(f"[fetch_logo] Success! Retrieved authentic logo from {res['provider'].upper()}")
        print(f"[fetch_logo] Title:    {res.get('title')}")
        print(f"[fetch_logo] URL:      {res.get('url')}")
        print(f"[fetch_logo] Saved to: {res.get('dest_path')}")
        print("\n[meta.logos snippet]:")
        print(json.dumps(res.get("schema_snippet"), indent=2))
        sys.exit(0)
    else:
        print(f"[fetch_logo] Error: {res.get('error')}", file=sys.stderr)
        print("\n[fetch_logo] Fallback Guidance (DO NOT FABRICATE LOGO WITH LLM):", file=sys.stderr)
        for step in res.get("fallback_instructions", []):
            print(f"  • {step}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
