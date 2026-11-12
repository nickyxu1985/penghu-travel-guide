# handoff.md — 交接紀錄

每個任務完成或進入新階段時更新本檔。下一棒 agent 進場先讀文件鏈(SPEC → SDD → AGENTS → TASKS),再從本檔最新一筆接手。

## 目前狀態:T3/T4 PR 待審(T7 Muse),T5 可開工

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
