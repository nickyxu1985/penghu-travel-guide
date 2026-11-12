# SDD.md — 技術設計

> 本檔說明「系統怎麼運作」。**欄位定義、允許值、命名與禁止事項以 [AGENTS.md](AGENTS.md) 為準**,這裡只引用,不重複定義。

## 1. 架構總覽

```
澎管處官網 ──fetch_nsa.py──▶ data/places.json ──validate.py(CI)──▶ PR 進 dev
                                     │
                                     ▼  瀏覽器 fetch(純前端)
                          index.html + main.js  → 卡片列表 + 篩選
                          place.html + place.js → ?slug= 詳情頁
```

- 純靜態:HTML / CSS / JS + 一個 JSON 檔,無後端、無建置步驟。
- GitHub Pages 直接發佈 `main` 分支根目錄。
- Python 只用在 `scripts/`(驗證、抓資料),不參與網站執行。

## 2. 資料檔

- 路徑:`data/places.json`,UTF-8,2 空白縮排,`ensure_ascii=False`(中文不跳脫)。
- 頂層格式:**陣列** `[ {...}, {...} ]`(定案;不使用 `{ "places": [...] }`)。
- 欄位與允許值:見 AGENTS.md §3。
- 排序:依 `area`(AGENTS.md §3 的列出順序)→ `name`(Unicode 排序)。

## 3. 頁面渲染

### 3.1 首頁 `index.html` + `assets/js/main.js`

1. `fetch('data/places.json', { cache: 'no-store' })`。
2. 讀取失敗 / 非陣列 / 空陣列 → 顯示 `empty-state`,不拋錯。
3. 產生兩列篩選鈕:
   - 地區:固定順序 `馬公市、湖西鄉、白沙鄉、西嶼鄉、望安鄉、七美鄉`,只顯示資料裡實際出現的值。
   - 類型:依資料中出現的 `category` 產生(順序同 AGENTS.md §3)。
   - 兩列各有「全部」;兩列條件取交集。
4. 篩選狀態寫進網址 query(`?area=白沙鄉&category=自然風景`),可分享、重新整理不遺失。
5. 卡片連到 `place.html?slug=<slug>`;顯示「共 N 筆」。

### 3.2 詳情頁 `place.html` + `assets/js/place.js`

1. 讀 `?slug=`;缺少 → 友善提示 + 回列表連結。
2. 同一份 `places.json` 中找 `slug` 相符的一筆;找不到 → 「查無此景點」。
3. 顯示順序:圖片(有才顯示,附 `image_credit`)→ 類型 · 地區 → 名稱 → 摘要 → 詳細介紹(依 `\n\n` 分段)→ 地址 → 標籤 → 易變資訊提醒 → 來源連結(`sources[0]` 標為「澎管處官網介紹」,其餘標「參考資料 N」)→ 資料整理日。
4. `document.title` 設為 `<name> | 澎湖旅遊指南`。

### 3.3 共通規則

- 所有資料字串一律經 `escapeHtml()` 後才插入 DOM;連結只接受 `https://` 開頭,否則不輸出。
- 無框架、無外部 CDN;CSS class 名稱見 AGENTS.md §5。

## 4. 驗證(`scripts/validate.py`,T5 實作)

- 執行:`python scripts/validate.py [path]`,預設 `data/places.json`。只用 Python 標準函式庫。
- 有任何錯誤 → 逐條印出「第 N 筆(slug):問題」,exit code 1;全部通過 → 印出筆數,exit 0。
- CI:`.github/workflows/validate.yml`,在 push / pull_request 到 `dev`、`main` 時執行,只驗證、不部署。

**檢查項(對應 AGENTS.md §3、§8):**

| # | 檢查 |
|---|------|
| V1 | 檔案是合法 JSON,頂層為陣列 |
| V2 | 每筆只含允許欄位;必填欄位都在且非空 |
| V3 | 型別正確(字串 / 字串陣列) |
| V4 | `slug` 符合 kebab-case 正規式,全檔唯一 |
| V5 | `area`、`category` 在允許清單內 |
| V6 | `name` 1–30 字;`summary` 20–100 字;`description` ≤ 600 字 |
| V7 | `tags` 0–5 個、每個 2–8 字、不重複 |
| V8 | `sources` ≥ 1,全部 `https://`;`sources[0]` 網域為 `www.penghu-nsa.gov.tw` |
| V9 | `updated_at` 為合法日期 `YYYY-MM-DD`,且不晚於今天 |
| V10 | 有 `image` 時:路徑為 `assets/img/<slug>.(jpg|jpeg|png|webp)`、檔案存在、`image_credit` 非空 |
| V11 | `nsa_id`(若有)為 GUID 格式,且全檔唯一 |
| V12 | 陣列依 `area` → `name` 排序(錯誤訊息提示正確位置) |
| V13 | 任何字串欄位不得含 `data:image`(擋 base64 內嵌圖) |

允許值清單在 `validate.py` 頂部以常數宣告,並註解「與 AGENTS.md §3 同步」。

## 5. 官網欄位對映(`scripts/fetch_nsa.py`,T6 實作)

**來源頁面:**

- 列表:`https://www.penghu-nsa.gov.tw/TravelInformationSceneryListC001200.aspx?appname=TravelInformationSceneryListC001200`(列表上有名稱、類型、鄉市、詳情頁連結)
- 詳情:`https://www.penghu-nsa.gov.tw/TravelInformationSceneryDetailC001200.aspx?Cond=<GUID>&Language=1028`
- 官網為純 HTML、不需 JS 渲染(Instinct 2026-11-12 實測)。

**對映規則:**

| 我們的欄位 | 官網來源 | 轉換 |
|------------|----------|------|
| `name` | 詳情頁標題(h2) | 去前後空白 |
| `area` | 列表卡片的鄉市文字 | 須為 6 個允許值之一;否則從地址前綴判斷;仍不符 → 報錯停止 |
| `category` | 列表卡片的類型文字(如「自然風景類」) | 去掉結尾「類」;不在允許清單 → **報錯停止**,走 AGENTS.md §7 延伸流程,不自動新增 |
| `slug` | `name` | 漢語拼音無聲調(`pypinyin`),小寫、以 `-` 連接、去除非英數;撞名加 `-<area 拼音>` |
| `summary` | 詳情頁介紹第一段 | 取第一句,裁到 ≤ 100 字並在句號處斷;**標記待改寫**(見下) |
| `description` | 詳情頁介紹全文 | 去 HTML、去「追星資訊」「看看環景」等外連段落,段落以 `\n\n` 連接,≤ 600 字在段落邊界截斷 |
| `address` | 景點資訊「地址」 | 原樣 |
| `tags` | — | 不自動產生,留空,由 T8 人工補 |
| `image` / `image_credit` | — | **不抓**(官網照片多為攝影比賽作品,授權未確認) |
| `sources[0]` | 詳情頁 URL | 正規化為 `...?Cond=<GUID>&Language=1028` |
| `nsa_id` | URL 中 `Cond` | 小寫 GUID |
| `updated_at` | — | 執行當日日期 |

**不抓的欄位:** 開放時間、電話、交通方式、古蹟分級(易變或與本站範圍無關,見 AGENTS.md §8)。

**更新與合併:**

- 以 `nsa_id` 對應既有資料:已存在的景點只更新 `name / area / category / address / sources / updated_at`,**保留人工改寫過的 `summary`、`description`、`tags`、`image`**。
- 官網已下架的景點不自動刪除,只在輸出報告列出,交人工決定。
- 腳本最後自動呼叫 validate,不通過就不寫檔。
- `summary` 自動擷取的版本只是草稿;T8 抽審改寫時,依 AGENTS.md §8 第 4 條處理。
- 禮貌抓取:每頁間隔 ≥ 1 秒,設定 User-Agent 標明專案名稱。

## 6. 預留 AI 接口

見 `assets/js/ai.js` 的契約說明。本期不實作、不掛進頁面(SPEC.md 不做清單)。

## 7. 本地開發

```bash
python -m http.server 8000      # 在 repo 根目錄;開 http://localhost:8000/
python scripts/validate.py      # 驗證資料
```

不可用 `file://` 直接開 HTML(fetch 會被瀏覽器擋)。
