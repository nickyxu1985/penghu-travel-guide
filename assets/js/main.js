/**
 * main.js — 首頁景點列表邏輯
 *
 * 從 data/places.json 純前端 fetch 景點資料並渲染卡片列表。
 * 資料為空陣列、檔案不存在或格式異常時,顯示友善空態,不拋錯。
 *
 * 欄位對映(暫行,正式 schema 以 SDD.md 為準,T3 產出):
 *   id       景點唯一代碼(place.html?id= 使用)
 *   name     景點名稱
 *   category 分類
 *   summary  摘要
 *   image    代表圖 URL(可空)
 *   address  地址(可空)
 */

(function () {
  'use strict';

  var DATA_URL = 'data/places.json';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** 友善狀態訊息:空態、載入失敗、查無資料共用 */
  function renderStatus(container, title, hint) {
    container.innerHTML =
      '<div class="empty-state">' +
      '<p class="empty-state-title">' + escapeHtml(title) + '</p>' +
      (hint ? '<p class="empty-state-hint">' + escapeHtml(hint) + '</p>' : '') +
      '</div>';
  }

  function renderCard(place) {
    var id = encodeURIComponent(place.id == null ? '' : place.id);
    var card = document.createElement('a');
    card.className = 'place-card';
    card.href = 'place.html?id=' + id;

    var imgHtml = place.image
      ? '<img class="place-card-image" src="' + escapeHtml(place.image) + '" alt="' + escapeHtml(place.name) + '">'
      : '';

    card.innerHTML =
      imgHtml +
      '<div class="place-card-body">' +
      '<h2 class="place-card-name">' + escapeHtml(place.name || '未命名景點') + '</h2>' +
      (place.category ? '<p class="place-card-category">' + escapeHtml(place.category) + '</p>' : '') +
      (place.summary ? '<p class="place-card-summary">' + escapeHtml(place.summary) + '</p>' : '') +
      (place.address ? '<p class="place-card-address">' + escapeHtml(place.address) + '</p>' : '') +
      '</div>';
    return card;
  }

  function renderList(container, places) {
    container.innerHTML = '';
    places.forEach(function (place) {
      container.appendChild(renderCard(place));
    });
  }

  function loadPlaces() {
    return fetch(DATA_URL, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }
      return res.json();
    });
  }

  function init() {
    var container = document.getElementById('place-list');
    if (!container) {
      return;
    }
    renderStatus(container, '景點資料載入中…');

    loadPlaces()
      .then(function (data) {
        var places = Array.isArray(data) ? data : (data && Array.isArray(data.places) ? data.places : []);
        if (places.length === 0) {
          renderStatus(container, '景點資料整理中,敬請期待。', '本站持續收錄澎湖景點,請稍後再回來看看。');
          return;
        }
        renderList(container, places);
      })
      .catch(function () {
        // 檔案不存在、JSON 格式錯誤、網路問題都落在這裡:顯示空態,不讓頁面報錯
        renderStatus(container, '景點資料整理中,敬請期待。', '暫時無法讀取景點資料,請稍後再試。');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
