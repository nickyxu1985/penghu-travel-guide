#!/usr/bin/env python3
"""Fetch all scenic-spot photos from the Penghu National Scenic Area website.

依 SDD.md §5 的對映,從各景點詳情頁(sources[0])的 swiper 輪播
(div.swiper.spPicture 內 id 含 repPhoto 的 img)抓取全部照片,存到
assets/img/<slug>-<n>.<ext>(副檔名統一小寫),並更新 data/places.json
各筆的 images 欄位(格式見 AGENTS.md §3)。

授權依據:已向澎管處承辦人確認官網照片可使用,條件為標機關署名
(澎湖國家風景區管理處)+ 註明出處;官網無攝影者欄位,只能標機關名。
每張 credit 因此含機關署名與該景點詳情頁 URL(可回溯出處頁)。
id 含 repNearScenery 的是鄰近景點縮圖,不是本景點照片,不抓。

禮貌抓取與 fetch_nsa.py 相同:專案 UA、每請求 >= 1.2 秒、指數退避重試;
官網偶有異常回應(頁面正常但解析 0 張),會清掉該頁快取重抓。
需要 pypinyin(僅因 import fetch_nsa;照片抓取本身不用):
    pip install pypinyin
"""

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.request

import fetch_nsa
from fetch_nsa import BASE_URL, FetchError


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PATH = REPO_ROOT / "data/places.json"
IMG_DIR = REPO_ROOT / "assets" / "img"
CREDIT_ORG = "交通部觀光署澎湖國家風景區管理處官網"
IMG_PATTERN = re.compile(r"<img[^>]*>", re.I)
ID_PATTERN = re.compile(r'id="([^"]*)"')
SRC_PATTERN = re.compile(r'src="([^"]*)"')
ALLOWED_EXT = {"jpg", "jpeg", "png", "webp"}
PARSE_RETRIES = 3  # 頁面正常但解析 0 張時的重抓次數


def cache_file(url):
    key = hashlib.md5(url.encode()).hexdigest()
    return fetch_nsa.CACHE_DIR / f"{key}.html" if fetch_nsa.CACHE_DIR else None


def parse_photo_urls(page_html):
    """Return ordered photo URLs (absolute) from a detail page.

    只取 id 含 repPhoto 的 img(景點照片輪播);repNearScenery 為鄰近景點
    縮圖,不算本景點照片。
    """
    urls, seen = [], set()
    for tag in IMG_PATTERN.findall(page_html):
        img_id = ID_PATTERN.search(tag)
        if not img_id or "repPhoto" not in img_id.group(1):
            continue
        src = SRC_PATTERN.search(tag)
        if not src:
            continue
        url = src.group(1)
        if url.startswith("/"):
            url = BASE_URL + url
        elif not url.startswith("http"):
            url = f"{BASE_URL}/{url}"
        if url not in seen:
            seen.add(url)
            urls.append(url)
    return urls


def fetch_detail_photos(url):
    """Fetch a detail page and parse photo URLs; retry when 解析 0 張."""
    for attempt in range(1, PARSE_RETRIES + 1):
        page_html = fetch_nsa.fetch(url)
        photos = parse_photo_urls(page_html)
        if photos:
            return photos
        # 官網偶發異常:頁面內容正常但輪播沒渲染出來。清快取重抓。
        cached = cache_file(url)
        if cached and cached.is_file() and attempt < PARSE_RETRIES:
            cached.unlink()
            time.sleep(fetch_nsa.REQUEST_DELAY * attempt)
    return []


def fetch_binary(url):
    """GET binary with project UA, throttle and exponential backoff."""
    time.sleep(fetch_nsa.REQUEST_DELAY_STATE[0])
    last_error = None
    for attempt in range(1, fetch_nsa.MAX_RETRIES + 1):
        try:
            request = urllib.request.Request(
                url, headers={"User-Agent": fetch_nsa.USER_AGENT,
                              "Referer": fetch_nsa.LIST_URL})
            with urllib.request.urlopen(request, timeout=60) as response:
                body = response.read()
            if len(body) < 1000:  # 異常回應(錯誤頁或空檔)
                raise FetchError(f"回應過小({len(body)} bytes):{url}")
            return body
        except (FetchError, urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt < fetch_nsa.MAX_RETRIES:
                time.sleep(fetch_nsa.REQUEST_DELAY * attempt)
    raise FetchError(f"下載失敗 {url}: {last_error}")


def photo_ext(url):
    name = url.rsplit("/", 1)[-1]
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else "jpg"
    return ext if ext in ALLOWED_EXT else "jpg"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DEFAULT_PATH)
    parser.add_argument("--img-dir", type=Path, default=IMG_DIR)
    parser.add_argument("--delay", type=float, default=fetch_nsa.REQUEST_DELAY,
                        help="每請求間隔秒數(預設 1.2,勿低於 1)")
    parser.add_argument("--cache-dir", type=Path, default=None,
                        help="快取抓過的詳情頁與照片,中斷可續跑")
    parser.add_argument("--start", type=int, default=0,
                        help="從第幾筆開始(0-based,搭配 --limit 分批跑)")
    parser.add_argument("--limit", type=int, default=None,
                        help="只處理幾筆(預設全部)")
    args = parser.parse_args()
    if args.cache_dir:
        fetch_nsa.CACHE_DIR = args.cache_dir
        fetch_nsa.CACHE_DIR.mkdir(parents=True, exist_ok=True)
    fetch_nsa.REQUEST_DELAY_STATE[0] = max(1.0, args.delay)
    args.img_dir.mkdir(parents=True, exist_ok=True)

    with args.data.open(encoding="utf-8") as source:
        places = json.load(source)

    end = None if args.limit is None else args.start + args.limit
    batch = places[args.start:end]
    total_photos = 0
    failed_pages = []
    failed_downloads = []
    for index, place in enumerate(batch, args.start + 1):
        slug, detail_url = place["slug"], place["sources"][0]
        photo_urls = fetch_detail_photos(detail_url)
        if not photo_urls:
            failed_pages.append(detail_url)
            place.pop("images", None)
            print(f"[{index}/{len(places)}] {place['name']}:解析 0 張(已重試),略過")
            continue
        credit = f"{CREDIT_ORG}({detail_url})"
        images = []
        for number, photo_url in enumerate(photo_urls, 1):
            ext = photo_ext(photo_url)
            filename = f"{slug}-{number}.{ext}"
            target = args.img_dir / filename
            if not target.is_file() or target.stat().st_size < 1000:
                try:
                    target.write_bytes(fetch_binary(photo_url))
                except FetchError as exc:
                    failed_downloads.append(photo_url)
                    print(f"    下載失敗:{exc}", file=sys.stderr)
                    continue
            images.append({"src": f"assets/img/{filename}", "credit": credit})
        # 清掉本次不再使用的舊照片(張數變少時)
        keep = {img["src"] for img in images}
        for old in args.img_dir.glob(f"{slug}-*"):
            if f"assets/img/{old.name}" not in keep:
                old.unlink()
        if images:
            place["images"] = images
            total_photos += len(images)
        else:
            place.pop("images", None)
        print(f"[{index}/{len(places)}] {place['name']}:{len(images)} 張")

    # images 插在 tags 之後、sources 之前(對齊 AGENTS.md §3 欄位順序)
    key_order = ["slug", "name", "area", "category", "summary", "description",
                 "address", "tags", "images", "sources", "nsa_id", "updated_at"]
    rank = {key: position for position, key in enumerate(key_order)}
    ordered = [
        dict(sorted(place.items(), key=lambda item: rank.get(item[0], 99)))
        for place in places
    ]
    with args.data.open("w", encoding="utf-8") as target:
        json.dump(ordered, target, ensure_ascii=False, indent=2)
        target.write("\n")

    with_images = sum(1 for place in places if place.get("images"))
    print(f"完成:{with_images}/{len(places)} 筆景點有照片,共 {total_photos} 張")
    if failed_pages:
        print(f"解析失敗頁面 {len(failed_pages)} 頁:", file=sys.stderr)
        for url in failed_pages:
            print(f"  {url}", file=sys.stderr)
    if failed_downloads:
        print(f"下載失敗照片 {len(failed_downloads)} 張:", file=sys.stderr)
        for url in failed_downloads:
            print(f"  {url}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
