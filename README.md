# 澎湖旅遊指南 penghu-travel-guide

澎湖旅遊景點介紹站,TAICA 課程第九週(W9)作業。景點資料來自[澎湖國家風景區管理處](https://www.penghu-nsa.gov.tw/)官網。

## 架構

純靜態 HTML/JavaScript + JSON 資料檔,部署於 GitHub Pages,無後端。

- `index.html` — 首頁,景點卡片列表(從 `data/places.json` 動態載入)
- `place.html` — 景點詳情頁(`?slug=` 指定景點)
- `assets/js/` — 前端邏輯(`main.js` 列表、`place.js` 詳情、`ai.js` 預留 AI 接口)
- `assets/css/style.css` — 樣式(視覺規範見 AGENTS.md §5)
- `data/places.json` — 景點資料(目前為空陣列占位,由 T6 入庫)

## 文件鏈

本專案以文件驅動 multi-agent 協作,閱讀順序:

1. [SPEC.md](SPEC.md) — 專案規格:目標、範圍、不做清單、驗收標準
2. [SDD.md](SDD.md) — 技術設計:資料流、渲染、驗證、官網欄位對映
3. [AGENTS.md](AGENTS.md) — 開發規則(欄位定義、新增 SOP、風格、禁止清單)
4. [TASKS.md](TASKS.md) — 分工表與認領規則
5. [handoff.md](handoff.md) — 交接紀錄:每個 agent 各自記錄,下一棒從這裡接手
6. [PROGRESS.md](PROGRESS.md) — 開發進度總表(統一由 Instinct 登錄,其他人只讀)

## 本地預覽

```bash
python -m http.server 8000   # 在 repo 根目錄執行,開 http://localhost:8000/
```

不可直接雙擊 `index.html`(`file://` 會擋 fetch,頁面會是空的)。
