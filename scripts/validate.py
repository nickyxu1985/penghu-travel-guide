#!/usr/bin/env python3
"""Validate places.json against SDD.md V1–V13 using only the standard library."""

import argparse
from datetime import date
import json
from pathlib import Path
import re
from urllib.parse import urlsplit


# 與 AGENTS.md §3 同步。地區順序亦為 V12 排序順序。
AREAS = ("馬公市", "湖西鄉", "白沙鄉", "西嶼鄉", "望安鄉", "七美鄉")
CATEGORIES = ("自然風景", "遊憩", "文化", "文化資產", "生態", "藝術")
REQUIRED_FIELDS = frozenset({
    "slug", "name", "area", "category", "summary", "sources", "updated_at",
})
ARRAY_FIELDS = frozenset({"tags", "sources"})
ALLOWED_FIELDS = REQUIRED_FIELDS | frozenset({
    "description", "address", "tags", "image", "image_credit", "nsa_id",
})
STRING_FIELDS = ALLOWED_FIELDS - ARRAY_FIELDS
SLUG_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
GUID_PATTERN = re.compile(r"[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}")
DATE_PATTERN = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")
REPO_ROOT = Path(__file__).resolve().parents[1]


def string_values(value, field=""):
    """Include nested/unknown fields so V13 cannot hide behind a schema error."""
    if isinstance(value, str):
        yield field, value
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from string_values(item, f"{field}[{index}]")
    elif isinstance(value, dict):
        for key, item in value.items():
            yield from string_values(item, f"{field}.{key}" if field else key)


def https_url(value):
    """Require an actual HTTPS URL, not merely the literal https:// prefix."""
    if not value.startswith("https://") or any(c.isspace() for c in value):
        return False
    try:
        url = urlsplit(value)
        # Accessing port also detects malformed ports.
        _ = url.port
        return bool(url.hostname) and not (url.username or url.password)
    except ValueError:
        return False


def validate(places, root=REPO_ROOT, today=None):
    """Return all errors; root resolves optional image paths, today aids tests."""
    if not isinstance(places, list):
        return ["檔案: [V1] 頂層必須為陣列"]
    today = today or date.today()
    errors = []
    seen_slugs = {}
    seen_ids = {}
    sort_keys = []

    for number, place in enumerate(places, 1):
        slug = place.get("slug", "缺少 slug") if isinstance(place, dict) else "無 slug"
        if not isinstance(slug, str):
            slug = "無效 slug"

        def error(rule, field, message):
            errors.append(f"第 {number} 筆({slug}): [{rule}] {field}: {message}")

        if not isinstance(place, dict):
            error("V3", "整筆資料", "必須為物件")
            continue
        for field in sorted(place.keys() - ALLOWED_FIELDS):
            error("V2", field, "不允許的欄位")
        for field in sorted(REQUIRED_FIELDS):
            value = place.get(field)
            if field not in place or value is None or value == [] or (
                isinstance(value, str) and not value.strip()
            ):
                error("V2", field, "必填且不可為空")
        for field in sorted(STRING_FIELDS & place.keys()):
            if not isinstance(place[field], str):
                error("V3", field, "必須為字串")
        for field in sorted(ARRAY_FIELDS & place.keys()):
            value = place[field]
            if not isinstance(value, list):
                error("V3", field, "必須為字串陣列")
            else:
                for index, item in enumerate(value):
                    if not isinstance(item, str):
                        error("V3", f"{field}[{index}]", "必須為字串")

        value = place.get("slug")
        if isinstance(value, str):
            if not SLUG_PATTERN.fullmatch(value):
                error("V4", "slug", "必須為小寫英數 kebab-case")
            if value in seen_slugs:
                error("V4", "slug", f"與第 {seen_slugs[value]} 筆重複")
            else:
                seen_slugs[value] = number
        for field, allowed in (("area", AREAS), ("category", CATEGORIES)):
            if field in place and isinstance(place[field], str) and place[field] not in allowed:
                error("V5", field, f"允許值為 {'、'.join(allowed)}")
        for field, minimum, maximum in (("name", 1, 30), ("summary", 20, 100),
                                        ("description", 0, 600)):
            value = place.get(field)
            if isinstance(value, str) and not minimum <= len(value) <= maximum:
                error("V6", field, f"長度須為 {minimum}–{maximum} 字,目前 {len(value)} 字")

        tags = place.get("tags")
        if isinstance(tags, list):
            if len(tags) > 5:
                error("V7", "tags", "最多 5 個")
            seen_tags = set()
            for index, tag in enumerate(tags):
                if not isinstance(tag, str):
                    continue
                if not 2 <= len(tag) <= 8:
                    error("V7", f"tags[{index}]", "長度須為 2–8 字")
                if tag in seen_tags:
                    error("V7", f"tags[{index}]", "標籤重複")
                seen_tags.add(tag)

        sources = place.get("sources")
        if isinstance(sources, list):
            if not sources:
                error("V8", "sources", "至少 1 個 HTTPS URL")
            for index, source in enumerate(sources):
                if not isinstance(source, str):
                    continue
                if not https_url(source):
                    error("V8", f"sources[{index}]", "必須為有效 https:// URL")
                elif index == 0 and urlsplit(source).hostname != "www.penghu-nsa.gov.tw":
                    error("V8", "sources[0]", "網域必須為 www.penghu-nsa.gov.tw")

        updated_at = place.get("updated_at")
        if isinstance(updated_at, str):
            try:
                if not DATE_PATTERN.fullmatch(updated_at):
                    raise ValueError
                parsed_date = date.fromisoformat(updated_at)
            except ValueError:
                error("V9", "updated_at", "必須為合法 YYYY-MM-DD 日期")
            else:
                if parsed_date > today:
                    error("V9", "updated_at", f"不得晚於今天 {today.isoformat()}")

        if "image" in place:
            image = place["image"]
            expected = {f"assets/img/{slug}.{ext}" for ext in ("jpg", "jpeg", "png", "webp")}
            if isinstance(image, str):
                if image not in expected or not SLUG_PATTERN.fullmatch(slug):
                    error("V10", "image", "路徑須為 assets/img/<slug>.(jpg|jpeg|png|webp)")
                else:
                    path = Path(root) / image
                    if not path.is_file() or not path.resolve().is_relative_to(Path(root).resolve()):
                        error("V10", "image", "repo 內圖片檔案不存在或路徑超出 repo")
            credit = place.get("image_credit")
            if not isinstance(credit, str) or not credit.strip():
                error("V10", "image_credit", "有 image 時必須填寫非空攝影者 / 授權來源")

        nsa_id = place.get("nsa_id")
        if isinstance(nsa_id, str):
            if not GUID_PATTERN.fullmatch(nsa_id):
                error("V11", "nsa_id", "必須為 GUID 格式")
            normalized_id = nsa_id.lower()
            if normalized_id in seen_ids:
                error("V11", "nsa_id", f"與第 {seen_ids[normalized_id]} 筆重複")
            else:
                seen_ids[normalized_id] = number
        for field, value in string_values(place):
            if "data:image" in value.lower():
                error("V13", field, "不得含 data:image 內嵌圖片")
        area, name = place.get("area"), place.get("name")
        if isinstance(area, str) and area in AREAS and isinstance(name, str):
            sort_keys.append((AREAS.index(area), name, number, slug))

    # Only assess ordering if every record has a valid sort key.
    if len(sort_keys) == len(places):
        for expected, (_, _, number, slug) in enumerate(sorted(sort_keys), 1):
            if number != expected:
                errors.append(f"第 {number} 筆({slug}): [V12] area/name: 應排在第 {expected} 筆")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", nargs="?", type=Path, default=REPO_ROOT / "data/places.json")
    args = parser.parse_args()
    try:
        with args.path.open(encoding="utf-8") as source:
            places = json.load(source, parse_constant=lambda value: (_ for _ in ()).throw(
                ValueError(f"非 JSON 常數 {value}")))
    except (OSError, UnicodeError, ValueError, RecursionError) as exc:
        print(f"檔案: [V1] {args.path}: 無法讀取合法 UTF-8 JSON: {exc}")
        return 1
    errors = validate(places)
    if errors:
        print("\n".join(errors))
        print(f"驗證失敗: {len(errors)} 個錯誤")
        return 1
    print(f"驗證通過: {len(places)} 筆景點")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
