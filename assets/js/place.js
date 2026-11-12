/**
 * place.js — 景點詳情頁邏輯
 *
 * 以 query string(?id=)從 data/places.json 取單筆景點顯示。
 * 缺 id、查無此筆、資料為空或讀取失敗時,顯示友善狀態訊息,不拋錯。
 *
 * 欄位對映(暫行,正式 schema 以 SDD.md 為準,T3 產出):同 main.js。
 *   額外使用:description 詳細介紹(可空)、url 官方來源頁(可空)。
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

  function renderStatus(container, title, hint) {
    container.innerHTML =
      '<div class="empty-state">' +
      '<p class="empty-state-title">' + escapeHtml(title) + '</p>' +
      (hint ? '<p class="empty-state-hint">' + escapeHtml(hint) + '</p>' : '') +
      '<p><a href="index.html">&larr; 回景點列表</a></p>' +
      '</div>';
  }

  function renderPlace(container, place) {
    document.title = (place.name || '景點介紹') + ' | 澎湖旅遊指南';

    container.innerHTML =
      (place.image
        ? '<img class="place-image" src="' + escapeHtml(place.image) + '" alt="' + escapeHtml(place.name) + '">'
        : '') +
      '<h2 class="place-name">' + escapeHtml(place.name || '未命名景點') + '</h2>' +
      (place.category ? '<p class="place-category">' + escapeHtml(place.category) + '</p>' : '') +
      (place.summary ? '<p class="place-summary">' + escapeHtml(place.summary) + '</p>' : '') +
      (place.description ? '<div class="place-description"><p>' + escapeHtml(place.description) + '</p></div>' : '') +
      (place.address ? '<p class="place-address">地址:' + escapeHtml(place.address) + '</p>' : '') +
      (place.url
        ? '<p class="place-source"><a href="' + escapeHtml(place.url) + '" target="_blank" rel="noopener">官方資料來源</a></p>'
        : '');
  }

  function findPlace(places, id) {
    for (var i = 0; i < places.length; i++) {
      if (String(places[i] && places[i].id) === id) {
        return places[i];
      }
    }
    return null;
  }

  function init() {
    var container = document.getElementById('place-detail');
    if (!container) {
      return;
    }

    var id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      renderStatus(container, '沒有指定景點。', '請從景點列表挑一個景點進來。');
      return;
    }

    renderStatus(container, '景點資料載入中…');

    fetch(DATA_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        var places = Array.isArray(data) ? data : (data && Array.isArray(data.places) ? data.places : []);
        var place = findPlace(places, id);
        if (!place) {
          renderStatus(container, '查無此景點。', '這個景點可能尚未收錄,或連結有誤。');
          return;
        }
        renderPlace(container, place);
      })
      .catch(function () {
        renderStatus(container, '暫時無法讀取景點資料。', '請稍後再試,或先回景點列表看看。');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
