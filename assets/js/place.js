/**
 * place.js — 景點詳情頁(place.html?slug=<slug>)
 *
 * 資料:data/places.json(欄位定義見 AGENTS.md §3,顯示順序見 SDD.md §3.2)。
 * 缺 slug、查無此筆、資料為空或讀取失敗時,顯示友善狀態訊息,不拋錯。
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

  function isSafeUrl(url) {
    return typeof url === 'string' && /^https:\/\//i.test(url);
  }

  function renderStatus(container, title, hint) {
    container.innerHTML =
      '<div class="empty-state">' +
      '<p class="empty-state-title">' + escapeHtml(title) + '</p>' +
      (hint ? '<p class="empty-state-hint">' + escapeHtml(hint) + '</p>' : '') +
      '<p><a href="index.html">&larr; 回景點列表</a></p>' +
      '</div>';
  }

  function paragraphs(text) {
    return String(text).split(/\n{2,}/).map(function (p) {
      return p.trim() ? '<p>' + escapeHtml(p.trim()) + '</p>' : '';
    }).join('');
  }

  /** credit 格式為「署名(出處頁 URL)」時,渲染成「圖片來源:<連結>」。 */
  function renderCredit(credit) {
    var text = String(credit || '');
    var match = text.match(/^(.*)\((https:\/\/[^()]+)\)$/);
    if (match && isSafeUrl(match[2])) {
      return '圖片來源:<a href="' + escapeHtml(match[2]) + '" target="_blank" rel="noopener">' +
        escapeHtml(match[1]) + '</a>';
    }
    return '圖片來源:' + escapeHtml(text);
  }

  function renderFigure(images, name) {
    if (!Array.isArray(images) || !images.length) { return ''; }
    var first = images[0];
    if (!first || typeof first.src !== 'string') { return ''; }
    var nav = images.length > 1
      ? '<button type="button" class="place-gallery-nav place-gallery-prev" aria-label="上一張照片">&#8249;</button>' +
        '<button type="button" class="place-gallery-nav place-gallery-next" aria-label="下一張照片">&#8250;</button>' +
        '<span class="place-gallery-counter">1 / ' + images.length + '</span>'
      : '';
    return '<figure class="place-figure place-gallery">' +
      '<div class="place-gallery-stage">' +
      '<img class="place-image" src="' + escapeHtml(first.src) + '" alt="' + escapeHtml(name) + '">' +
      nav +
      '</div>' +
      '<figcaption class="place-image-credit">' + renderCredit(first.credit) + '</figcaption>' +
      '</figure>';
  }

  /** 輪播行為:切換圖片、計數與 credit。 */
  function initGallery(container, images, name) {
    var gallery = container.querySelector('.place-gallery');
    if (!gallery || images.length < 2) { return; }
    var image = gallery.querySelector('.place-image');
    var counter = gallery.querySelector('.place-gallery-counter');
    var credit = gallery.querySelector('.place-image-credit');
    var index = 0;
    function show(next) {
      index = (next + images.length) % images.length;
      image.src = images[index].src;
      image.alt = name;
      counter.textContent = (index + 1) + ' / ' + images.length;
      credit.innerHTML = renderCredit(images[index].credit);
    }
    gallery.querySelector('.place-gallery-prev').addEventListener('click', function () { show(index - 1); });
    gallery.querySelector('.place-gallery-next').addEventListener('click', function () { show(index + 1); });
  }

  function renderSources(sources) {
    if (!Array.isArray(sources)) { return ''; }
    var items = [];
    sources.forEach(function (url, i) {
      if (!isSafeUrl(url)) { return; }
      var label = i === 0 ? '澎管處官網介紹' : '參考資料 ' + i;
      items.push('<li><a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + label + ' ↗</a></li>');
    });
    return items.length ? '<ul class="place-source">' + items.join('') + '</ul>' : '';
  }

  function renderPlace(container, place) {
    document.title = (place.name || '景點介紹') + ' | 澎湖旅遊指南';

    var meta = [];
    if (place.category) { meta.push('<strong>' + escapeHtml(place.category) + '</strong>'); }
    if (place.area) { meta.push(escapeHtml(place.area)); }

    var figure = renderFigure(place.images, place.name);

    var tags = Array.isArray(place.tags) && place.tags.length
      ? '<ul class="place-tags">' + place.tags.map(function (t) {
          return '<li class="tag">' + escapeHtml(t) + '</li>';
        }).join('') + '</ul>'
      : '';

    container.innerHTML =
      figure +
      (meta.length ? '<p class="place-meta">' + meta.join(' · ') + '</p>' : '') +
      '<h2 class="place-name">' + escapeHtml(place.name || '未命名景點') + '</h2>' +
      (place.summary ? '<p class="place-summary">' + escapeHtml(place.summary) + '</p>' : '') +
      (place.description ? '<div class="place-description">' + paragraphs(place.description) + '</div>' : '') +
      (place.address ? '<p class="place-address">地址:' + escapeHtml(place.address) + '</p>' : '') +
      tags +
      '<p class="place-notice">開放時間、交通與潮汐會變動,出發前請至官網確認。</p>' +
      renderSources(place.sources) +
      (place.updated_at ? '<p class="place-updated">資料整理日:' + escapeHtml(place.updated_at) + '</p>' : '');

    initGallery(container, Array.isArray(place.images) ? place.images : [], place.name || '');
  }

  function init() {
    var container = document.getElementById('place-detail');
    if (!container) { return; }

    var slug = new URLSearchParams(window.location.search).get('slug');
    if (!slug) {
      renderStatus(container, '沒有指定景點。', '請從景點列表挑一個景點進來。');
      return;
    }

    renderStatus(container, '景點資料載入中…');

    fetch(DATA_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .then(function (data) {
        var places = Array.isArray(data) ? data : [];
        var place = null;
        for (var i = 0; i < places.length; i++) {
          if (places[i] && places[i].slug === slug) { place = places[i]; break; }
        }
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
