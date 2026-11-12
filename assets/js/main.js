/**
 * main.js — 首頁景點列表 + 地區/類型篩選
 *
 * 資料:data/places.json(頂層陣列,欄位定義見 AGENTS.md §3,渲染規則見 SDD.md §3.1)。
 * 資料為空、檔案不存在或格式異常時,顯示友善空態,不拋錯。
 * 篩選鈕依資料自動產生:新增 area / category 值時不用改這支檔案(AGENTS.md §7)。
 */

(function () {
  'use strict';

  var DATA_URL = 'data/places.json';
  var AREA_ORDER = ['馬公市', '湖西鄉', '白沙鄉', '西嶼鄉', '望安鄉', '七美鄉'];
  var CATEGORY_ORDER = ['自然風景', '遊憩', '文化', '文化資產', '生態', '藝術', '宗教廟宇', '觀光工廠', '交通場站', '國家風景區'];

  var state = { area: '', category: '' };
  var allPlaces = [];

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
      '</div>';
  }

  /** 依偏好順序排列,不在清單內的值排最後(依字典序) */
  function orderedValues(places, key, preferred) {
    var seen = {};
    places.forEach(function (p) {
      if (p && p[key]) { seen[p[key]] = true; }
    });
    var values = Object.keys(seen);
    return values.sort(function (a, b) {
      var ia = preferred.indexOf(a);
      var ib = preferred.indexOf(b);
      if (ia === -1) { ia = preferred.length; }
      if (ib === -1) { ib = preferred.length; }
      return ia - ib || a.localeCompare(b, 'zh-Hant');
    });
  }

  function renderCard(place) {
    var card = document.createElement('a');
    card.className = 'place-card';
    card.href = 'place.html?slug=' + encodeURIComponent(place.slug || '');

    var meta = [];
    if (place.category) { meta.push('<strong>' + escapeHtml(place.category) + '</strong>'); }
    if (place.area) { meta.push(escapeHtml(place.area)); }

    var tags = Array.isArray(place.tags) && place.tags.length
      ? '<ul class="place-card-tags">' + place.tags.map(function (t) {
          return '<li class="tag">' + escapeHtml(t) + '</li>';
        }).join('') + '</ul>'
      : '';

    var first = Array.isArray(place.images) && place.images.length ? place.images[0] : null;
    var img = first
      ? '<img class="place-card-image" src="' + escapeHtml(first.src) + '" alt="' + escapeHtml(place.name) + '" loading="lazy">'
      : '';

    card.innerHTML =
      img +
      '<div class="place-card-body">' +
      (meta.length ? '<p class="place-card-meta">' + meta.join(' · ') + '</p>' : '') +
      '<h2 class="place-card-name">' + escapeHtml(place.name || '未命名景點') + '</h2>' +
      (place.summary ? '<p class="place-card-summary">' + escapeHtml(place.summary) + '</p>' : '') +
      tags +
      '</div>';
    return card;
  }

  function matches(place) {
    return (!state.area || place.area === state.area) &&
      (!state.category || place.category === state.category);
  }

  function syncUrl() {
    var params = new URLSearchParams();
    if (state.area) { params.set('area', state.area); }
    if (state.category) { params.set('category', state.category); }
    var query = params.toString();
    history.replaceState(null, '', query ? '?' + query : window.location.pathname);
  }

  function renderList() {
    var container = document.getElementById('place-list');
    var count = document.getElementById('result-count');
    var shown = allPlaces.filter(matches);

    if (count) { count.textContent = '共 ' + shown.length + ' 個景點'; }

    if (shown.length === 0) {
      renderStatus(container, '這個條件下還沒有景點。', '換個地區或類型看看。');
      return;
    }
    container.innerHTML = '';
    shown.forEach(function (place) {
      container.appendChild(renderCard(place));
    });
  }

  function renderFilterGroup(label, key, values) {
    var group = document.createElement('div');
    group.className = 'filter-group';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', label);

    var html = '<span class="filter-label">' + escapeHtml(label) + '</span>';
    [''].concat(values).forEach(function (value) {
      var active = state[key] === value;
      html += '<button type="button" class="filter-chip' + (active ? ' is-active' : '') +
        '" data-key="' + key + '" data-value="' + escapeHtml(value) +
        '" aria-pressed="' + active + '">' + escapeHtml(value || '全部') + '</button>';
    });
    group.innerHTML = html;
    return group;
  }

  function renderFilters() {
    var bar = document.getElementById('filter-bar');
    if (!bar) { return; }
    bar.innerHTML = '';
    bar.appendChild(renderFilterGroup('地區', 'area', orderedValues(allPlaces, 'area', AREA_ORDER)));
    bar.appendChild(renderFilterGroup('類型', 'category', orderedValues(allPlaces, 'category', CATEGORY_ORDER)));
    bar.hidden = false;
  }

  function onFilterClick(event) {
    var chip = event.target.closest('.filter-chip');
    if (!chip) { return; }
    state[chip.getAttribute('data-key')] = chip.getAttribute('data-value') || '';
    syncUrl();
    renderFilters();
    renderList();
  }

  function readUrlState() {
    var params = new URLSearchParams(window.location.search);
    state.area = params.get('area') || '';
    state.category = params.get('category') || '';
  }

  function init() {
    var container = document.getElementById('place-list');
    if (!container) { return; }
    renderStatus(container, '景點資料載入中…');

    fetch(DATA_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .then(function (data) {
        allPlaces = Array.isArray(data) ? data.filter(function (p) { return p && p.slug; }) : [];
        if (allPlaces.length === 0) {
          renderStatus(container, '景點資料整理中,敬請期待。', '本站持續收錄澎湖景點,請稍後再回來看看。');
          return;
        }
        readUrlState();
        renderFilters();
        renderList();
        var bar = document.getElementById('filter-bar');
        if (bar) { bar.addEventListener('click', onFilterClick); }
      })
      .catch(function () {
        renderStatus(container, '景點資料整理中,敬請期待。', '暫時無法讀取景點資料,請稍後再試。');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
