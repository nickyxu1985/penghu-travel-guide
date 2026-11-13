/**
 * main.js — 首頁：封面統計、依地區探索、類型篩選、搜尋、景點卡片
 *
 * 資料:data/places.json(頂層陣列,欄位定義見 AGENTS.md §3)。
 * 版面與 class 命名見 AGENTS.md §5(第二階段)。
 * 資料為空、檔案不存在或格式異常時,顯示友善空態,不拋錯。
 * 地區磚與類型 chip 依資料自動產生:新增 area / category 值時不用改這支檔案;
 * 只有想指定排序時才改 AREA_ORDER / CATEGORY_ORDER(AGENTS.md §7)。
 * 篩選狀態同步到網址 ?area=&category=&q=,可分享、可重新整理。
 */

(function () {
  'use strict';

  var DATA_URL = 'data/places.json';
  var AREA_ORDER = ['馬公市', '湖西鄉', '白沙鄉', '西嶼鄉', '望安鄉', '七美鄉'];
  var CATEGORY_ORDER = ['自然風景', '遊憩', '文化', '文化資產', '生態', '藝術', '宗教廟宇', '觀光工廠', '交通場站', '國家風景區'];
  /** 地區磚說明(選填;沒列到的地區只顯示景點數,不影響運作) */
  var AREA_NOTES = {
    '馬公市': '老街、廟宇與港灣，旅程的起點',
    '湖西鄉': '奎壁山摩西分海與東海岸',
    '白沙鄉': '跨海大橋、通樑古榕與北海離島',
    '西嶼鄉': '燈塔、砲台與玄武岩海岸',
    '望安鄉': '綠蠵龜故鄉與花宅聚落',
    '七美鄉': '雙心石滬與最南端的海'
  };
  var HERO_NAME = '雙心石滬';

  var state = { area: '', category: '', q: '' };
  var allPlaces = [];

  // ---------- 工具 ----------

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** 只接受 repo 內 assets/img/ 相對路徑(AGENTS.md §3、§8) */
  function safeImageSrc(src) {
    return typeof src === 'string' && /^assets\/img\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(src) ? src : '';
  }

  function firstImage(place) {
    var imgs = place && Array.isArray(place.images) ? place.images : [];
    for (var i = 0; i < imgs.length; i++) {
      var src = safeImageSrc(imgs[i] && imgs[i].src);
      if (src) { return { src: src, credit: imgs[i].credit || '' }; }
    }
    return null;
  }

  /** credit 格式「署名(出處頁 URL)」→ 只取署名 */
  function creditName(credit) {
    return String(credit || '').replace(/[(（]https?:\/\/[^)）]*[)）]\s*$/, '').trim();
  }

  function orderedValues(places, key, preferred) {
    var seen = {};
    places.forEach(function (p) { if (p && p[key]) { seen[p[key]] = true; } });
    return Object.keys(seen).sort(function (a, b) {
      var ia = preferred.indexOf(a);
      var ib = preferred.indexOf(b);
      if (ia === -1) { ia = preferred.length; }
      if (ib === -1) { ib = preferred.length; }
      return ia - ib || a.localeCompare(b, 'zh-Hant');
    });
  }

  function renderEmpty(container, title, hint) {
    container.innerHTML =
      '<div class="empty-state">' +
      '<p class="empty-state-title">' + escapeHtml(title) + '</p>' +
      (hint ? '<p class="empty-state-hint">' + escapeHtml(hint) + '</p>' : '') +
      '</div>';
  }

  // ---------- 網址同步 ----------

  function readUrlState() {
    var params = new URLSearchParams(window.location.search);
    state.area = params.get('area') || '';
    state.category = params.get('category') || '';
    state.q = params.get('q') || '';
  }

  function writeUrlState() {
    var params = new URLSearchParams();
    if (state.area) { params.set('area', state.area); }
    if (state.category) { params.set('category', state.category); }
    if (state.q) { params.set('q', state.q); }
    var qs = params.toString();
    var url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    try { window.history.replaceState(null, '', url); } catch (e) { /* file:// 等環境略過 */ }
  }

  // ---------- 封面 ----------

  function renderHero(places) {
    var media = document.getElementById('hero-media');
    var credit = document.getElementById('hero-credit');
    var stats = document.getElementById('hero-stats');

    var heroPlace = null;
    for (var i = 0; i < places.length; i++) {
      if (places[i].name === HERO_NAME && firstImage(places[i])) { heroPlace = places[i]; break; }
    }
    if (!heroPlace) {
      for (var j = 0; j < places.length; j++) {
        if (firstImage(places[j])) { heroPlace = places[j]; break; }
      }
    }
    if (heroPlace && media) {
      var img = firstImage(heroPlace);
      media.innerHTML = '<img class="hero-img" src="' + escapeHtml(img.src) + '" alt="' + escapeHtml(heroPlace.name) + '">';
      if (credit) {
        credit.innerHTML = '封面：<a href="place.html?slug=' + encodeURIComponent(heroPlace.slug) + '">' +
          escapeHtml(heroPlace.name) + '</a> · 圖片來源：' + escapeHtml(creditName(img.credit));
      }
    }

    if (stats) {
      var photoCount = places.reduce(function (n, p) {
        return n + (Array.isArray(p.images) ? p.images.length : 0);
      }, 0);
      var items = [
        ['景點', places.length],
        ['鄉市', orderedValues(places, 'area', AREA_ORDER).length],
        ['類型', orderedValues(places, 'category', CATEGORY_ORDER).length],
        ['照片', photoCount]
      ];
      stats.innerHTML = items.map(function (it) {
        return '<div class="stat"><dt class="stat-label">' + it[0] + '</dt><dd class="stat-value">' + it[1] + '</dd></div>';
      }).join('');
    }
  }

  // ---------- 地區磚 ----------

  function renderAreas(places) {
    var grid = document.getElementById('area-grid');
    if (!grid) { return; }
    var areas = orderedValues(places, 'area', AREA_ORDER);
    grid.innerHTML = '';
    areas.forEach(function (area) {
      var inArea = places.filter(function (p) { return p.area === area; });
      var cover = null;
      for (var i = 0; i < inArea.length && !cover; i++) { cover = firstImage(inArea[i]); }
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'area-tile' + (state.area === area ? ' is-active' : '');
      btn.setAttribute('aria-pressed', state.area === area ? 'true' : 'false');
      btn.innerHTML =
        (cover ? '<img class="area-tile-img" src="' + escapeHtml(cover.src) + '" alt="" loading="lazy">' : '') +
        '<span class="area-tile-shade" aria-hidden="true"></span>' +
        '<span class="area-tile-body">' +
        '<span class="area-tile-name">' + escapeHtml(area) + '</span>' +
        (AREA_NOTES[area] ? '<span class="area-tile-note">' + escapeHtml(AREA_NOTES[area]) + '</span>' : '') +
        '<span class="area-tile-count">' + inArea.length + ' 個景點</span>' +
        '</span>';
      btn.addEventListener('click', function () {
        state.area = state.area === area ? '' : area;
        update();
        var target = document.getElementById('places');
        if (target) { target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); }
      });
      grid.appendChild(btn);
    });
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ---------- 類型 chip 列 ----------

  function renderChips(places) {
    var bar = document.getElementById('chip-bar');
    if (!bar) { return; }
    var categories = orderedValues(places, 'category', CATEGORY_ORDER);
    var html = '<div class="chip-row">';
    html += chipHtml('', '全部類型', state.category === '');
    categories.forEach(function (c) { html += chipHtml(c, c, state.category === c); });
    html += '</div>';

    var extras = '';
    if (state.area) {
      extras += '<button type="button" class="chip chip-area" data-action="clear-area" aria-label="移除地區篩選 ' +
        escapeHtml(state.area) + '">' + escapeHtml(state.area) + '<span class="chip-x" aria-hidden="true">×</span></button>';
    }
    if (state.q) {
      extras += '<button type="button" class="chip chip-area" data-action="clear-q" aria-label="移除搜尋 ' +
        escapeHtml(state.q) + '">「' + escapeHtml(state.q) + '」<span class="chip-x" aria-hidden="true">×</span></button>';
    }
    if (state.area || state.category || state.q) {
      extras += '<button type="button" class="chip-clear" data-action="clear-all">清除篩選</button>';
    }
    if (extras) { html += '<div class="chip-extras">' + extras + '</div>'; }

    bar.innerHTML = html;
    bar.hidden = false;
  }

  function chipHtml(value, label, active) {
    return '<button type="button" class="chip' + (active ? ' is-active' : '') + '" data-category="' +
      escapeHtml(value) + '" aria-pressed="' + (active ? 'true' : 'false') + '">' + escapeHtml(label) + '</button>';
  }

  function bindChips() {
    var bar = document.getElementById('chip-bar');
    if (!bar) { return; }
    bar.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button');
      if (!btn) { return; }
      var action = btn.getAttribute('data-action');
      if (action === 'clear-area') { state.area = ''; }
      else if (action === 'clear-q') { state.q = ''; syncSearchInput(); }
      else if (action === 'clear-all') { state.area = ''; state.category = ''; state.q = ''; syncSearchInput(); }
      else if (btn.hasAttribute('data-category')) { state.category = btn.getAttribute('data-category'); }
      else { return; }
      update();
    });
  }

  // ---------- 搜尋 ----------

  function syncSearchInput() {
    var input = document.getElementById('search-input');
    if (input) { input.value = state.q; }
  }

  function bindSearch() {
    var form = document.getElementById('search-form');
    var input = document.getElementById('search-input');
    if (!form || !input) { return; }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      state.q = input.value.trim();
      update();
      var target = document.getElementById('places');
      if (target) { target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); }
    });
    input.addEventListener('input', function () {
      if (input.value.trim() === '' && state.q) { state.q = ''; update(); }
    });
  }

  function matchesQuery(place, q) {
    if (!q) { return true; }
    var hay = [place.name, place.area, place.category, place.summary, place.address]
      .concat(Array.isArray(place.tags) ? place.tags : [])
      .join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (term) { return hay.indexOf(term) !== -1; });
  }

  // ---------- 卡片 ----------

  function renderCard(place) {
    var img = firstImage(place);
    var tags = Array.isArray(place.tags) ? place.tags.slice(0, 5) : [];
    var card = document.createElement('a');
    card.className = 'card';
    card.href = 'place.html?slug=' + encodeURIComponent(place.slug || '');
    card.innerHTML =
      '<div class="card-media">' +
      (img ? '<img class="card-img" src="' + escapeHtml(img.src) + '" alt="' + escapeHtml(place.name) + '" loading="lazy">'
           : '<div class="card-img card-img-empty" aria-hidden="true"></div>') +
      (place.category ? '<span class="card-badge">' + escapeHtml(place.category) + '</span>' : '') +
      '</div>' +
      '<div class="card-body">' +
      (place.area ? '<p class="card-area">' + escapeHtml(place.area) + '</p>' : '') +
      '<h3 class="card-title">' + escapeHtml(place.name) + '</h3>' +
      (place.summary ? '<p class="card-summary">' + escapeHtml(place.summary) + '</p>' : '') +
      (tags.length ? '<ul class="tag-list">' + tags.map(function (t) {
        return '<li class="tag">' + escapeHtml(t) + '</li>';
      }).join('') + '</ul>' : '') +
      '</div>';
    return card;
  }

  function renderCards(places) {
    var grid = document.getElementById('card-grid');
    var count = document.getElementById('result-count');
    if (!grid) { return; }

    var filtered = places.filter(function (p) {
      return (!state.area || p.area === state.area) &&
        (!state.category || p.category === state.category) &&
        matchesQuery(p, state.q);
    });

    if (count) {
      var scope = [state.area, state.category].filter(Boolean).join(' · ');
      count.textContent = (scope ? scope + ' · ' : '') + '共 ' + filtered.length + ' 個景點';
    }

    grid.innerHTML = '';
    if (filtered.length === 0) {
      renderEmpty(grid, '找不到符合條件的景點', '換個關鍵字，或清除篩選看看全部景點。');
      return;
    }
    var frag = document.createDocumentFragment();
    filtered.forEach(function (p) { frag.appendChild(renderCard(p)); });
    grid.appendChild(frag);
  }

  // ---------- 主流程 ----------

  function update() {
    writeUrlState();
    renderAreas(allPlaces);
    renderChips(allPlaces);
    renderCards(allPlaces);
  }

  function init() {
    var grid = document.getElementById('card-grid');
    readUrlState();
    syncSearchInput();
    bindSearch();
    bindChips();

    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) { throw new Error('資料格式不是陣列'); }
        allPlaces = data.filter(function (p) { return p && p.slug && p.name; });
        if (allPlaces.length === 0) {
          renderEmpty(grid, '目前還沒有景點資料', '資料整理中，請稍後再來。');
          return;
        }
        renderHero(allPlaces);
        update();
      })
      .catch(function () {
        renderEmpty(grid, '景點資料讀取失敗', '請透過 HTTP 開啟本站(例如 GitHub Pages,或在專案根目錄執行 python -m http.server 8000),不要直接雙擊檔案。');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
