/**
 * place.js — 景點詳情頁(place.html?slug=<slug>)
 *
 * 資料:data/places.json(欄位定義見 AGENTS.md §3)。
 * 版面與 class 命名見 AGENTS.md §5(第二階段):滿版封面 → 兩欄(引言+介紹+提示框 / 吸頂資訊卡)
 * → 相簿(縮圖點一下換封面圖與出處)→ 同地區推薦 3 筆(同類型優先)。
 * 查無 slug、資料空或讀取失敗時,顯示友善空態,不拋錯。
 */

(function () {
  'use strict';

  var DATA_URL = 'data/places.json';
  var MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=';
  var RELATED_COUNT = 3;

  // ---------- 工具 ----------

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

  function safeImageSrc(src) {
    return typeof src === 'string' && /^assets\/img\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(src) ? src : '';
  }

  function validImages(place) {
    var imgs = place && Array.isArray(place.images) ? place.images : [];
    return imgs.filter(function (img) { return img && safeImageSrc(img.src); });
  }

  /** credit 格式「署名(出處頁 URL)」→「圖片來源:<署名連結>」 */
  function renderCredit(credit) {
    var text = String(credit || '').trim();
    var match = text.match(/^(.*?)\s*[(（](https:\/\/[^()（）]+)[)）]$/);
    if (match && isSafeUrl(match[2])) {
      return '圖片來源：<a href="' + escapeHtml(match[2]) + '" target="_blank" rel="noopener">' +
        escapeHtml(match[1] || match[2]) + '</a>';
    }
    return text ? '圖片來源：' + escapeHtml(text) : '';
  }

  function renderEmpty(container, title, hint) {
    container.innerHTML =
      '<div class="empty-state empty-state-page">' +
      '<p class="empty-state-title">' + escapeHtml(title) + '</p>' +
      (hint ? '<p class="empty-state-hint">' + escapeHtml(hint) + '</p>' : '') +
      '<a class="btn btn-dark" href="index.html">回景點列表</a>' +
      '</div>';
  }

  // ---------- 區塊 ----------

  function renderCover(place, images) {
    var first = images[0];
    return '<section class="cover">' +
      (first ? '<img class="cover-img" id="cover-img" src="' + escapeHtml(first.src) + '" alt="' + escapeHtml(place.name) + '">'
             : '<div class="cover-img cover-img-empty" aria-hidden="true"></div>') +
      '<div class="cover-shade" aria-hidden="true"></div>' +
      '<div class="cover-body">' +
      '<nav class="breadcrumb" aria-label="麵包屑">' +
      '<a href="index.html">首頁</a><span aria-hidden="true">/</span>' +
      (place.area ? '<a href="index.html?area=' + encodeURIComponent(place.area) + '#places">' + escapeHtml(place.area) + '</a><span aria-hidden="true">/</span>' : '') +
      '<span aria-current="page">' + escapeHtml(place.name) + '</span>' +
      '</nav>' +
      (place.category ? '<span class="cover-badge">' + escapeHtml(place.category) + '</span>' : '') +
      '<h1 class="cover-title">' + escapeHtml(place.name) + '</h1>' +
      '</div>' +
      (first ? '<p class="cover-credit" id="cover-credit">' + renderCredit(first.credit) + '</p>' : '') +
      '</section>';
  }

  function renderArticle(place) {
    var paragraphs = String(place.description || '').split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    return '<article class="article">' +
      (place.summary ? '<p class="lede">' + escapeHtml(place.summary) + '</p>' : '') +
      paragraphs.map(function (p) { return '<p class="prose">' + escapeHtml(p).replace(/\n/g, '<br>') + '</p>'; }).join('') +
      '<aside class="notice"><strong class="notice-title">出發前請至官網確認</strong>' +
      '<span class="notice-text">開放時間、票價、交通、船班與潮汐都可能變動，本站不列這些易變資訊。</span></aside>' +
      '</article>';
  }

  function renderInfoCard(place) {
    var rows = [];
    if (place.area) { rows.push(['地區', escapeHtml(place.area)]); }
    if (place.category) { rows.push(['類型', escapeHtml(place.category)]); }
    if (place.address) { rows.push(['地址', escapeHtml(place.address)]); }

    var mapQuery = place.address || ('澎湖 ' + place.name);
    var sources = Array.isArray(place.sources) ? place.sources.filter(isSafeUrl) : [];
    var tags = Array.isArray(place.tags) ? place.tags.slice(0, 5) : [];

    return '<aside class="info-card" aria-label="景點資訊">' +
      '<dl class="info-list">' + rows.map(function (r) {
        return '<div class="info-row"><dt class="info-label">' + r[0] + '</dt><dd class="info-value">' + r[1] + '</dd></div>';
      }).join('') + '</dl>' +
      '<div class="info-actions">' +
      '<a class="btn btn-dark" href="' + escapeHtml(MAPS_URL + encodeURIComponent(mapQuery)) + '" target="_blank" rel="noopener">在 Google 地圖開啟</a>' +
      sources.map(function (url, i) {
        return '<a class="btn btn-ghost" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
          (i === 0 ? '澎管處官網介紹' : '參考資料 ' + i) + '</a>';
      }).join('') +
      '</div>' +
      (tags.length ? '<ul class="tag-list">' + tags.map(function (t) {
        return '<li class="tag">' + escapeHtml(t) + '</li>';
      }).join('') + '</ul>' : '') +
      (place.updated_at ? '<p class="info-updated">資料整理日：' + escapeHtml(place.updated_at) + '</p>' : '') +
      '</aside>';
  }

  function renderGallery(place, images) {
    if (images.length < 2) { return ''; }
    return '<section class="gallery" aria-label="相簿">' +
      '<h2 class="block-title">相簿 <span class="block-count">' + images.length + ' 張</span></h2>' +
      '<div class="thumb-row">' + images.map(function (img, i) {
        return '<button type="button" class="thumb' + (i === 0 ? ' is-active' : '') + '" data-index="' + i +
          '" aria-label="顯示第 ' + (i + 1) + ' 張照片" aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' +
          '<img class="thumb-img" src="' + escapeHtml(img.src) + '" alt="" loading="lazy"></button>';
      }).join('') + '</div>' +
      '</section>';
  }

  function pickRelated(place, all) {
    var pool = all.filter(function (p) { return p.slug !== place.slug && p.area === place.area; });
    pool.sort(function (a, b) {
      var sa = a.category === place.category ? 0 : 1;
      var sb = b.category === place.category ? 0 : 1;
      return sa - sb || String(a.name).localeCompare(String(b.name), 'zh-Hant');
    });
    return pool.slice(0, RELATED_COUNT);
  }

  function renderRelated(place, all) {
    var list = pickRelated(place, all);
    if (!list.length) { return ''; }
    return '<section class="related" aria-label="同地區推薦">' +
      '<h2 class="block-title">同在' + escapeHtml(place.area) + '</h2>' +
      '<div class="card-grid">' + list.map(function (p) {
        var img = validImages(p)[0];
        return '<a class="card" href="place.html?slug=' + encodeURIComponent(p.slug) + '">' +
          '<div class="card-media">' +
          (img ? '<img class="card-img" src="' + escapeHtml(img.src) + '" alt="' + escapeHtml(p.name) + '" loading="lazy">'
               : '<div class="card-img card-img-empty" aria-hidden="true"></div>') +
          (p.category ? '<span class="card-badge">' + escapeHtml(p.category) + '</span>' : '') +
          '</div><div class="card-body">' +
          '<p class="card-area">' + escapeHtml(p.area) + '</p>' +
          '<h3 class="card-title">' + escapeHtml(p.name) + '</h3>' +
          (p.summary ? '<p class="card-summary">' + escapeHtml(p.summary) + '</p>' : '') +
          '</div></a>';
      }).join('') + '</div>' +
      '</section>';
  }

  function bindGallery(images) {
    var row = document.querySelector('.thumb-row');
    var cover = document.getElementById('cover-img');
    var credit = document.getElementById('cover-credit');
    if (!row || !cover) { return; }
    row.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.thumb');
      if (!btn) { return; }
      var i = parseInt(btn.getAttribute('data-index'), 10);
      if (!images[i]) { return; }
      cover.src = images[i].src;
      if (credit) { credit.innerHTML = renderCredit(images[i].credit); }
      Array.prototype.forEach.call(row.querySelectorAll('.thumb'), function (el) {
        var on = el === btn;
        el.classList.toggle('is-active', on);
        el.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var top = document.querySelector('.cover');
      if (top) {
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        top.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    });
  }

  // ---------- 主流程 ----------

  function render(root, place, all) {
    var images = validImages(place);
    document.title = place.name + ' | 澎湖旅遊指南';
    root.innerHTML =
      renderCover(place, images) +
      '<div class="detail">' + renderArticle(place) + renderInfoCard(place) + '</div>' +
      renderGallery(place, images) +
      renderRelated(place, all);
    bindGallery(images);
  }

  function init() {
    var root = document.getElementById('place-root');
    if (!root) { return; }
    var slug = new URLSearchParams(window.location.search).get('slug') || '';

    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || data.length === 0) {
          renderEmpty(root, '目前還沒有景點資料', '資料整理中，請稍後再來。');
          return;
        }
        var all = data.filter(function (p) { return p && p.slug && p.name; });
        var place = null;
        for (var i = 0; i < all.length; i++) { if (all[i].slug === slug) { place = all[i]; break; } }
        if (!place) {
          renderEmpty(root, '找不到這個景點', slug ? '網址中的景點代號「' + slug + '」不存在，可能已改名或下架。' : '網址缺少景點代號(?slug=)。');
          return;
        }
        render(root, place, all);
      })
      .catch(function () {
        renderEmpty(root, '景點資料讀取失敗', '請透過 HTTP 開啟本站(例如 GitHub Pages,或在專案根目錄執行 python -m http.server 8000),不要直接雙擊檔案。');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
