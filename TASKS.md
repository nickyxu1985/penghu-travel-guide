# TASKS.md — 分工表

## 認領規則

- 認領 = 先把自己的名字寫進本表對應任務並 commit,**先 commit 先得**。
- 下表已寫死負責人;要換人,由現任負責人在 handoff.md 註明並改本表。
- 任務不依日期排程,依下表順序與依賴關係推進;前置任務未完成就不要開始。
- 進度紀錄分工:handoff.md 由各 agent 各自記錄;PROGRESS.md(全 repo 進度 log)統一由 Instinct 登錄,其他人只讀。
- 唯一硬性時間:**2026-11-16(週一)繳交**(T10)。
- 所有 PR 進 `dev` 分支,不直接動 `main`;不主動 merge,merge 由 Nicky 決定。

## 任務列表

| # | 負責人 | 內容 | 依賴 | 完成定義 | 狀態 |
|---|--------|------|------|----------|------|
| T0 | Vibe | 進度觀察員:只讀 TASKS.md + handoff.md,每日向 Nicky 報進度 | 無(全程) | 每日進度報告送達 Nicky;不修改任何檔案 | 進行中 |
| T1 | Nicky | 開 public repo(main + dev)、GitHub Pages 發 main | 無 | repo 公開可見,Pages 已啟用 | ✅ 已完成 |
| T2 | Instinct | 專案骨架 PR:index.html、place.html、assets/js(main/place/ai)、README、SPEC、TASKS、handoff、data/places.json 空陣列、.gitignore | T1 | PR 開出進 dev;空資料下首頁可瀏覽不報錯 | 🔧 進行中 |
| T3 | Hark | AGENTS.md 七節 + 文件閱讀鏈;SDD.md(schema 欄位表 + fetch 欄位對映規則) | T2 | 兩份文件 PR 進 dev;閱讀鏈與 README/SPEC 一致;schema 覆蓋前端已用欄位 | 🔍 PR 待審 |
| T4 | Hark | style.css 視覺實作,對應 AGENTS.md 風格節 | T3 | style.css PR 進 dev;首頁/詳情頁套用後版面可辨、空態美觀 | 🔍 PR 待審 |
| T5 | Instinct | validate.py + validate.yml(CI 擋壞資料) | T3(schema 定案) | CI workflow 進 dev;壞 schema 的資料會被擋下 | 🔧 進行中(Instinct 已認領) |
| T6 | Instinct | fetch_nsa.py 景點全量入庫,過 validate | T5 | places.json 全量資料 PR 進 dev;CI 全綠 | 待開始 |
| T7 | Muse | 審 T2/T3/T4 PR(rubric 七節、閱讀鏈、視覺 QA),開 issue 不直接改 | T2、T3、T4 | 審查意見以 issue 呈現,署名清楚;不直接 push 修改 | 待開始 |
| T8 | Cue | 資料品質把關:summary 抽審、category 校正;W8 精選 8 筆備援 | T6 | 抽審結果以 issue 或 PR 呈現;8 筆備援資料可用 | 待開始 |
| T9 | Cue 執行 / Muse 驗收 | 示範「只給文件鏈,新增吉貝一筆」PR | T6、T7 | Cue 只靠文件鏈開出新增吉貝景點的 PR;Muse 驗收該 PR 未回問任何人 | 待開始 |
| T10 | Nicky | 11/16(週一)繳交,只繳不改碼 | 全部 | 作業於 2026-11-16 繳交 | 待開始 |

## 驗收方法論對應

- T9 是 SPEC.md 驗收標準③(handoff 真的有用)的實地演練:Cue 只靠文件鏈完成一筆新增。
- 驗收標準①②由全程觀察(T0)與 merge 紀錄佐證。
