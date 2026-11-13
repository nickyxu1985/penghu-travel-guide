# AGENTS.md — 澎湖旅遊指南 開發規則

> 給所有在本 repo 工作的 AI agent(與人類)。讀完本檔,你應該知道:這個專案要做什麼、資料長什麼樣、新增一筆景點要改哪裡、做到什麼程度才算完成、哪些事絕對不能做。
> 規則只寫在本檔;SPEC.md / SDD.md 只引用,不重複貼。規則有衝突時,以本檔為準。

---

## 0. 開工必讀:文件閱讀鏈與協作規則

**閱讀順序(每次進場都照這個順序):**

1. [SPEC.md](SPEC.md) — 為什麼做、做什麼、不做什麼
2. [SDD.md](SDD.md) — 技術設計:資料流、頁面渲染、validator 檢查項、官網欄位對映
3. **AGENTS.md(本檔)** — 開發規則
4. [TASKS.md](TASKS.md) — 領任務
5. [handoff.md](handoff.md) — 從最新一筆接手
6. [PROGRESS.md](PROGRESS.md) — 全 repo 進度(只讀)

**協作規則:**

| 規則 | 內容 |
|------|------|
| 認領 | 先把自己的名字寫進 TASKS.md 對應任務並 commit,先 commit 先得。沒認領不動工。 |
| 分支 | 一律從 `dev` 開分支,命名 `agent/<任務編號>-<簡述>`,例:`agent/t11-fetch-photos`。 |
| PR | 所有 PR 進 `dev`,不直接 push `dev` / `main`,不自己 merge。merge 由 Nicky 決定。 |
| 發佈 | 里程碑時才 `dev → main`;GitHub Pages 從 `main` 發佈。 |
| handoff.md | 每個 agent 自己記:做了什麼、留下什麼坑、下一步建議。最新一筆放最上面。 |
| PROGRESS.md | **統一由 Instinct 登錄,其他人只讀。** 要登錄進度,寫在 handoff.md 或告訴 Instinct。 |
| 回報 | 任務完成或過階段性里程碑,在 Slack 任務串回報,並 @ 下一棒。 |
| 範圍 | 只改自己任務需要的檔案。發現別人範圍的問題,開 issue,不順手改。 |

---

## 1. 專案目的與讀者

- **做什麼:** 澎湖旅遊景點介紹站。首頁列出景點、可依「地區」和「類型」篩選;點進去是單一景點詳情頁。
- **資料來源:** [澎湖國家風景區管理處](https://www.penghu-nsa.gov.tw/)(下稱「澎管處」)官網,事實一律以官網為準。
- **讀者:** 想先認識澎湖景點的旅人。語氣用澎湖在地人介紹給朋友的口吻:平實、具體、不浮誇,不寫成觀光文宣。
- **這個 repo 真正要證明的事:** 任何 AI 只讀這套文件,就能照同一套規則持續新增景點,不需要人在旁邊口頭交代。

---

## 2. 目錄結構與命名

```
penghu-travel-guide/
├── AGENTS.md            # 本檔:開發規則(唯一規則來源)
├── SPEC.md              # 規格:目標、範圍、不做清單
├── SDD.md               # 技術設計:資料流、渲染、驗證、官網欄位對映
├── TASKS.md             # 分工表
├── handoff.md           # 交接紀錄(各 agent 自記)
├── PROGRESS.md          # 進度總表(Instinct 登錄)
├── README.md            # 專案簡介
├── index.html           # 首頁:景點卡片 + 地區/類型篩選
├── place.html           # 詳情頁共用模板:place.html?slug=<slug>
├── assets/
│   ├── css/style.css    # 唯一樣式檔(規則見第 5 節)
│   ├── js/main.js       # 首頁渲染與篩選
│   ├── js/place.js      # 詳情頁渲染
│   ├── js/ai.js         # 預留 AI 接口(本期不實作)
│   ├── img/             # 景點照片(T11 已入庫 389 張),檔名 = <slug>-<n>.<ext>(jpg / jpeg / png / webp)
│   └── docs/            # README 用的網站截圖
├── data/
│   └── places.json      # 唯一事實來源:所有景點資料
├── scripts/
│   ├── validate.py      # 資料驗證(CI 與本地共用)
│   ├── test_validate.py # validate.py 的 15 個單元測試
│   ├── fetch_nsa.py     # 從澎管處官網產生/更新 places.json
│   └── fetch_photos.py  # 從澎管處官網抓全部照片入庫(T11)
└── .github/workflows/
    └── validate.yml     # CI:只跑 validate,不部署
```

**命名規則:**

- **新增景點 = 只改 `data/places.json`。** 不新增 HTML、不複製頁面、不改 JS。
- `slug`:小寫英數 + 連字號(kebab-case),用景點名稱的漢語拼音、不帶聲調,例:`雙心石滬 → shuang-xin-shi-hu`。全檔唯一;撞名時加地區拼音,例:`shan-shui-sha-tan-ma-gong`。
- 圖片檔名 = `<slug>-<n>.<副檔名>`(n 由 1 起連號、副檔名小寫),放 `assets/img/`。
- 文件檔名全大寫(`AGENTS.md`),程式與資料檔小寫加底線或連字號。

---

## 3. 資料欄位定義(places.json)

`data/places.json` 的頂層是**陣列**,每個元素是一筆景點。陣列依 `area` 再依 `name` 排序(方便 diff 與人工檢查)。

| 欄位 | 型別 | 必填 | 格式 / 限制 |
|------|------|------|-------------|
| `slug` | string | ✅ | `^[a-z0-9]+(-[a-z0-9]+)*$`,全檔唯一,建立後**不得更改**(會讓舊連結失效) |
| `name` | string | ✅ | 官網正式名稱,1–30 字 |
| `area` | string | ✅ | 只能是:`馬公市`、`湖西鄉`、`白沙鄉`、`西嶼鄉`、`望安鄉`、`七美鄉` |
| `category` | string | ✅ | 只能是:`自然風景`、`遊憩`、`文化`、`文化資產`、`生態`、`藝術`、`宗教廟宇`、`觀光工廠`、`交通場站`、`國家風景區`(沿用澎管處官網景點分類,去掉「類」字;後四者為 T6 依 §7 流程新增) |
| `summary` | string | ✅ | 一句話重點,20–100 字,用自己的話改寫,不可整段複製官網 |
| `description` | string | ⬜ | 詳細介紹,≤ 600 字;段落用 `\n\n` 分隔 |
| `address` | string | ⬜ | 官網地址,原樣照抄 |
| `tags` | string[] | ⬜ | 0–5 個、不重複,每個 2–8 字,例:`["退潮限定", "石滬"]` |
| `images` | object[] | ⬜ | 景點照片,每張為 `{"src", "credit"}`。`src` 只能是 `assets/img/<slug>-<n>.<ext>` 相對路徑(n 由 1 起連號,副檔名 jpg / jpeg / png / webp,不可外連);`credit` 必填,格式「署名(出處頁 URL)」,每張都可回溯出處頁。首頁卡片用第 1 張當主圖 |
| `sources` | string[] | ✅ | ≥ 1 個 `https://` URL;**第一個必須是澎管處官網該景點頁** |
| `nsa_id` | string | ⬜ | 官網詳情頁網址中的 `Cond` GUID,`fetch_nsa.py` 更新時用來對應同一筆 |
| `updated_at` | string | ✅ | `YYYY-MM-DD`,不晚於今天;資料整理日(官網頁面沒有更新日期,一律填你整理資料的那天) |

不在上表的欄位一律不准出現(validator 會擋)。要加欄位,依第 7 節的延伸流程。

**完整範例(一筆):**

```json
{
  "slug": "shuang-xin-shi-hu",
  "name": "雙心石滬",
  "area": "七美鄉",
  "category": "自然風景",
  "summary": "澎湖保存最完整的石滬,兩顆相連的心形要等退潮才看得完整,出發前先查當天潮汐。",
  "description": "石滬是先民用玄武岩和珊瑚礁砌成的捕魚陷阱,漲潮時魚群游進滬內,退潮後就困在裡面。\n\n七美的雙心石滬因為造型浪漫,成了澎湖觀光的代表畫面。",
  "address": "澎湖縣七美鄉雙心石滬",
  "tags": ["退潮限定", "石滬", "離島"],
  "images": [
    {
      "src": "assets/img/shuang-xin-shi-hu-1.jpg",
      "credit": "交通部觀光署澎湖國家風景區管理處官網(https://www.penghu-nsa.gov.tw/TravelInformationSceneryDetailC001200.aspx?Cond=a98c092b-65f5-4b7e-bbb3-de16bf9be2cf&Language=1028)"
    }
  ],
  "sources": [
    "https://www.penghu-nsa.gov.tw/TravelInformationSceneryDetailC001200.aspx?Cond=a98c092b-65f5-4b7e-bbb3-de16bf9be2cf&Language=1028"
  ],
  "nsa_id": "a98c092b-65f5-4b7e-bbb3-de16bf9be2cf",
  "updated_at": "2026-11-12"
}
```

---

## 4. 新增一筆景點 SOP 與完成定義

> 這一節就是「之後要新增內容,AI 怎麼照規則做」的標準答案。

**步驟:**

1. 讀完第 0 節的閱讀鏈,在 TASKS.md 認領(或確認任務已指派給你)。
2. 從 `dev` 開分支:`git checkout dev && git pull && git checkout -b agent/<任務編號>-add-<slug>`。
3. 到澎管處官網找到該景點頁,取得名稱、鄉市、類型、地址與介紹;網址放進 `sources[0]`。
4. 在 `data/places.json` 新增一筆,欄位照第 3 節,放到依 `area` → `name` 排序後的正確位置。
5. 本地驗證:`python scripts/validate.py`,必須零錯誤。
6. 本地預覽:在 repo 根目錄執行 `python -m http.server 8000`,開 `http://localhost:8000/`。
   **不可以雙擊 index.html 用 `file://` 開**:瀏覽器會擋 fetch,頁面會是空的。
7. 依下方「完成定義」逐條自查。
8. commit 訊息:`data: 新增 <name>(<slug>)`;push 後開 PR 進 `dev`,PR 說明貼上完成定義清單並打勾。
9. 里程碑由 Nicky 把 `dev` 合併到 `main` 後,開 GitHub Pages 網址確認新卡片出現、詳情頁正常;異常就開 issue 追蹤。
10. 在 handoff.md 最上面記一筆,在 Slack 任務串回報並 @ 下一棒。

**完成定義(全部打勾才算完成):**

- [ ] `python scripts/validate.py` 零錯誤,PR 上的 CI 為綠燈
- [ ] 首頁看得到新卡片;點選它的「地區」與「類型」篩選鈕時會出現
- [ ] `place.html?slug=<slug>` 正常顯示,沒有 console 錯誤
- [ ] 詳情頁的官網來源連結可點、會開到正確景點頁
- [ ] 詳情頁顯示的資料更新日 = `updated_at`
- [ ] 只改了 `data/places.json`(和需要時的 `assets/img/`),沒有動 HTML / JS / CSS

---

## 5. 風格規範（第二階段，2026-11-13 起）

**設計方向:** 現代、照片優先的旅遊站。不沿用政府制式版型，以澎管處官方照片為主角。族系參考（非照抄）：Apple 式導覽（浮動膠囊頂欄、毛玻璃）、Airbnb 式卡片（4:3 大圖、圖上標籤、文字在圖下、hover 浮起加放大）、雜誌式封面（滿版圓角大圖、標題壓在左下漸層）。

**純靜態限制:**
- 不載外部字型、不用框架、不用 CDN。
- 只讀 `data/places.json`，資料格式不變。
- 需經 HTTP 提供（GitHub Pages 可直接跑；本機不可直接雙擊檔案開啟）。
- 篩選值由資料自動產生，新增地區或類型不用改 JS。

**色彩（只用 CSS 變數，不可寫死色碼）:**

| 變數 | 值 | 用途 |
|------|------|------|
| `--bg` | `#F6F5F1` | 頁面底色（暖白） |
| `--surface` | `#FFFFFF` | 卡片、資訊卡 |
| `--ink` | `#0E1318` | 主文字、選中 chip |
| `--ink-2` | `#4A525A` | 內文 |
| `--ink-3` | `#8A9097` | 輔助字 |
| `--night` | `#0B1B24` | 封面底色、頁尾 |
| `--accent` | `#FF6A3D` | 地區字、選中框、提示框（天人菊橘） |
| `--sea` | `#0A7EA4` | 連結 |
| `--sea-soft` | `#E4F3F8` | 標籤 |

**字型:** 系統無襯線，不載入外部字型：
`-apple-system, SF Pro, Segoe UI, PingFang TC, Noto Sans TC, 微軟正黑體`。
標題字重 800、字距 -0.02 ～ -0.03em、用 `clamp()` 隨螢幕縮放（首頁 h1 2.8–6rem）。內文 16px、行高 1.7。

**形狀與動態:**
- 圓角：28px（封面、資訊卡、頁尾）、20px（卡片、地區磚）、14px（縮圖、提示框）；按鈕與 chip 一律膠囊。
- 內容最大寬 1240px。
- 動畫緩動 `cubic-bezier(0.2,0.7,0.2,1)`；尊重 `prefers-reduced-motion`（關掉所有動畫）。

**首頁結構:**
- 浮動頂欄：品牌、地區、所有景點。
- 封面：七美雙心石滬滿版圖、標語「玄武岩、海風、天人菊。」、搜尋框、即時統計（景點、鄉市、類型、照片數）、圖片出處。
- 依地區探索：六鄉市圖磚，點一下即篩選。
- 所有景點：吸頂類型 chip 列（含已選地區可移除、清除篩選），卡片 3 / 2 / 1 欄。
- 頁尾：資料來源與「出發前請至官網確認」。
- 篩選狀態同步到網址 `?area=&category=&q=`，可分享、可重新整理。

**詳情頁結構:**
- 滿版封面：麵包屑、類型標籤、景點名、圖片出處。
- 兩欄：左為摘要引言（粗體大字）＋介紹＋提示框；右為吸頂資訊卡（地區、類型、地址、Google 地圖按鈕、官網連結、標籤、資料整理日）。
- 相簿：縮圖點一下開燈箱看完整照片（封面固定第一張、頁面不捲動）；燈箱可上一張/下一張（按鈕、← →）、放大縮小（按鈕、+ − 0、滾輪、雙擊，最高 400%，放大後可拖曳）、關閉（✕ 按鈕、點背景、Esc），關閉後焦點回到原縮圖。（T13）
- 同地區推薦 3 筆（同類型優先）。

**響應式斷點:**
- ≤ 1100px：地區磚 3 欄。
- ≤ 960px：卡片 2 欄、詳情頁改單欄、資訊卡不吸頂。
- ≤ 640px：卡片 1 欄、地區磚 2 欄且隱藏說明、封面圓角 22px。

**安全與穩健:**
- 所有資料字串經 escape 再寫入 HTML。
- 外部連結只接受 https 開頭的網址，一律新分頁開啟並加 `rel=noopener`。
- 資料空、查無、讀取失敗都顯示友善空態，不拋錯。

**異動檔案:** `index.html`、`place.html`、`assets/css/style.css`、`assets/js/main.js`、`assets/js/place.js`（`ai.js` 與資料未動）。T13 燈箱只動 `place.html`、`place.js`、`style.css`（新增色彩衍生變數 `--lightbox-bg`、`--lightbox-btn`、`--lightbox-btn-hover`）。

**HTML class 命名:** 由實作方定義，CSS 與 JS 共用，改名要兩邊一起改；清單如下（T12 實作）。

| 區塊 | class | 產生者 |
|------|-------|--------|
| 頁面 | `page-home`、`page-place`（body） | HTML |
| 浮動頂欄 | `topbar`、`topbar-inner`、`brand`、`brand-mark`、`topbar-links`、`topbar-link` | HTML |
| 首頁封面 | `hero`、`hero-media`、`hero-img`、`hero-shade`、`hero-body`、`hero-kicker`、`hero-title`、`hero-lead`、`hero-credit` | HTML／main.js |
| 搜尋 | `search`、`search-input`、`search-btn`、`visually-hidden` | HTML |
| 即時統計 | `hero-stats`、`stat`、`stat-label`、`stat-value` | main.js |
| 區塊標題 | `section`、`section-head`、`eyebrow`、`section-title` | HTML |
| 地區磚 | `area-grid`、`area-tile`、`area-tile-img`、`area-tile-shade`、`area-tile-body`、`area-tile-name`、`area-tile-note`、`area-tile-count` | main.js |
| 類型 chip 列 | `chip-bar`、`chip-row`、`chip-extras`、`chip`、`chip-area`、`chip-x`、`chip-clear`、`result-count` | main.js |
| 景點卡片 | `card-grid`、`card`、`card-media`、`card-img`、`card-img-empty`、`card-badge`、`card-body`、`card-area`、`card-title`、`card-summary` | main.js／place.js |
| 標籤 | `tag-list`、`tag` | main.js／place.js |
| 詳情封面 | `cover`、`cover-img`、`cover-img-empty`、`cover-shade`、`cover-body`、`breadcrumb`、`cover-badge`、`cover-title`、`cover-credit` | place.js |
| 詳情兩欄 | `detail`、`article`、`lede`、`prose`、`notice`、`notice-title`、`notice-text` | place.js |
| 資訊卡 | `info-card`、`info-list`、`info-row`、`info-label`、`info-value`、`info-actions`、`info-updated` | place.js |
| 相簿 | `gallery`、`block-title`、`block-count`、`thumb-row`、`thumb`、`thumb-img` | place.js |
| 相簿燈箱（T13） | `lightbox`、`lightbox-stage`、`lightbox-img`、`lightbox-btn`、`lightbox-close`、`lightbox-nav`、`lightbox-prev`、`lightbox-next`、`lightbox-bar`、`lightbox-count`、`lightbox-tools`、`lightbox-zoom-out`、`lightbox-zoom-level`、`lightbox-zoom-in`、`lightbox-credit`；狀態 `is-zoomed`、`is-dragging`（燈箱）、`lightbox-open`（html，鎖住背景捲動） | place.html／place.js |
| 同地區推薦 | `related`（內含 `card-grid`／`card`） | place.js |
| 按鈕 | `btn`、`btn-dark`、`btn-ghost` | place.js |
| 空態 | `empty-state`、`empty-state-page`、`empty-state-title`、`empty-state-hint` | main.js／place.js |
| 頁尾 | `site-footer`、`footer-inner`、`footer-brand`、`footer-text` | HTML |
| 狀態 | `is-active`（選中的地區磚、chip 同步 `aria-pressed`；縮圖的 `is-active` 標出燈箱目前/最後看的那張，縮圖是開燈箱的按鈕、不用 `aria-pressed`） | main.js／place.js |

**固定 id（JS 掛載點，改了 JS 會找不到）:** 首頁 `hero-media`、`hero-credit`、`hero-stats`、`search-form`、`search-input`、`areas`、`area-grid`、`places`、`chip-bar`、`result-count`、`card-grid`；詳情頁 `place-root`、`cover-img`、`cover-credit`；燈箱 `lightbox`、`lightbox-stage`、`lightbox-img`、`lightbox-close`、`lightbox-prev`、`lightbox-next`、`lightbox-count`、`lightbox-zoom-out`、`lightbox-zoom-level`、`lightbox-zoom-in`、`lightbox-credit`。

**選填設定（main.js 頂部）:** `AREA_NOTES` 為地區磚說明，沒列到的地區只顯示景點數；`HERO_NAME` 指定封面景點，找不到時改用第一筆有圖的景點。

---

## 6. 規則 ↔ 頁面對應表

每條規則都對應到頁面上看得見的行為,檢查時直接對照:

| 規則(本檔位置) | 頁面上看得到的行為 |
|------------------|--------------------|
| `area` 只有 6 個值(§3) | 地區篩選列只出現資料裡有的鄉市(最多 6 顆)+ 「全部」 |
| `category` 只有 10 個值(§3) | 首頁「類型」篩選列的鈕都來自這 10 個值,沒有其他 |
| `slug` 唯一且不改(§3) | 每個景點有固定網址 `place.html?slug=<slug>`,可分享、不失效 |
| `summary` 20–100 字(§3) | 首頁卡片高度整齊,摘要不會被截斷成半句 |
| `description` ≤ 600 字(§3) | 詳情頁介紹維持一頁讀得完的長度,不會洗成長文 |
| `tags` 0–5 個、每個 2–8 字(§3) | 卡片與詳情頁的標籤最多 5 個,不會排滿一整列 |
| `sources[0]` 必為官網頁(§3) | 每個詳情頁底部都有「澎管處官網介紹」連結 |
| `updated_at` 必填(§3) | 每個詳情頁顯示「資料整理日」 |
| `images` 只能用 repo 內檔案、每張須附 `credit`(§3、§8) | 有圖的景點,詳情頁相簿縮圖點一下換封面圖與出處;沒有外連圖片;首頁卡片顯示第 1 張 |
| 易變資訊不寫死(§8) | 詳情頁不顯示開放時間、票價、船班,改提示「出發前請至官網確認」 |
| 新增景點只改 places.json(§4) | 所有景點卡片與詳情頁長相一致,沒有一頁特別不一樣 |
| 色票只用 CSS 變數(§5) | 全站顏色一致;換主題色只要改 `style.css` 頂部一處 |

---

## 7. 延伸性設計

**新增景點:** 第 4 節 SOP,只改 `data/places.json`。

**新增一個 `category` 或 `area` 值:** 改三處,同一個 PR:
1. 本檔第 3 節的允許值清單;
2. `scripts/validate.py` 的允許清單;
3. `assets/js/main.js` 的 `AREA_ORDER` / `CATEGORY_ORDER` 排序陣列。

前端篩選鈕依資料自動產生,但鈕的順序由 `main.js` 的排序陣列決定:新值不加進陣列會排到最後面,所以要同步改。官網出現新的景點類型時,`fetch_nsa.py` 會停下來報錯,提醒你走這個流程,不會默默塞進奇怪的值。

**新增欄位:** 改三處,同一個 PR:本檔第 3 節欄位表 → `scripts/validate.py` → 要顯示的話再改 `assets/js/place.js`(或 `main.js`)。先改規則、再改程式。

**擴充到其他內容類型(美食、活動):** 新增 `data/<type>.json`,沿用同一套欄位結構與 SOP,在本檔第 3 節加一張該類型的欄位表,詳情頁加一個 `?type=` 參數。本期不做(見 SPEC.md 不做清單)。

**換主題重用整套架構:** 例如改做「金門景點」或「課程講義」:
- 保留:文件鏈、協作規則、validator 架構、HTML/JS 模板、CSS 版型;
- 替換:`data/places.json` 內容、第 3 節的 `area` / `category` 允許值、第 5 節色票、`fetch_` 腳本。

---

## 8. 禁止清單

1. **前端不放任何 API key、token、密碼。** 整個 repo 是公開的。AI 功能只留 `assets/js/ai.js` 的接口契約,本期不實作。
2. **易變資訊不寫死:** 開放時間、票價、電話、船班、潮汐時刻不寫進 places.json;需要時寫「出發前請至官網確認」並靠 `sources` 連過去。
3. **事實必附來源:** 每筆至少一個 `sources`,第一個是澎管處官網。查不到來源的內容不寫。
4. **不整段複製官網文字:** `summary` 必須自己改寫;`description` 可以摘錄,但要精簡、改寫並保留來源。
5. **不放個資:** 學號、姓名、帳號、截圖(含 base64 內嵌圖)一律不進 repo。
6. **圖片:** 不外連官網圖片(hotlink),不放沒有確認授權的照片;有圖就要在每張的 `credit` 標明署名與出處頁 URL。
7. **不改 `slug`、不刪別人的資料**;要下架景點,開 issue 討論。
8. **不直接 push `dev` / `main`、不自己 merge、不 force push。**
9. **不碰自己任務範圍以外的檔案**;不改 PROGRESS.md(Instinct 專屬)。
10. **不引入建置工具或框架**(npm、bundler、SSG);本站維持純 HTML/CSS/JS + JSON。

---

## 9. 繳交對照表(W9 作業)

| 繳交項目 | 位置 | 狀態 |
|----------|------|------|
| 1. 專案簡介 | README.md 開頭 + 本檔第 1 節 | ⬜ |
| 2. GitHub Repository 連結 | https://github.com/nickyxu1985/penghu-travel-guide | ⬜ |
| 3. 網頁連結 | GitHub Pages(main 發佈後填入) | ⬜ |
| 4. AGENTS.md | 本檔 | ⬜ |
| 5. 規則如何幫 AI 繼續新增內容 | 第 4 節 SOP + 第 7 節延伸性;實證為 T6/T8/T11 全量資料管線(139 筆景點、389 張照片皆只靠文件鏈完成);原訂 T9「只給文件鏈,新增吉貝一筆」因 T6 全量入庫已涵蓋全部景點而不適用 | ⬜ |

繳交前最後檢查:Pages 網址打得開、首頁有資料、隨機點三個詳情頁都正常、本表全部打勾。
