/**
 * ai.js — 預留的 AI 接口契約(尚未實作)
 *
 * 目的:定義站內 AI 問答模組的輸入/輸出契約,讓後續任務照此接上,
 *       而不影響現有頁面。目前為空模組,刻意不掛進 index.html / place.html。
 *
 * 契約(Contract):
 *
 *   輸入:
 *     {
 *       question: string,   // 使用者的問題(繁體中文)
 *       places:   Array     // data/places.json 的完整內容,作為回答依據
 *     }
 *
 *   輸出:
 *     Promise<string>       // AI 產生的回答文字
 *
 *   介面預定:
 *     async function askAboutPenghu(question, places) -> Promise<string>
 *
 * 安全限制(重要):
 *   本站為純靜態站(GitHub Pages),所有程式碼與設定都會公開,
 *   **絕對不能把 API key 寫進這個檔案或任何前端程式碼**。
 *   未來實作必須透過後端代理(serverless function 等)呼叫模型 API,
 *   key 只存在後端環境變數。這也是 SPEC.md 把 AI chat 列為
 *   「未來延伸方向」而非本期範圍的原因之一。
 */

(function () {
  'use strict';

  // 預留命名空間,避免之後接實作時與其他腳本衝突。
  window.PenghuAI = window.PenghuAI || {
    /**
     * @param {string} question 使用者問題
     * @param {Array}  places   places.json 內容
     * @returns {Promise<string>} 回答文字
     */
    ask: function (question, places) {
      void question;
      void places;
      return Promise.reject(new Error('AI 模組尚未實作(見 SPEC.md 未來延伸方向)'));
    }
  };
})();
