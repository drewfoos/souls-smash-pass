#!/usr/bin/env python3
"""
Download character images from Fandom wiki APIs.

For each character in characters.ts, this script:
1. Queries the appropriate Fandom wiki API for image URLs
2. Downloads the image to public/characters/{character_id}.jpg
3. Skips characters that already have images

Usage:
    python3 scripts/download_images.py
    python3 scripts/download_images.py --game ER        # Only Elden Ring
    python3 scripts/download_images.py --retry-failed    # Retry previously failed
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# -- Configuration --
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
CHARS_FILE = PROJECT_DIR / "src" / "data" / "characters.ts"
OUT_DIR = PROJECT_DIR / "public" / "characters"
FAILED_LOG = PROJECT_DIR / "scripts" / "failed_images.json"

# Fandom wiki base URLs
FANDOM_WIKIS = {
    "DeS": "https://demonssouls.fandom.com",
    "DS1": "https://darksouls.fandom.com",
    "DS2": "https://darksouls.fandom.com",  # shared wiki
    "DS3": "https://darksouls.fandom.com",  # shared wiki
    "BB": "https://bloodborne.fandom.com",
    "Sekiro": "https://sekiroshadowsdietwice.fandom.com",
    "ER": "https://eldenring.fandom.com",
}

# Fextralife wiki base URLs
FEXTRA_WIKIS = {
    "DeS": "https://demonssouls.wiki.fextralife.com",
    "DS1": "https://darksouls.wiki.fextralife.com",
    "DS2": "https://darksouls2.wiki.fextralife.com",
    "DS3": "https://darksouls3.wiki.fextralife.com",
    "BB": "https://bloodborne.wiki.fextralife.com",
    "Sekiro": "https://sekiroshadowsdietwice.wiki.fextralife.com",
    "ER": "https://eldenring.wiki.fextralife.com",
}

# Some characters need name mapping for wiki lookups
WIKI_NAME_OVERRIDES = {
    # Format: character_id -> wiki page title
    "er_malenia": "Malenia, Blade of Miquella",
    "er_radagon": "Radagon of the Golden Order",
    "er_rykard": "Rykard, Lord of Blasphemy",
    "er_godfrey": "Godfrey, First Elden Lord",
    "er_maliketh": "Maliketh, the Black Blade",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 SoulsSmashPass/1.0",
    "Accept": "text/html,image/*,*/*",
}


def parse_characters_ts(filepath: Path) -> list[dict]:
    """Parse characters.ts to extract character data."""
    content = filepath.read_text(encoding="utf-8")

    chars = []
    # Match each character object block
    pattern = re.compile(
        r'\{\s*'
        r'id:\s*"([^"]+)".*?'
        r'name:\s*"([^"]+)".*?'
        r'game:\s*"([^"]+)".*?'
        r'type:\s*"([^"]+)".*?'
        r'imageUrl:\s*"([^"]*)".*?'
        r'description:\s*"([^"]*)"',
        re.DOTALL
    )

    for m in pattern.finditer(content):
        chars.append({
            "id": m.group(1),
            "name": m.group(2),
            "game": m.group(3),
            "type": m.group(4),
            "imageUrl": m.group(5),
            "description": m.group(6),
        })

    return chars


def fandom_api_image(wiki_base: str, page_title: str, thumb_size: int = 800) -> str | None:
    """Query Fandom wiki API for a page's main image."""
    encoded = urllib.parse.quote(page_title)
    api_url = (
        f"{wiki_base}/api.php?"
        f"action=query&titles={encoded}&prop=pageimages&format=json"
        f"&pithumbsize={thumb_size}"
    )

    try:
        req = urllib.request.Request(api_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        pages = data.get("query", {}).get("pages", {})
        for page_id, page_data in pages.items():
            if page_id == "-1":
                continue
            thumb = page_data.get("thumbnail", {})
            source = thumb.get("source")
            if source:
                # Get larger version by modifying the URL
                # Fandom thumbs have /revision/latest/scale-to-width-down/XXX
                # We can bump the size
                source = re.sub(
                    r'/scale-to-width-down/\d+',
                    f'/scale-to-width-down/{thumb_size}',
                    source
                )
                return source
    except Exception:
        pass

    return None


def fandom_api_image_from_file(wiki_base: str, page_title: str) -> str | None:
    """Try to get image via Fandom imageinfo API."""
    # Try common image file names
    name_variants = [
        page_title,
        page_title.replace(" ", "_"),
        page_title.replace(",", ""),
        page_title.split(",")[0].strip(),
    ]

    for name in name_variants:
        for ext in [".png", ".jpg", ".webp"]:
            file_title = f"File:{name}{ext}"
            encoded = urllib.parse.quote(file_title)
            api_url = (
                f"{wiki_base}/api.php?"
                f"action=query&titles={encoded}&prop=imageinfo&iiprop=url"
                f"&format=json"
            )

            try:
                req = urllib.request.Request(api_url, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read())

                pages = data.get("query", {}).get("pages", {})
                for page_id, page_data in pages.items():
                    if page_id == "-1":
                        continue
                    imageinfo = page_data.get("imageinfo", [])
                    if imageinfo:
                        return imageinfo[0].get("url")
            except Exception:
                continue

    return None


def fextra_scrape_image(wiki_base: str, page_title: str) -> str | None:
    """Scrape Fextralife wiki page for the main character image."""
    slug = page_title.replace("'", "").replace("'", "")
    slug = re.sub(r'[^a-zA-Z0-9]+', '+', slug).strip('+')
    url = f"{wiki_base}/{slug}"

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="replace")

        # Look for infobox image or main content image
        img_matches = re.findall(
            r'https?://[^"\'>\s]*fextralife\.com/file/[^"\'>\s]+\.(?:jpg|jpeg|png|webp)',
            html,
            re.IGNORECASE
        )

        if img_matches:
            # Filter out tiny icons (usually have "icon" or very short names)
            for img_url in img_matches:
                lower = img_url.lower()
                if "icon" not in lower and "logo" not in lower and "banner" not in lower:
                    return img_url
            return img_matches[0]
    except Exception:
        pass

    return None


def download_image(url: str, dest: Path) -> bool:
    """Download an image from URL to destination path."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if not content_type.startswith("image/"):
                return False

            data = resp.read()
            if len(data) < 1000:  # too small, likely placeholder
                return False

            dest.write_bytes(data)
            return True
    except Exception:
        return False


def get_wiki_name(char: dict) -> str:
    """Get the wiki page name for a character."""
    if char["id"] in WIKI_NAME_OVERRIDES:
        return WIKI_NAME_OVERRIDES[char["id"]]
    return char["name"]


def process_character(char: dict, force: bool = False) -> tuple[str, bool, str]:
    """Process a single character. Returns (id, success, source)."""
    char_id = char["id"]
    dest = OUT_DIR / f"{char_id}.jpg"

    if dest.exists() and not force:
        return (char_id, True, "cached")

    wiki_name = get_wiki_name(char)
    game = char["game"]
    fandom_base = FANDOM_WIKIS.get(game, "")
    fextra_base = FEXTRA_WIKIS.get(game, "")

    # Strategy 1: Fandom pageimages API (most reliable)
    if fandom_base:
        img_url = fandom_api_image(fandom_base, wiki_name)
        if img_url and download_image(img_url, dest):
            return (char_id, True, "fandom-api")

    # Strategy 2: Fandom direct file lookup
    if fandom_base:
        img_url = fandom_api_image_from_file(fandom_base, wiki_name)
        if img_url and download_image(img_url, dest):
            return (char_id, True, "fandom-file")

    # Strategy 3: Fextralife page scrape
    if fextra_base:
        img_url = fextra_scrape_image(fextra_base, wiki_name)
        if img_url and download_image(img_url, dest):
            return (char_id, True, "fextralife")

    # Strategy 4: Try alternate name forms
    alt_names = set()
    # Remove parentheticals
    base_name = re.sub(r'\s*\(.*?\)', '', wiki_name).strip()
    if base_name != wiki_name:
        alt_names.add(base_name)
    # Take first part before comma
    if ',' in wiki_name:
        alt_names.add(wiki_name.split(',')[0].strip())
    # Remove "the" prefix
    if wiki_name.lower().startswith("the "):
        alt_names.add(wiki_name[4:])

    for alt_name in alt_names:
        if fandom_base:
            img_url = fandom_api_image(fandom_base, alt_name)
            if img_url and download_image(img_url, dest):
                return (char_id, True, f"fandom-alt:{alt_name}")

    return (char_id, False, "not-found")


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--game", type=str, help="Only process this game (e.g., ER)")
    parser.add_argument("--retry-failed", action="store_true", help="Retry previously failed characters")
    parser.add_argument("--force", action="store_true", help="Re-download even if file exists")
    parser.add_argument("--concurrency", type=int, default=4, help="Number of concurrent downloads")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Parse characters
    chars = parse_characters_ts(CHARS_FILE)
    print(f"Found {len(chars)} characters in characters.ts")

    # Filter by game if specified
    if args.game:
        chars = [c for c in chars if c["game"] == args.game]
        print(f"Filtered to {len(chars)} characters for game: {args.game}")

    # Load previous failures if retrying
    failed_ids = set()
    if args.retry_failed and FAILED_LOG.exists():
        failed_ids = set(json.loads(FAILED_LOG.read_text()))
        chars = [c for c in chars if c["id"] in failed_ids]
        print(f"Retrying {len(chars)} previously failed characters")

    if not chars:
        print("No characters to process!")
        return

    success = 0
    failed = []
    cached = 0

    print(f"\nDownloading images for {len(chars)} characters (concurrency: {args.concurrency})...\n")

    with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        futures = {
            executor.submit(process_character, c, args.force): c
            for c in chars
        }

        for i, future in enumerate(as_completed(futures), 1):
            char = futures[future]
            char_id, ok, source = future.result()

            if ok:
                if source == "cached":
                    cached += 1
                    # Don't print cached to reduce noise
                else:
                    success += 1
                    print(f"  [{i}/{len(chars)}] ✓ {char['name']} ({source})")
            else:
                failed.append(char_id)
                print(f"  [{i}/{len(chars)}] ✗ {char['name']} ({source})")

            # Be polite - small delay between batches
            if i % 10 == 0:
                time.sleep(0.5)

    # Save failed list for retry
    if failed:
        FAILED_LOG.write_text(json.dumps(failed, indent=2))

    existing = cached
    print(f"\n{'='*50}")
    print(f"Results:")
    print(f"  Already had: {existing}")
    print(f"  Downloaded:  {success}")
    print(f"  Failed:      {len(failed)}")
    print(f"  Total:       {len(chars)}")
    print(f"{'='*50}")

    if failed:
        print(f"\nFailed characters saved to {FAILED_LOG}")
        print("Run with --retry-failed to try again")
        print("\nFailed characters:")
        for fid in failed[:20]:
            char = next((c for c in chars if c["id"] == fid), None)
            if char:
                print(f"  - {char['name']} ({char['game']})")
        if len(failed) > 20:
            print(f"  ... and {len(failed)-20} more")


if __name__ == "__main__":
    main()
