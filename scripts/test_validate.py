"""Standard-library regression tests for SDD.md V1–V13."""

from copy import deepcopy
from datetime import date
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from validate import validate


TODAY = date(2026, 11, 12)
VALID = {
    "slug": "shuang-xin-shi-hu", "name": "雙心石滬", "area": "七美鄉",
    "category": "自然風景", "summary": "兩顆相連的心形石滬位於七美海岸,出發前請先至官網確認。",
    "sources": ["https://www.penghu-nsa.gov.tw/TravelInformationSceneryDetailC001200.aspx?Cond=a98c092b-65f5-4b7e-bbb3-de16bf9be2cf&Language=1028"],
    "updated_at": "2026-11-12",
}


class ValidationTests(unittest.TestCase):
    def check_rule(self, rule, places):
        errors = validate(places, today=TODAY)
        self.assertTrue(any(f"[{rule}]" in e for e in errors), errors)
        for error in errors:
            if rule != "V1":
                self.assertIn("第 ", error)
                self.assertIn("筆(", error)
        return errors

    def changed(self, **fields):
        return [dict(deepcopy(VALID), **fields)]

    def test_valid_minimal_and_optional_fields(self):
        self.assertEqual(validate([], today=TODAY), [])
        self.assertEqual(validate([VALID], today=TODAY), [])
        self.assertEqual(validate(self.changed(description="", address="", tags=[],
            nsa_id="a98c092b-65f5-4b7e-bbb3-de16bf9be2cf"), today=TODAY), [])

    def test_v1_top_level(self):
        for value in ({"places": []}, None, "[]", 1):
            with self.subTest(value=value):
                self.check_rule("V1", value)

    def test_v2_required_and_unknown_fields(self):
        for field in VALID:
            with self.subTest(field=field):
                place = deepcopy(VALID)
                del place[field]
                self.check_rule("V2", [place])
        self.check_rule("V2", self.changed(name="  "))
        self.check_rule("V2", self.changed(sources=[]))
        self.check_rule("V2", self.changed(id="old-schema"))
        self.check_rule("V2", self.changed(phone="123", opening_hours="09:00"))

    def test_v3_types_do_not_crash(self):
        self.check_rule("V3", [None, [], "place", 42, True])
        for field in (*VALID, "tags", "images", "nsa_id", "address", "description"):
            with self.subTest(field=field):
                self.check_rule("V3", self.changed(**{field: {"bad": "type"}}))
        self.check_rule("V3", self.changed(tags=[None, [], {}], sources=[1, {}]))
        self.check_rule("V3", self.changed(images=[]))
        self.check_rule("V3", self.changed(images=["not-a-dict", 1]))

    def test_v4_slug_and_uniqueness(self):
        for slug in ("Upper", "a_b", "-start", "end-", "a--b", "中文", "a\n"):
            with self.subTest(slug=slug):
                self.check_rule("V4", self.changed(slug=slug))
        self.check_rule("V4", [VALID, deepcopy(VALID)])

    def test_v5_allowed_values(self):
        self.check_rule("V5", self.changed(area="台北市"))
        self.check_rule("V5", self.changed(category="自然風景類"))

    def test_v6_lengths_and_boundaries(self):
        for field, bad in (("name", "字" * 31), ("name", ""), ("summary", "字" * 19),
                           ("summary", "字" * 101)):
            with self.subTest(field=field, length=len(bad)):
                self.check_rule("V6", self.changed(**{field: bad}))
        # description 不設上限(Issue #18:600 字上限曾截斷官網全文)
        for length in (20, 100):
            self.assertEqual(validate(self.changed(name="字" * 30, summary="字" * length,
                description="字" * 600), today=TODAY), [])
        self.assertEqual(validate(self.changed(description="字" * 601), today=TODAY), [])
        self.assertEqual(validate(self.changed(description="字" * 2000), today=TODAY), [])

    def test_v7_tags(self):
        for tags in (["字"], ["字" * 9], ["石滬", "石滬"], ["標籤" + str(i) for i in range(6)]):
            with self.subTest(tags=tags):
                self.check_rule("V7", self.changed(tags=tags))
        self.assertEqual(validate(self.changed(tags=["字" * 2, "字" * 8]), today=TODAY), [])

    def test_v8_sources(self):
        for sources in ([], ["http://www.penghu-nsa.gov.tw/a"], ["https://example.org/a"],
                        ["https://www.penghu-nsa.gov.tw.evil.invalid/a"],
                        ["https://www.penghu-nsa.gov.tw@evil.invalid/a"],
                        ["https://"], ["https://[bad"], ["https://www.penghu-nsa.gov.tw:bad/a"],
                        [VALID["sources"][0], "javascript:alert(1)"],
                        ["https://www.penghu-nsa.gov.tw/a b"]):
            with self.subTest(sources=sources):
                self.check_rule("V8", self.changed(sources=sources))
        self.assertEqual(validate(self.changed(sources=[*VALID["sources"], "https://example.org/a"]), today=TODAY), [])

    def test_v9_dates(self):
        for value in ("2026-11-13", "2026-02-29", "2026-1-01", "20261112", "2026-11-12T00:00:00"):
            with self.subTest(value=value):
                self.check_rule("V9", self.changed(updated_at=value))
        self.assertEqual(validate(self.changed(updated_at="2024-02-29"), today=TODAY), [])

    def test_v10_images_paths_file_and_credit(self):
        slug = VALID["slug"]
        credit = "交通部觀光署澎湖國家風景區管理處官網(https://www.penghu-nsa.gov.tw/x)"
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for number in (1, 2):
                image = root / f"assets/img/{slug}-{number}.jpg"
                image.parent.mkdir(parents=True, exist_ok=True)
                image.write_bytes(b"test fixture, not a real photo")
            images = [{"src": f"assets/img/{slug}-{n}.jpg", "credit": credit} for n in (1, 2)]
            good = self.changed(images=images)
            self.assertEqual(validate(good, root=root, today=TODAY), [])
            bad_cases = (
                # 缺 credit / credit 空白
                [{"src": f"assets/img/{slug}-1.jpg"}],
                [{"src": f"assets/img/{slug}-1.jpg", "credit": " "}],
                # 外連、別的 slug、舊版單圖命名、編號不連號、路徑穿越
                [{"src": "https://example.org/p.jpg", "credit": credit}],
                [{"src": "assets/img/other-1.jpg", "credit": credit}],
                [{"src": f"assets/img/{slug}.jpg", "credit": credit}],
                [{"src": f"assets/img/{slug}-2.jpg", "credit": credit}],
                [{"src": "assets/img/../../secret-1.jpg", "credit": credit}],
                # 副檔名大寫 / 物件多欄位
                [{"src": f"assets/img/{slug}-1.JPG", "credit": credit}],
                [{"src": f"assets/img/{slug}-1.jpg", "credit": credit, "extra": 1}],
            )
            for images_bad in bad_cases:
                with self.subTest(images=images_bad):
                    errors = validate(self.changed(images=images_bad), root=root, today=TODAY)
                    self.assertTrue(any("[V10]" in e or "[V2]" in e for e in errors), errors)
            (root / f"assets/img/{slug}-2.jpg").unlink()
            self.assertTrue(any("[V10]" in e for e in validate(good, root=root, today=TODAY)))

    def test_v11_guid(self):
        self.check_rule("V11", self.changed(nsa_id="not-a-guid"))
        guid = "a98c092b-65f5-4b7e-bbb3-de16bf9be2cf"
        self.check_rule("V11", [dict(VALID, nsa_id=guid), dict(VALID, slug="second", nsa_id=guid.upper())])

    def test_v12_area_order_then_unicode_name(self):
        places = [dict(VALID, slug="first", area="馬公市", name="乙"),
                  dict(VALID, slug="second", area="馬公市", name="甲"), VALID]
        self.assertEqual(validate(places, today=TODAY), [])
        errors = self.check_rule("V12", list(reversed(places)))
        self.assertTrue(any("應排在第 1 筆" in e for e in errors))
        self.check_rule("V12", [places[1], places[0], VALID])

    def test_v13_strings_including_arrays_and_unknown_nested_values(self):
        for fields in ({"description": "data:image/png;base64,xxx"},
                       {"tags": ["DATA:IMAGE"]}, {"extra": {"nested": ["data:image"]}}):
            with self.subTest(fields=fields):
                self.check_rule("V13", self.changed(**fields))

    def test_cli_exit_codes_and_bad_json(self):
        script = Path(__file__).with_name("validate.py")
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "places.json"
            for content, expected, output in (("[]", 0, "0 筆景點"),
                    ("{", 1, "[V1]"), ("[NaN]", 1, "[V1]"),
                    (json.dumps(self.changed(slug="BAD")), 1, "[V4]")):
                with self.subTest(content=content):
                    path.write_text(content, encoding="utf-8")
                    result = subprocess.run([sys.executable, str(script), str(path)], capture_output=True, text=True)
                    self.assertEqual(result.returncode, expected, result.stderr)
                    self.assertIn(output, result.stdout)
                    self.assertNotIn("Traceback", result.stderr)
            path.unlink()
            result = subprocess.run([sys.executable, str(script), str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 1)
            self.assertIn("[V1]", result.stdout)


if __name__ == "__main__":
    unittest.main()
