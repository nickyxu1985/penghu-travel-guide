# handoff.md — 交接紀錄

每個任務完成或進入新階段時更新本檔。下一棒 agent 進場先讀文件鏈(SPEC → SDD → AGENTS → TASKS),再從本檔最新一筆接手。

## 目前狀態:T8 資料品質把關完成,PR 待建立,下一棒 T9(Cue 執行 / Muse 驗收)

### T8(Cue)—資料品質把關(2026-11-12)

- 逐筆核對 139 筆澎管處景點詳情頁,改寫全部 139 筆 `summary` 並補齊 139 筆 `tags`;只改 `data/places.json` 的這兩欄,`slug`、`category`、`description`、`sources`、`updated_at` 等欄位未動。`python scripts/validate.py` 通過(139 筆),15 個單元測試全通過。
- 139 筆 `category` 全數保留 T6 從官網列表擷取的值。SDD.md §5 指明類別來自列表卡片,而多數詳情頁沒有類別欄位；因此不依據古蹟身分推改類別。例:「澎湖醫院&關稅局馬公支關」詳情頁記載縣(市)定古蹟,但不足以證明官網列表分類應由「文化」改為「文化資產」；如需更動應先直接核對列表分類。[官方詳情頁](https://www.penghu-nsa.gov.tw/TravelInformationSceneryDetailC001200.aspx?Cond=d9268187-e0f5-4c70-adb0-92924167383a&Language=1028)
- 兩筆官方頁面有互相矛盾的資訊,摘要已避開不確定事項:「北海遊客中心」頁同時顯示開放中與 2023/10 起重建暫停、服務移往後寮；摘要不寫開放狀態、票價或電話,提醒出發前查官網。[官方詳情頁](https://www.penghu-nsa.gov.tw/TravelInformationSceneryDetailC001200.aspx?Cond=55ca54e1-0eb1-4133-a315-8b16f4aad381&Language=1028)；「西嶼彈藥本庫」正文稱縣定古蹟,資訊欄卻標示國定,摘要不寫古蹟分級。[官方詳情頁](https://www.penghu-nsa.gov.tw/TravelInformationSceneryDetailC001200.aspx?Cond=a421ff27-a695-4472-9e6b-eacf24bd8a01&Language=1028)
- W8 精選 8 筆景點名稱全已存在於 139 筆資料中,沒有重複新增；核心描述依官網改寫,未採用官網未佐證的附加說法(如天后宮 1604 年與中央老街鄰近、吉貝白沙/特定水上活動、雙心石滬 700 年等)。未將原始 W8 notebook 或個資複製進 repo。
- 工作分支:`agent/t8-place-quality`;PR 將開至 `dev`,不直接合併或部署。

### T6(Instinct)— 景點全量入庫(2026-11-12)

- 從最新 dev 開 `agent/t6-places-data`;交付 `scripts/fetch_nsa.py` + `data/places.json` 全量 139 筆,`python scripts/validate.py` 與 15 個單元測試全綠。
- 資料來源:澎管處官網列表(12 頁、139 筆)與各景點詳情頁,欄位對映依 SDD.md §5;禮貌抓取(每頁 ≥ 1 秒、專案 UA、錯誤頁重試)。
- **走 §7 流程新增 4 個 category 值**:官網出現 `宗教廟宇`(5 筆)、`觀光工廠`(2 筆)、`交通場站`(1 筆)、`國家風景區`(1 筆),已同步改三處:AGENTS.md §3、`scripts/validate.py` 允許清單、`assets/js/main.js` 的 `CATEGORY_ORDER`。
- 當時的 `summary` 為自動摘要(官網介紹第一句;過短者以「名稱+地區+介紹」補足 20 字),`tags` 全留空;已由上方 T8 全量改寫與補齊。
- 不抓圖、不入庫易變資訊(依 T3 定案);重抓時以 `nsa_id` 合併、保留人工改寫欄位。

### 給 T8(Cue)的交接重點

1. 抽審 `summary`(139 筆皆為自動摘要,未人工改寫)並補 `tags`(0–5 個、2–8 字)。
2. 校正 `category` 是否合理(新增的四類:宗教廟宇/觀光工廠/交通場站/國家風景區);要調整值請照 AGENTS.md §7 改三處。
3. 8 筆 W8 精選備援資料可直接依 §4 SOP 編進 `data/places.json`(以 `nsa_id` 對應既有筆時保留人工改寫欄位)。


### T7 文件修正(Instinct)— PR 待審(2026-11-12)

- 對應 Muse T7 審查的 issue #3、#4、#5,分支 `agent/docs-fixes`,PR 進 `dev`,不 merge。
- #3:§4 SOP 加一步「合併到 main 後開 GitHub Pages 網址確認新卡片出現」;§2 目錄樹把 `fetch_nsa.py`、`assets/img/` 標為(T6 待建);§7 的 `fetch_nsa.py` 引用同步標註。
- #4:§6 地區篩選列改為「只出現資料裡有的鄉市(最多 6 顆)+ 全部」,對齊 `main.js` 實作。
- #5 N2:§3 補 `tags` 不重複、`updated_at` 不晚於今天;§2 圖片命名統一為 `<slug>.<ext>`(jpg / jpeg / png / webp)。
- #5 N4(順手):§6 補 `description` ≤ 600 字、`tags` 0–5 個兩列對應行為。
- #5 N5:§7 新增 `category` / `area` 值改為「改三處」,補上 `main.js` 的 `AREA_ORDER` / `CATEGORY_ORDER` 排序陣列要同步。
- N1(順手):`place.html` 註解 `?id=` 改 `?slug=`;N6(順手):`place.js` 來源標籤改用原始 index,不再用過濾後序號。
- N3、N7 依 Nicky 指示不動。修改後 `python scripts/validate.py` 零錯誤(exit 0)。

### T5(Instinct) - 實作完成,待 PR(2026-11-12)

- 從 PR #2 merge 後的 dev(`502ed62`)開 `agent/t5-validator`,不動 main、不自行 merge。
- 交付:`scripts/validate.py`、`scripts/test_validate.py`、`.github/workflows/validate.yml`;同步本任務狀態與 PROGRESS.md。
- validator 純標準庫,覆蓋 SDD.md §4 V1–V13;錯誤帶筆數、slug、欄位與 V 編號,失敗 exit 1。
- `python scripts/validate.py [path]` 可帶測試檔,預設從 repo 位置找 `data/places.json`,不受工作目錄影響。
- optional image/image_credit 按 AGENTS.md §3 保留驗證,不抓圖也不新增圖片資料。
- CI 在 push / pull_request 到 dev、main 時跑單元測試與資料驗證,不部署;日期檢查以 Asia/Taipei 時區執行。
- 自測:15 個標準庫 unittest 全通過;暫放一筆 `slug=BAD_SLUG/category=美食` 到 places.json,出現 V4/V5 且 exit 1;已還原空陣列,驗證 exit 0。壞資料未 commit。
- 給 T6:抓取腳本完成後先跑 validator,允許值常數需與 AGENTS.md §3 同步。空陣列目前允許通過,全量資料仍需 T6/T8 內容品質抽查。
- PR/雲端 CI 狀態以 GitHub 即時結果為準;此筆只記錄本地測試。

### T3/T4(Hark)— 🔍 PR 待審(2026-11-12)

**交付:** `AGENTS.md`(§0 閱讀鏈與協作規則 + §1–9)、`SDD.md`、`assets/css/style.css`;前端兩支 JS 對齊新 schema;README 補本地預覽;TASKS.md T3/T4 狀態更新。

**定案的決定(下一棒請照這些做):**

1. **places.json 頂層 = 陣列**,不再接受 `{ "places": [...] }`。
2. **`id` → `slug`,`url` → `sources[]`**。詳情頁網址改為 `place.html?slug=<slug>`;JS 已同步修改。
3. **`category` 改用澎管處官網的景點分類**(自然風景 / 遊憩 / 文化 / 文化資產 / 生態 / 藝術),不用早先討論的「景點 / 美食 / 活動 / 島嶼」。原因:本期範圍已縮成純景點,若沿用四類,全站都會是「景點」一類,篩選沒有意義。
4. **新增 `area` 篩選**(5 鄉 1 市)。首頁有「地區」、「類型」兩列篩選,篩選鈕依資料自動產生,所以擴充 area 或 category 時不用改 JS。
5. **圖片本期不放**:官網照片多為攝影比賽作品,授權未確認,所以 `fetch_nsa.py` 不抓圖。卡片設計在無圖時也能好看。
6. **易變資訊(開放時間、電話、交通、票價)不入庫**:詳情頁固定顯示「出發前請至官網確認」。

**給 T5(Instinct):** validator 檢查項見 SDD.md §4(V1–V13),允許值清單以 AGENTS.md §3 為準。

**給 T6(Instinct):** 官網欄位對映見 SDD.md §5。

- `slug` 需要 `pypinyin`(只在 scripts 用)。
- 官網出現不在允許清單裡的類型時,要報錯停止,不要自動新增。
- 重抓時以 `nsa_id` 對應既有資料,保留人工改寫過的欄位。

**給 T7(Muse):** Muse 清單的七節對到 AGENTS.md 的位置:

| Muse 清單 | AGENTS.md |
|------|------|
| 欄位表 | §3 |
| SOP 與完成定義 | §4 |
| 規則與頁面對應 | §6 |
| 延伸性 | §7 |
| 禁止清單 | §8 |
| 目錄與命名 | §2 |
| 繳交對照 | §9 |

另外補了三節:§0 閱讀鏈、§1 目的、§5 風格(作業步驟二列出的「網頁整體風格」)。視覺 QA 請依 §5 核對。

**已知的坑:**

- 目前 places.json 是空陣列,所以首頁只會看到空態。我用 6 筆暫時資料測過篩選和詳情頁,但沒有 commit 這些資料。
- 本地預覽一定要用 `python -m http.server`。

### T1(Nicky)— ✅ 已完成

- public repo 已開:https://github.com/nickyxu1985/penghu-travel-guide
- GitHub Pages 發 main。
- 補記:repo 建立時只有 `main`;`dev` 分支由 T2 從 main 建立。

### T2(Instinct)— ✅ 已完成(PR #1 已 merge 進 dev)

- 內容:專案骨架 PR(進 dev)。檔案:`index.html`、`place.html`、`assets/js/main.js`、`assets/js/place.js`、`assets/js/ai.js`、`README.md`、`SPEC.md`、`TASKS.md`、`handoff.md`、`data/places.json`(空陣列)、`.gitignore`。
- 完成定義:空資料下首頁可瀏覽不報錯。

### 給 T3(Hark)的交接重點

1. **前端暫行欄位**:`main.js` / `place.js` 目前讀取 `id`、`name`、`category`、`summary`、`image`、`address`、`description`、`url`。SDD.md 定 schema 時請覆蓋這些欄位,或改欄位名後同步回頭修這兩支 JS。
2. **places.json 頂層格式**:前端同時接受頂層陣列 `[]` 或 `{ "places": [...] }`,SDD 請擇一定案。
3. **AGENTS.md 七節與閱讀鏈**:閱讀鏈請與 README/SPEC 一致(SPEC → SDD → AGENTS → TASKS → handoff → PROGRESS)。
4. **PROGRESS.md 規則寫進 AGENTS.md**:handoff.md 各 agent 各自記錄;PROGRESS.md 統一由 Instinct 登錄,其他人只讀(Nicky 2026-11-12 定的分工)。
5. **T5 依賴你的 schema**:validate.py 需要 SDD.md 的欄位表才能寫驗證規則。

### 給 T4(Hark)的交接重點

1. `index.html` / `place.html` 已 link `assets/css/style.css`(目前不存在,瀏覽器會 404 但不影響功能)。
2. 前端使用的 class 命名:`site-header`、`site-subtitle`、`site-footer`、`place-list`、`place-card`(含 `place-card-image/body/name/category/summary/address`)、`place-detail`(含 `place-image/name/category/summary/description/address/source`)、`empty-state`(含 `empty-state-title/hint`)。
3. 視覺風格依你 T3 產出的 AGENTS.md 風格節實作。
