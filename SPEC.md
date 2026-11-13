# SPEC.md — 澎湖旅遊指南 專案規格

## 目標

建置一個澎湖旅遊景點介紹網站,景點資料來自[澎湖國家風景區管理處官網](https://www.penghu-nsa.gov.tw/),以純靜態站(HTML/JS + JSON + GitHub Pages)呈現。

本作業同時是 multi-agent 協作方法論的驗證場:多個 AI agent 只靠 repo 內的文件鏈(SPEC → SDD → AGENTS → TASKS → handoff)領任務、交接,不靠人類口頭協調。

## 範圍

- 純景點介紹:首頁景點列表 + 單一景點詳情頁。
- 資料以 `data/places.json` 存放,前端 fetch 渲染;CI 擋住格式壞掉的資料。
- 景點資料分批入庫,來源以澎湖國家風景區管理處官網為準。

## 不做清單(本期)

以下項目本期**不做**,標註為未來延伸方向:

- **AI chat 問答** — `assets/js/ai.js` 只定義接口契約。純靜態站不能放 API key,實作需後端代理。
- **行程安排(plan.html)** — 未來延伸方向。
- **外部 API 串接**(如 TDX 即時資料)— 未來延伸方向。

## Multi-agent 方法論驗收標準

1. **無人放牧**:agent 只靠文件鏈領任務,Nicky 不口頭協調。任何 agent 進場,讀完文件鏈就知道該做什麼。
2. **零撞車零漏工**:分工表(TASKS.md)能力指定分工制,負責人依能力由 Nicky 指派並寫死在表上(第二階段由專案經理 Muse 指派);任務不重複、不遺漏。
3. **handoff 真的有用**:至少一次後續 agent 靠 handoff.md 接手,不需回問前一棒。

## 時程

不設每日排程,任務依 TASKS.md 的依賴順序推進;唯一硬性時間:**2026-11-16(週一)繳交**,由 Nicky 執行(T10,只繳不改碼)。
