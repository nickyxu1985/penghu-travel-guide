#!/usr/bin/env python3
"""Fetch scenic-spot data from the Penghu National Scenic Area website.

依 SDD.md §5 的欄位對映,從澎湖國家風景區管理處官網抓取景點全量資料,
產生 / 更新 data/places.json(格式與排序依 SDD.md §2、AGENTS.md §3)。

禮貌抓取:每頁間隔 >= 1 秒,User-Agent 標明專案名稱。
需要 pypinyin(僅 scripts 使用;validator 仍為純標準函式庫):
    pip install pypinyin
"""

import argparse
from datetime import datetime, timedelta, timezone
import html
import json
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.request

from pypinyin import Style, lazy_pinyin


BASE_URL = "https://www.penghu-nsa.gov.tw"
LIST_URL = (
    BASE_URL + "/TravelInformationSceneryListC001200.aspx"
    "?appname=TravelInformationSceneryListC001200"
)
DETAIL_URL = (
    BASE_URL + "/TravelInformationSceneryDetailC001200.aspx"
    "?Cond={nsa_id}&Language=1028"
)
USER_AGENT = (
    "penghu-travel-guide/1.0 "
    "(+https://github.com/nickyxu1985/penghu-travel-guide)"
)
REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PATH = REPO_ROOT / "data/places.json"
REQUEST_DELAY = 1.2  # 秒,>= 1(禮貌抓取,官網為政府站)
MAX_RETRIES = 3

# 與 AGENTS.md §3 同步(validator 也檢查這兩份允許值)。
AREAS = ("馬公市", "湖西鄉", "白沙鄉", "西嶼鄉", "望安鄉", "七美鄉")
CATEGORIES = ("自然風景", "遊憩", "文化", "文化資產", "生態", "藝術",
              "宗教廟宇", "觀光工廠", "交通場站", "國家風景區")

# 官網介紹中需移除的外連 / 廣告段落標記(見 SDD.md §5 description 轉換)。
DROP_MARKERS = ("追星資訊", "看看環景", "360", "Google", "google")


class FetchError(RuntimeError):
    pass


CACHE_DIR = None  # set by --cache-dir; fetched pages land here for resume
REQUEST_DELAY_STATE = [REQUEST_DELAY]


def fetch(url, referer=None):
    """GET with project UA, polite retry with backoff; optional file cache."""
    if CACHE_DIR:
        import hashlib
        key = hashlib.md5(url.encode()).hexdigest()
        cached = CACHE_DIR / f"{key}.html"
        if cached.is_file():
            return cached.read_text(encoding="utf-8")
    time.sleep(REQUEST_DELAY_STATE[0])  # 只在真正抓取時節流
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            request = urllib.request.Request(
                url, headers={"User-Agent": USER_AGENT,
                              "Referer": referer or LIST_URL})
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read().decode("utf-8", errors="replace")
            if "網頁發生問題" in body or len(body) < 5000:
                raise FetchError(f"伺服器回傳錯誤頁:{url}")
            if CACHE_DIR:
                import hashlib
                key = hashlib.md5(url.encode()).hexdigest()
                (CACHE_DIR / f"{key}.html").write_text(body, encoding="utf-8")
            return body
        except (FetchError, urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                time.sleep(REQUEST_DELAY * attempt)
    raise FetchError(f"抓取失敗 {url}: {last_error}")


def unescape(text):
    """Unescape entities repeatedly(官網有雙重編碼的 &amp;amp;)"""
    previous = None
    while previous != text:
        previous, text = text, html.unescape(text)
    return text


def strip_tags(fragment):
    """Remove tags, <br> becomes newline, unescape entities."""
    fragment = re.sub(r"(?i)<br\s*/?>", "\n", fragment)
    fragment = re.sub(r"<[^>]+>", "", fragment)
    return unescape(fragment).replace("\xa0", " ")


def parse_list_page(page_html):
    """Return list of {name, area, category, nsa_id} from a list page."""
    entries = []
    grid = re.search(r'<ul class="travel-grid[^"]*">(.*?)</ul>', page_html, re.S)
    if not grid:
        return entries
    for card in re.findall(r"<li>(.*?)</li>", grid.group(1), re.S):
        link = re.search(
            r'href="[^"]*TravelInformationSceneryDetailC001200\.aspx'
            r'\?Cond=([0-9a-fA-F-]{36})[^"]*"[^>]*title="([^"]*)"', card)
        if not link:
            continue
        nsa_id, name = link.group(1).lower(), unescape(link.group(2)).strip()
        category = re.search(r'class="travel-card-type"[^>]*>(.*?)</span>', card, re.S)
        category = strip_tags(category.group(1)).strip() if category else ""
        category = re.sub(r"\s+", "", category)
        if category.endswith("類"):
            category = category[:-1]
        area = re.search(
            r'class="d-flex justify-content-between mb-2">'
            r'\s*<span[^>]*>(.*?)</span>', card, re.S)
        area = strip_tags(area.group(1)).strip() if area else ""
        area = re.sub(r"\s+", "", area)
        entries.append({
            "name": name, "area": area, "category": category, "nsa_id": nsa_id,
        })
    return entries


def page_count(first_page_html):
    match = re.search(r"共有\s*<span>\s*(\d+)</span>\s*筆資料", first_page_html)
    if not match:
        raise FetchError("無法從列表頁解析總筆數")
    total = int(match.group(1))
    last = re.search(r'aLinkLastPage" href="[^"]*Pindex=(\d+)', first_page_html)
    if last:
        return int(last.group(1)), total
    return max(1, -(-total // 12)), total


def extract_balanced_div(page_html, class_name):
    """回傳 class 為 class_name 的 <div> 的完整內容(以標籤平衡計數,
    正確處理巢狀 <div>;舊寫法用非貪婪比對會在第一個巢狀 </div> 早停)。"""
    start = re.search(
        r'<div\b[^>]*class="' + re.escape(class_name) + r'"[^>]*>',
        page_html)
    if not start:
        return None
    depth = 1
    for tag in re.finditer(r"<div\b[^>]*>|</div>", page_html[start.end():]):
        if tag.group(0).startswith("</"):
            depth -= 1
            if depth == 0:
                return page_html[start.end():start.end() + tag.start()]
        else:
            depth += 1
    return None


def parse_detail_page(page_html):
    """Return (name, description, address) from a detail page."""
    name = ""
    title = re.search(r'<h2 class="travel-detail-tit">(.*?)</h2>', page_html, re.S)
    if title:
        name = strip_tags(title.group(1)).strip()
    description = ""
    article = extract_balanced_div(page_html, "article-content kf_edit")
    if article is not None:
        description = clean_description(strip_tags(article))
    address = ""
    label = re.search(r"地址</span>", page_html)
    if label:
        value = re.search(r"<span>(.*?)</span>", page_html[label.end():], re.S)
        if value:
            address = re.sub(r"\s+", "", strip_tags(value.group(1)))
    return name, description, address


def clean_description(text):
    """去外連段落、段落以 \\n\\n 連接;保留官網全文,不設字數上限
    (Issue #18:舊版 600 字上限截斷了 7 筆長文,SDD.md V6 已同步放寬)。"""
    lines = [line.strip() for line in text.splitlines()]
    paragraphs, current = [], []
    for line in lines:
        if not line:
            if current:
                paragraphs.append("".join(current))
                current = []
        elif not any(marker in line for marker in DROP_MARKERS):
            current.append(line)
    if current:
        paragraphs.append("".join(current))
    return "\n\n".join(p for p in paragraphs if p)


def make_summary(description, name="", area=""):
    """取第一句,裁到 <= 100 字並盡量在句號處斷;不足 20 字就續接下一句。
    官網介紹過短時(< 20 字),以名稱與地區補成事實句,仍待 T8 人工改寫。"""
    sentences = [s for s in re.split(r"(?<=。)", description.replace("\n", "")) if s]
    summary = ""
    for sentence in sentences:
        summary += sentence
        if len(summary) >= 20:
            break
    if len(summary) < 20 and name and area:
        summary = f"{name}位於澎湖縣{area},{description.replace(chr(10), '')}"
    if len(summary) > 100:
        cut = summary.rfind("。", 0, 100)
        summary = summary[:cut + 1] if cut >= 20 else summary[:100]
    return summary


def unique_slug(name, area, used):
    base = "-".join(filter(None, (
        re.sub(r"[^a-z0-9]", "", p)
        for p in lazy_pinyin(name, style=Style.NORMAL))))
    if not base:
        raise FetchError(f"無法為名稱產生 slug:{name!r}")
    slug = base
    if slug in used:
        area_pinyin = "-".join(filter(None, (
            re.sub(r"[^a-z0-9]", "", p)
            for p in lazy_pinyin(area, style=Style.NORMAL))))
        slug = f"{base}-{area_pinyin}"
    counter = 2
    while slug in used:
        slug = f"{base}-{counter}"
        counter += 1
    used.add(slug)
    return slug


def today_taipei():
    return datetime.now(timezone(timedelta(hours=8))).date().isoformat()


def resolve_area(card_area, address):
    if card_area in AREAS:
        return card_area
    for area in AREAS:
        if address.startswith("澎湖縣" + area):
            return area
    raise FetchError(
        f"鄉市 {card_area!r} 不在允許清單,地址也無法判斷:{address!r}")


def build_records(entries, details, existing_by_id, today):
    places, used_slugs = [], set()
    for old in existing_by_id.values():
        used_slugs.add(old.get("slug", ""))
    seen_ids = set()
    for entry in entries:
        nsa_id = entry["nsa_id"]
        if nsa_id in seen_ids:
            continue
        seen_ids.add(nsa_id)
        name, description, address = details[nsa_id]
        if not name:
            name = entry["name"]
        area = resolve_area(entry["area"], address)
        category = entry["category"]
        if category not in CATEGORIES:
            raise FetchError(
                f"官網出現不在允許清單的類型:{category!r}({name})。"
                "請依 AGENTS.md §7 流程新增允許值後再重跑。")
        old = existing_by_id.get(nsa_id)
        source = DETAIL_URL.format(nsa_id=nsa_id)
        if old:
            # 以 nsa_id 對應既有資料:保留人工改寫過的欄位。
            record = dict(old)
            record.update({
                "name": name, "area": area, "category": category,
                "sources": [source], "nsa_id": nsa_id, "updated_at": today,
            })
            if address:
                record["address"] = address
            elif "address" in record:
                del record["address"]
            used_slugs.add(record["slug"])
        else:
            record = {
                "slug": unique_slug(name, area, used_slugs),
                "name": name, "area": area, "category": category,
                "summary": make_summary(description, name, area),
            }
            if description:
                record["description"] = description
            if address:
                record["address"] = address
            record.update({
                "tags": [], "sources": [source],
                "nsa_id": nsa_id, "updated_at": today,
            })
        places.append(record)
    return places


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_PATH)
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY,
                        help="每頁抓取間隔秒數(預設 1.2,勿低於 1)")
    parser.add_argument("--cache-dir", type=Path, default=None,
                        help="快取抓過的頁面,中斷可續跑")
    args = parser.parse_args()
    if args.cache_dir:
        global CACHE_DIR
        CACHE_DIR = args.cache_dir
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
    delay = max(1.0, args.delay)
    REQUEST_DELAY_STATE[0] = delay

    existing_by_id = {}
    if args.output.is_file():
        with args.output.open(encoding="utf-8") as source:
            for place in json.load(source):
                if isinstance(place, dict) and place.get("nsa_id"):
                    existing_by_id[place["nsa_id"].lower()] = place
    print(f"既有資料:{len(existing_by_id)} 筆(依 nsa_id 合併)")

    print(f"抓取列表第 1 頁:{LIST_URL}")
    first_page = fetch(LIST_URL)
    pages, total = page_count(first_page)
    print(f"官網共 {total} 筆、{pages} 頁")
    entries = parse_list_page(first_page)
    for page in range(2, pages + 1):
        url = (f"{BASE_URL}/TravelInformationSceneryListC001200.aspx"
               f"?Pindex={page}&SortType=1&SearchAdvanced=False&Language=1028")
        print(f"抓取列表第 {page}/{pages} 頁")
        entries.extend(parse_list_page(fetch(url)))
    print(f"列表解析出 {len(entries)} 筆")
    if len(entries) != total:
        print(f"警告:解析筆數 {len(entries)} 與官網總筆數 {total} 不符,停止。",
              file=sys.stderr)
        return 1

    details = {}
    for index, entry in enumerate(entries, 1):
        url = DETAIL_URL.format(nsa_id=entry["nsa_id"])
        print(f"[{index}/{len(entries)}] {entry['name']}")
        details[entry["nsa_id"]] = parse_detail_page(fetch(url))

    places = build_records(entries, details, existing_by_id, today_taipei())
    order = {area: position for position, area in enumerate(AREAS)}
    places.sort(key=lambda p: (order[p["area"]], p["name"]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as target:
        json.dump(places, target, ensure_ascii=False, indent=2)
        target.write("\n")
    print(f"已寫入 {args.output}:{len(places)} 筆景點")
    print("提醒:summary 為自動摘要(官網第一句),依 AGENTS.md §8 待人工改寫(T8)。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
