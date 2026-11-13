# TASKS.md — 分工表

## 指派規則（能力指定分工）

- 指派 = 負責人依能力由 Nicky 指派（第二階段由專案經理 Muse 指派），名字寫死在本表對應任務。
- 下表已寫死負責人;要換人,由現任負責人在 handoff.md 註明並改本表。
- 任務不依日期排程,依下表順序與依賴關係推進;前置任務未完成就不要開始。
- 進度紀錄分工:handoff.md 由各 agent 各自記錄;PROGRESS.md(全 repo 進度 log)統一由 Instinct 登錄,其他人只讀。
- 唯一硬性時間:**2026-11-16(週一)前繳交**(T10)。
- 所有 PR 進 `dev` 分支,不直接動 `main`;不主動 merge,merge 由 Nicky 決定。

## 任務列表

| # | 負責人 | 內容 | 依賴 | 完成定義 | 狀態 |
|---|--------|------|------|----------|------|
| T1 | Nicky | 開 public repo(main + dev)、GitHub Pages 發 main | 無 | repo 公開可見,Pages 已啟用 | ✅ 已完成 |
| T2 | Instinct | 專案骨架 PR:index.html、place.html、assets/js(main/place/ai)、README、SPEC、TASKS、handoff、data/places.json 空陣列、.gitignore | T1 | PR 開出進 dev;空資料下首頁可瀏覽不報錯 | ✅ 已合併 dev(PR #1) |
| T3 | Hark | AGENTS.md 七節 + 文件閱讀鏈;SDD.md(schema 欄位表 + fetch 欄位對映規則) | T2 | 兩份文件 PR 進 dev;閱讀鏈與 README/SPEC 一致;schema 覆蓋前端已用欄位 | ✅ 已合併 dev(PR #2) |
| T4 | Hark | style.css 視覺實作,對應 AGENTS.md 風格節 | T3 | style.css PR 進 dev;首頁/詳情頁套用後版面可辨、空態美觀 | ✅ 已合併 dev(PR #2) |
| T5 | Instinct | validate.py + validate.yml(CI 擋壞資料) | T3(schema 定案) | CI workflow 進 dev;壞 schema 的資料會被擋下 | ✅ 已合併 dev(PR #6) |
| T6 | Instinct | fetch_nsa.py 景點全量入庫,過 validate | T5 | places.json 全量資料 PR 進 dev;CI 全綠 | ✅ 已合併 dev(PR #8) |
| T7 | Muse | 審 T2/T3/T4 PR(rubric 七節、閱讀鏈、視覺 QA),開 issue 不直接改 | T2、T3、T4 | 審查意見以 issue 呈現,署名清楚;不直接 push 修改 | ✅ 完成(issue #3/#4/#5 已修並關閉) |
| T8 | Cue | 資料品質把關:summary 抽審、category 校正;W8 精選 8 筆備援 | T6 | 抽審結果以 issue 或 PR 呈現;8 筆備援資料可用 | ✅ 已合併 dev(PR #9) |
| T9 | Cue 執行 / Muse 驗收 | 示範「只給文件鏈,新增吉貝一筆」PR | T6、T7 | Cue 只靠文件鏈開出新增吉貝景點的 PR;Muse 驗收該 PR 未回問任何人 | 不適用(T6 全量入庫涵蓋,官網已無未收錄景點) |
| T11 | Instinct | 官網照片全量入庫:schema 改多圖 `images`、fetch_photos.py 抓全部照片、詳情頁輪播+署名出處、validator/文件同步 | T6 | 139 筆 images 入庫;validate 與單元測試全綠;PR 進 dev | ✅ 已合併 dev(PR #10) |
| T12 | Hark | 第二階段版面風格重設計：依 AGENTS.md §5 第二階段規範重寫版型、CSS、前端 JS，只保留 places.json 資料格式，純靜態 | AGENTS.md §5（第二階段） | 新版前端 PR 進 dev；CI 全綠；AGENTS.md §5 已同步為新風格 | 進行中（待實作） |
| T13 | Hark | 詳情頁相簿燈箱：點縮圖彈出完整照片（燈箱），可放大縮小、上一張/下一張、關閉；封面維持第一張不變；點縮圖不跳回頂部 | AGENTS.md §5（第二階段） | 燈箱 PR 進 dev；CI 全綠；點縮圖開燈箱、縮放與上下張正常、不跳回頂部 | 已合併（PR #20） |
| T14 | Instinct | Issue #18 修正：修 parse_detail_page 正則（巢狀 div 截斷）+ 放寬 clean_description 600 字上限，同步改 SDD.md V6 與 validate.py；重抓 15 筆截斷者，更新 places.json | Issue #18 | 15 筆重抓 PR 進 dev；CI 全綠；places.json 15 筆 description 為官網全文 | 待開始 |
| T10 | Nicky | 11/16(週一)前繳交,只繳不改碼 | 全部 | 作業於 2026-11-16 前繳交 | 待開始 |

## 驗收方法論對應

- T9 是 SPEC.md 驗收標準③(handoff 真的有用)的實地演練:Cue 只靠文件鏈完成一筆新增。
- 驗收標準①②由 merge 紀錄佐證。
