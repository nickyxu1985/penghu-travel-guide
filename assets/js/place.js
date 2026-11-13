/**
 * place.js — 景點詳情頁(place.html?slug=<slug>)
 *
 * 資料:data/places.json(欄位定義見 AGENTS.md §3)。
 * 版面與 class 命名見 AGENTS.md §5(第二階段):滿版封面 → 兩欄(引言+介紹+提示框 / 吸頂資訊卡)
 * → 相簿(縮圖點一下開燈箱看完整照片,封面固定第一張)→ 同地區推薦 3 筆(同類型優先)。
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
          '" aria-haspopup="dialog" aria-label="放大檢視第 ' + (i + 1) + ' 張照片">' +
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

  // ---------- 相簿燈箱(T13) ----------
  // 點縮圖開燈箱看完整照片;封面固定第一張不變。
  // 操作:上一張/下一張(按鈕、← →)、放大縮小(按鈕、+ -、滾輪、雙擊)、放大後可拖曳、
  // 關閉(✕ 按鈕、點背景、Esc)。開關燈箱都不捲動頁面,關閉後焦點回到原縮圖。

  var ZOOM_MIN = 1;
  var ZOOM_MAX = 4;
  var ZOOM_STEP = 0.5;

  function createLightbox(images) {
    var box = document.getElementById('lightbox');
    if (!box || !images.length) { return null; }
    var stage = document.getElementById('lightbox-stage');
    var img = document.getElementById('lightbox-img');
    var count = document.getElementById('lightbox-count');
    var credit = document.getElementById('lightbox-credit');
    var level = document.getElementById('lightbox-zoom-level');
    var btnPrev = document.getElementById('lightbox-prev');
    var btnNext = document.getElementById('lightbox-next');
    var btnIn = document.getElementById('lightbox-zoom-in');
    var btnOut = document.getElementById('lightbox-zoom-out');
    var btnClose = document.getElementById('lightbox-close');

    var index = 0;
    var scale = 1;
    var panX = 0;
    var panY = 0;
    var drag = null;
    var opener = null;
    var onChange = null;
    var single = images.length < 2;

    btnPrev.hidden = single;
    btnNext.hidden = single;

    function apply() {
      img.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + scale + ')';
      level.textContent = Math.round(scale * 100) + '%';
      btnOut.disabled = scale <= ZOOM_MIN;
      btnIn.disabled = scale >= ZOOM_MAX;
      box.classList.toggle('is-zoomed', scale > 1);
    }

    function clampPan() {
      // 放大後拖曳範圍限制在圖片邊界內
      var maxX = Math.max(0, (img.offsetWidth * scale - stage.clientWidth) / 2);
      var maxY = Math.max(0, (img.offsetHeight * scale - stage.clientHeight) / 2);
      panX = Math.min(maxX, Math.max(-maxX, panX));
      panY = Math.min(maxY, Math.max(-maxY, panY));
    }

    function zoomTo(next) {
      var prev = scale;
      scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
      if (scale === 1) { panX = 0; panY = 0; } else if (prev) {
        panX = panX * scale / prev;
        panY = panY * scale / prev;
        clampPan();
      }
      apply();
    }

    function show(i) {
      index = (i + images.length) % images.length;
      var item = images[index];
      img.src = item.src;
      img.alt = '第 ' + (index + 1) + ' 張照片';
      count.textContent = (index + 1) + ' / ' + images.length;
      credit.innerHTML = renderCredit(item.credit);
      scale = 1; panX = 0; panY = 0;
      apply();
      if (onChange) { onChange(index); }
    }

    function onKey(ev) {
      if (box.hidden) { return; }
      var k = ev.key;
      if (k === 'Escape') { close(); }
      else if (k === 'ArrowLeft' && !single) { show(index - 1); }
      else if (k === 'ArrowRight' && !single) { show(index + 1); }
      else if (k === '+' || k === '=') { zoomTo(scale + ZOOM_STEP); }
      else if (k === '-' || k === '_') { zoomTo(scale - ZOOM_STEP); }
      else if (k === '0') { zoomTo(1); }
      else if (k === 'Tab') { trapFocus(ev); return; }
      else { return; }
      ev.preventDefault();
    }

    function trapFocus(ev) {
      var list = Array.prototype.filter.call(box.querySelectorAll('button, a[href]'), function (el) {
        return !el.hidden && !el.disabled && el.offsetParent !== null;
      });
      if (!list.length) { return; }
      var first = list[0];
      var last = list[list.length - 1];
      if (ev.shiftKey && document.activeElement === first) { last.focus(); ev.preventDefault(); }
      else if (!ev.shiftKey && document.activeElement === last) { first.focus(); ev.preventDefault(); }
    }

    function open(i, fromEl) {
      opener = fromEl || null;
      show(i);
      box.hidden = false;
      document.documentElement.classList.add('lightbox-open');
      document.addEventListener('keydown', onKey);
      btnClose.focus({ preventScroll: true });
    }

    function close() {
      if (box.hidden) { return; }
      box.hidden = true;
      document.documentElement.classList.remove('lightbox-open');
      document.removeEventListener('keydown', onKey);
      img.removeAttribute('src');
      // 焦點回到原縮圖,但不讓瀏覽器為了焦點捲動頁面
      if (opener && opener.focus) { opener.focus({ preventScroll: true }); }
    }

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { show(index - 1); });
    btnNext.addEventListener('click', function () { show(index + 1); });
    btnIn.addEventListener('click', function () { zoomTo(scale + ZOOM_STEP); });
    btnOut.addEventListener('click', function () { zoomTo(scale - ZOOM_STEP); });
    level.addEventListener('click', function () { zoomTo(1); });

    // 點背景(照片以外的空白處)關閉
    box.addEventListener('click', function (ev) {
      if (ev.target === box || ev.target === stage) { close(); }
    });

    // 雙擊照片:原尺寸 ↔ 2 倍
    img.addEventListener('dblclick', function () { zoomTo(scale > 1 ? 1 : 2); });

    // 滾輪縮放
    stage.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      zoomTo(scale + (ev.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    }, { passive: false });

    // 放大後拖曳平移(滑鼠與觸控共用 Pointer Events)
    img.addEventListener('pointerdown', function (ev) {
      if (scale <= 1) { return; }
      ev.preventDefault();
      drag = { x: ev.clientX, y: ev.clientY, px: panX, py: panY };
      box.classList.add('is-dragging');
      if (img.setPointerCapture) { img.setPointerCapture(ev.pointerId); }
    });
    img.addEventListener('pointermove', function (ev) {
      if (!drag) { return; }
      panX = drag.px + (ev.clientX - drag.x);
      panY = drag.py + (ev.clientY - drag.y);
      clampPan();
      apply();
    });
    function endDrag() { drag = null; box.classList.remove('is-dragging'); }
    img.addEventListener('pointerup', endDrag);
    img.addEventListener('pointercancel', endDrag);

    return {
      open: open,
      onChange: function (fn) { onChange = fn; }
    };
  }

  function bindGallery(images) {
    var row = document.querySelector('.thumb-row');
    if (!row) { return; }
    var lightbox = createLightbox(images);
    if (!lightbox) { return; }
    var thumbs = row.querySelectorAll('.thumb');

    // 燈箱換張時,同步標出目前在看的縮圖
    lightbox.onChange(function (i) {
      Array.prototype.forEach.call(thumbs, function (el, n) {
        el.classList.toggle('is-active', n === i);
      });
    });

    row.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.thumb');
      if (!btn) { return; }
      ev.preventDefault();
      var i = parseInt(btn.getAttribute('data-index'), 10);
      if (!images[i]) { return; }
      lightbox.open(i, btn);
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
