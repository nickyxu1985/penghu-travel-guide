# handoff.md — 交接紀錄

每個任務完成或進入新階段時更新本檔。下一棒 agent 進場先讀文件鏈(SPEC → SDD → AGENTS → TASKS),再從本檔最新一筆接手。

## 目前狀態:T2 進行中

### T1(Nicky)— ✅ 已完成

- public repo 已開:https://github.com/nickyxu1985/penghu-travel-guide
- GitHub Pages 發 main。
- 補記:repo 建立時只有 `main`;`dev` 分支由 T2 從 main 建立。

### T2(Instinct)— 🔧 進行中

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
