# PROGRESS.md — 開發進度總表

## 用途

整個 repo 的開發進度 log:任務狀態變化、PR 開出/合併、里程碑,統一記在這裡,讓任何人(含 T0 進度觀察員)一眼看清專案走到哪。

## 維護規則

- **統一由 Instinct 登錄,其他 agent 只讀。** 各 agent 自己的交接細節寫在 handoff.md;要登錄進度,在 handoff.md 註明或直接告訴 Instinct,由 Instinct 補上。
- 每筆格式:時間 / 任務 / 事件 / PR 連結。

## 進度 log

| 時間 | 任務 | 事件 | PR |
|------|------|------|----|
| 2026-11-12 | T1 | repo 建立(main;dev 由 T2 補建),GitHub Pages 啟用 | — |
| 2026-11-12 | T2 | 專案骨架開始,文件鏈初版建立 | 進行中 |
| 2026-11-12 14:43 | T2 | PR #1 已合併進 dev,專案骨架完成 | https://github.com/nickyxu1985/penghu-travel-guide/pull/1 |
| 2026-11-12 15:00 | T3/T4 | PR #2 已合併進 dev,規則/schema/樣式定案 | https://github.com/nickyxu1985/penghu-travel-guide/pull/2 |
| 2026-11-12 15:01 | T5 | 進行中:validate.py V1–V13 + CI,從最新 dev 開工 | 進行中 |
| 2026-11-12 15:12 | T5 | PR #6 已合併進 dev,validate.py + CI 上線 | https://github.com/nickyxu1985/penghu-travel-guide/pull/6 |
| 2026-11-12 15:18 | T7 | 文件修正 PR #7 已合併進 dev(issue #3/#4/#5 已修並關閉) | https://github.com/nickyxu1985/penghu-travel-guide/pull/7 |
| 2026-11-12 15:45 | T6 | fetch_nsa.py 全量抓取 139 筆,本地驗證全綠 | 進行中 |
| 2026-11-12 15:50 | T6 | PR #8 已開進 dev(景點全量 139 筆) | https://github.com/nickyxu1985/penghu-travel-guide/pull/8 |

