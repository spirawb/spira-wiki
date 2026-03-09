/**
 * app.js — Spira Wiki core loader
 *
 * Reads JSON data files and renders them into page templates.
 * This is the main integration point for the Discord bot pipeline:
 * the bot updates the JSON files in /data/, commits, and GitHub Actions
 * redeploys the static site automatically.
 */

const BASE = location.pathname.includes('/pages/') ? '../' : './';

// ── Utilities ──────────────────────────────────────────────────────────────

async function loadJSON(path) {
  // Cache-bust data files on every request so bot updates are always visible
  const res = await fetch(`${path}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function setLastUpdated(isoDate) {
  const el = document.getElementById('last-updated');
  if (!el) return;
  el.textContent = isoDate
    ? new Date(isoDate).toLocaleDateString('pt-PT', { dateStyle: 'long' })
    : '—';
}

function markActiveNav() {
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a').forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if (href === current) a.classList.add('active');
  });
}

function placeholderImg(emoji = '?') {
  return `<div class="placeholder-img">${emoji}</div>`;
}

// ── Home page ──────────────────────────────────────────────────────────────

async function loadHome() {
  try {
    const meta = await loadJSON(`${BASE}data/meta.json`);
    setLastUpdated(meta.lastUpdated);

    const list = document.getElementById('updates-list');
    if (list && meta.recentUpdates?.length) {
      list.innerHTML = meta.recentUpdates
        .map(u => `<li><strong>${u.date}</strong> — ${u.text}</li>`)
        .join('');
    }
  } catch (e) {
    console.warn('Could not load meta.json', e);
  }
}

// ── Generic entry renderer ─────────────────────────────────────────────────

function renderEntries(entries, container, iconMap = {}) {
  if (!entries?.length) {
    container.innerHTML = `<div class="empty-state">Sem entradas ainda. Começa a adicionar conteúdo!</div>`;
    return;
  }

  container.innerHTML = entries.map(entry => {
    const imgHtml = entry.image
      ? `<img src="${entry.image}" alt="${entry.name}" loading="lazy" />`
      : placeholderImg(iconMap[entry.type] || '📄');

    const tags = entry.tags?.length
      ? `<div class="tags">${entry.tags.map(t => `<span class="tag" data-tag="${t}">${t}</span>`).join('')}</div>`
      : '';

    return `
      <div class="entry-card">
        ${imgHtml}
        <div>
          <h3>${entry.name}</h3>
          ${tags}
          <p>${entry.summary || ''}</p>
        </div>
      </div>`;
  }).join('');
}

// ── News renderer ──────────────────────────────────────────────────────────

function renderNews(entries, container) {
  if (!entries?.length) {
    container.innerHTML = `<div class="empty-state">Sem notícias ainda.</div>`;
    return;
  }
  // Newest first
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  container.innerHTML = sorted.map(entry => {
    const dateStr = entry.date
      ? new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-PT', { dateStyle: 'long' })
      : '';
    const tags = entry.tags?.length
      ? `<div class="tags">${entry.tags.map(t => `<span class="tag" data-tag="${t}">${t}</span>`).join('')}</div>`
      : '';
    const imgHtml = entry.image
      ? `<img src="${entry.image}" alt="${entry.name}" class="news-img" loading="lazy" />`
      : '';
    const fullContent = entry.content
      ? `<p class="news-content">${entry.content}</p>`
      : '';

    return `
      <article class="news-card">
        ${imgHtml}
        <div class="news-body">
          <div class="news-meta">
            ${dateStr ? `<span class="news-date">📅 ${dateStr}</span>` : ''}
            ${tags}
          </div>
          <h3 class="news-title">${entry.name}</h3>
          <p class="news-summary">${entry.summary || ''}</p>
          ${fullContent}
        </div>
      </article>`;
  }).join('');
}

// ── History renderer ───────────────────────────────────────────────────────

function renderHistory(entries, container) {
  if (!entries?.length) {
    container.innerHTML = `<div class="empty-state">Sem história ainda.</div>`;
    return;
  }
  container.innerHTML = entries.map(entry => {
    // Keep data-tag spans hidden for search filtering but don't display them
    const hiddenTags = entry.tags?.length
      ? `<span hidden>${entry.tags.map(t => `<span data-tag="${t}"></span>`).join('')}</span>`
      : '';
    const events = entry.events?.length
      ? `<ul class="era-events">${entry.events.map(ev => `<li>${ev}</li>`).join('')}</ul>`
      : '';

    return `
      <div class="era-card">
        <div class="era-period">${entry.period || '???'}</div>
        <div class="era-body">
          <h3>${entry.name}</h3>
          ${hiddenTags}
          <p>${entry.summary || ''}</p>
          ${events}
        </div>
      </div>`;
  }).join('');
}

// ── Pantheon renderer ──────────────────────────────────────────────────────

function renderPantheon(entries, container) {
  if (!entries?.length) {
    container.innerHTML = `<div class="empty-state">Sem divindades ainda.</div>`;
    return;
  }

  const major = entries.filter(e => e.tier === 'major');
  const minor = entries.filter(e => e.tier === 'minor');
  const other = entries.filter(e => e.tier !== 'major' && e.tier !== 'minor');

  function renderGroup(title, gods) {
    if (!gods.length) return '';
    const cards = gods.map(deity => {
      const imgHtml = deity.image
        ? `<img src="${deity.image}" alt="${deity.name}" loading="lazy" />`
        : `<div class="placeholder-img">${deity.symbol || '🌟'}</div>`;
      const tags = deity.tags?.length
        ? `<div class="tags">${deity.tags.map(t => `<span class="tag" data-tag="${t}">${t}</span>`).join('')}</div>`
        : '';
      const meta = [
        deity.domain    ? `<span class="deity-domain">⚗️ ${deity.domain}</span>`    : '',
        deity.alignment ? `<span class="deity-alignment">⚖️ ${deity.alignment}</span>` : '',
      ].filter(Boolean).join('');

      return `
        <div class="deity-card">
          ${imgHtml}
          <div>
            <h3>${deity.name}</h3>
            ${meta ? `<div class="deity-meta">${meta}</div>` : ''}
            ${tags}
            <p>${deity.summary || ''}</p>
          </div>
        </div>`;
    }).join('');

    return `
      <details class="pantheon-group">
        <summary class="pantheon-group-title">${title}<span class="group-chevron" aria-hidden="true">▶</span></summary>
        <div class="deity-list">${cards}</div>
      </details>`;
  }

  container.innerHTML = [
    renderGroup('Divindades Maiores', major),
    renderGroup('Divindades Menores', minor),
    renderGroup('Outras Entidades', other),
  ].join('');
}

// ── Heroes renderer (grouped by status) ────────────────────────────────────

function renderHeroes(entries, container) {
  if (!entries?.length) {
    container.innerHTML = `<div class="empty-state">Sem heróis ainda.</div>`;
    return;
  }

  const active   = entries.filter(e => e.status === 'active');
  const retired  = entries.filter(e => e.status === 'retired');
  const deceased = entries.filter(e => e.status === 'deceased');

  const ICONS = { warrior: '⚔️', mage: '🧙', rogue: '🗡️', cleric: '✨' };

  function renderGroup(title, heroes) {
    if (!heroes.length) return '';
    const cards = heroes.map(entry => {
      const imgHtml = entry.image
        ? `<img src="${entry.image}" alt="${entry.name}" loading="lazy" />`
        : placeholderImg(ICONS[entry.type] || '⚔️');
      const tags = entry.tags?.length
        ? `<div class="tags">${entry.tags.map(t => `<span class="tag" data-tag="${t}">${t}</span>`).join('')}</div>`
        : '';
      return `
        <div class="entry-card">
          ${imgHtml}
          <div>
            <h3>${entry.name}</h3>
            ${tags}
            <p>${entry.summary || ''}</p>
          </div>
        </div>`;
    }).join('');

    return `
      <details class="hero-group">
        <summary class="hero-group-title">${title}<span class="group-chevron" aria-hidden="true">▶</span></summary>
        <div class="hero-group-entries">${cards}</div>
      </details>`;
  }

  container.innerHTML = [
    renderGroup('⚔️ Activos', active),
    renderGroup('🛡️ Reformados', retired),
    renderGroup('💀 Hall dos Mortos', deceased),
  ].join('');
}

// ── Search & Filter ────────────────────────────────────────────────────────
// Tag filter pills have been removed from the top bar.
// Tags on each card are clickable and activate the filter inline.
// Active tags appear as dismissible chips below the search input.

function initSearchAndFilter(entries, container, iconMap = {}, renderFn = null) {
  let searchQuery = '';
  const activeTags = new Set();

  // Build the search bar
  const bar = document.createElement('div');
  bar.className = 'search-filter-bar';
  bar.innerHTML = `
    <div class="search-input-wrap">
      <span class="search-icon">🔍</span>
      <input type="search" class="search-input"
             placeholder="Pesquisar…" autocomplete="off" spellcheck="false" />
    </div>
    <div class="active-tags-wrap" hidden></div>
    <p class="search-count" id="search-count" hidden></p>
  `;
  container.parentNode.insertBefore(bar, container);

  const activeTagsWrap = bar.querySelector('.active-tags-wrap');

  // Render the active-tag chips (only shown when tags are active)
  function renderActiveTagChips() {
    if (activeTags.size === 0) {
      activeTagsWrap.hidden = true;
      activeTagsWrap.innerHTML = '';
      return;
    }
    activeTagsWrap.hidden = false;
    activeTagsWrap.innerHTML =
      `<span class="active-tags-label">Etiqueta activa:</span>` +
      [...activeTags].map(t =>
        `<button class="active-tag-chip" data-tag="${t}">${t} ✕</button>`
      ).join('');
    activeTagsWrap.querySelectorAll('.active-tag-chip').forEach(chip => {
      chip.addEventListener('click', () => toggleTag(chip.dataset.tag));
    });
  }

  // Re-render with current filter state
  function applyFilters() {
    let filtered = entries;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.summary?.toLowerCase().includes(q) ||
        e.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    if (activeTags.size > 0) {
      filtered = filtered.filter(e =>
        [...activeTags].every(t => e.tags?.includes(t))
      );
    }

    if (renderFn) {
      renderFn(filtered, container);
    } else {
      renderEntries(filtered, container, iconMap);
    }
    attachEntryTagHandlers();

    // Update result count
    const countEl = document.getElementById('search-count');
    if (countEl) {
      const active = searchQuery || activeTags.size > 0;
      countEl.hidden = !active;
      countEl.textContent = active
        ? `${filtered.length} de ${entries.length} entrada${entries.length !== 1 ? 's' : ''}`
        : '';
    }
  }

  // Toggle a tag filter on/off
  function toggleTag(tag) {
    if (activeTags.has(tag)) {
      activeTags.delete(tag);
    } else {
      activeTags.add(tag);
    }
    renderActiveTagChips();
    applyFilters();
  }

  // Make tags on rendered entry cards clickable
  function attachEntryTagHandlers() {
    container.querySelectorAll('.tag[data-tag]').forEach(el => {
      el.addEventListener('click', () => toggleTag(el.dataset.tag));
    });
  }

  bar.querySelector('.search-input').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    applyFilters();
  });

  applyFilters(); // initial render
}

// ── Page loaders ───────────────────────────────────────────────────────────

async function loadWorld() {
  const container = document.getElementById('world-entries');
  if (!container) return;
  try {
    const data = await loadJSON(`${BASE}data/world.json`);
    setLastUpdated(data.lastUpdated);
    initSearchAndFilter(data.entries, container);
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Dados do mundo não encontrados.</div>`;
  }
}

async function loadLocations() {
  const container = document.getElementById('locations-entries');
  if (!container) return;
  const icons = { city: '🏙️', dungeon: '⛏️', wilderness: '🌲', ruin: '🏚️' };
  try {
    const data = await loadJSON(`${BASE}data/locations.json`);
    setLastUpdated(data.lastUpdated);
    initSearchAndFilter(data.entries, container, icons);
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Dados de localizações não encontrados.</div>`;
  }
}

async function loadHeroes() {
  const container = document.getElementById('heroes-entries');
  if (!container) return;
  try {
    const data = await loadJSON(`${BASE}data/heroes.json`);
    setLastUpdated(data.lastUpdated);
    initSearchAndFilter(data.entries, container, {}, renderHeroes);
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Dados de heróis não encontrados.</div>`;
  }
}

async function loadEnemies() {
  const container = document.getElementById('enemies-entries');
  if (!container) return;
  const icons = { beast: '🐉', undead: '💀', humanoid: '👹', boss: '☠️' };
  try {
    const data = await loadJSON(`${BASE}data/enemies.json`);
    setLastUpdated(data.lastUpdated);
    initSearchAndFilter(data.entries, container, icons);
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Dados de inimigos não encontrados.</div>`;
  }
}

async function loadPantheon() {
  const container = document.getElementById('pantheon-entries');
  if (!container) return;
  try {
    const data = await loadJSON(`${BASE}data/pantheon.json`);
    setLastUpdated(data.lastUpdated);
    initSearchAndFilter(data.entries, container, {}, renderPantheon);
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Dados do panteão não encontrados.</div>`;
  }
}

async function loadNews() {
  const container = document.getElementById('news-entries');
  if (!container) return;
  try {
    const data = await loadJSON(`${BASE}data/news.json`);
    setLastUpdated(data.lastUpdated);
    initSearchAndFilter(data.entries, container, {}, renderNews);
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Dados de notícias não encontrados.</div>`;
  }
}

async function loadHistory() {
  const container = document.getElementById('history-entries');
  if (!container) return;
  try {
    const data = await loadJSON(`${BASE}data/history.json`);
    setLastUpdated(data.lastUpdated);
    initSearchAndFilter(data.entries, container, {}, renderHistory);
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Dados de história não encontrados.</div>`;
  }
}

// ── Nav Search ─────────────────────────────────────────────────────────────

function initNavSearch() {
  const ul = document.querySelector('.site-nav ul');
  if (!ul) return;

  const isInPages = location.pathname.includes('/pages/');
  const searchHref = isInPages ? 'search.html' : 'pages/search.html';

  const li = document.createElement('li');
  li.style.marginLeft = 'auto';

  const form = document.createElement('form');
  form.className = 'nav-search-form';
  form.action = searchHref;
  form.method = 'get';
  form.innerHTML = `
    <input type="search" name="q" class="nav-search-input"
           placeholder="Pesquisa global…" autocomplete="off" spellcheck="false" />
    <button type="submit" class="nav-search-btn" aria-label="Pesquisar">🔍</button>
  `;
  li.appendChild(form);
  ul.appendChild(li);

  const q = new URLSearchParams(location.search).get('q');
  if (q) form.querySelector('.nav-search-input').value = q;
}

// ── Global Search ──────────────────────────────────────────────────────────

async function loadGlobalSearch() {
  const container = document.getElementById('search-results');
  if (!container) return;

  const q = new URLSearchParams(location.search).get('q')?.trim() || '';

  const heading = document.getElementById('search-heading');
  if (heading) heading.textContent = q ? `Resultados para: "${q}"` : 'Pesquisa Global';

  if (!q) {
    container.innerHTML = `<div class="empty-state">Introduz um termo na barra de pesquisa.</div>`;
    return;
  }

  container.innerHTML = `<div class="empty-state">A pesquisar…</div>`;

  const ql = q.toLowerCase();
  const sections = [
    { file: 'heroes.json',   label: '⚔️ Heróis' },
    { file: 'pantheon.json', label: '🏛️ Panteão' },
    { file: 'news.json',     label: '📰 Notícias' },
    { file: 'history.json',  label: '📜 História de Spira' },
  ];

  const results = await Promise.all(sections.map(async s => {
    try {
      const data = await loadJSON(`${BASE}data/${s.file}`);
      const matches = (data.entries || []).filter(e =>
        e.name?.toLowerCase().includes(ql) ||
        e.summary?.toLowerCase().includes(ql) ||
        e.content?.toLowerCase().includes(ql) ||
        e.tags?.some(t => t.toLowerCase().includes(ql))
      );
      return { ...s, matches };
    } catch {
      return { ...s, matches: [] };
    }
  }));

  const total = results.reduce((n, r) => n + r.matches.length, 0);

  if (total === 0) {
    container.innerHTML = `<div class="empty-state">Sem resultados para "<strong>${q}</strong>".</div>`;
    return;
  }

  container.innerHTML = results
    .filter(r => r.matches.length > 0)
    .map(r => `
      <section class="search-section">
        <h3 class="search-section-title">
          ${r.label} <span class="search-count-badge">${r.matches.length}</span>
        </h3>
        ${r.matches.map(e => `
          <div class="search-result-card">
            <strong>${e.name}</strong>
            ${e.tags?.length ? `<div class="tags">${e.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
            <p>${e.summary || ''}</p>
          </div>
        `).join('')}
      </section>
    `).join('');
}

// ── Boot ───────────────────────────────────────────────────────────────────

function _boot() {
  markActiveNav();
  initNavSearch();

  const page = location.pathname.split('/').pop() || 'index.html';
  const loaders = {
    'index.html':    loadHome,
    'world.html':    loadWorld,
    'locations.html': loadLocations,
    'heroes.html':   loadHeroes,
    'enemies.html':  loadEnemies,
    'pantheon.html': loadPantheon,
    'news.html':     loadNews,
    'history.html':  loadHistory,
    'search.html':   loadGlobalSearch,
  };

  (loaders[page] || (() => {}))();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _boot);
} else {
  _boot();
}
