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

// ── Search & Filter ────────────────────────────────────────────────────────

function initSearchAndFilter(entries, container, iconMap = {}) {
  // Collect all unique tags across every entry, sorted alphabetically
  const allTags = [...new Set(entries.flatMap(e => e.tags || []))].sort();

  // Mutable filter state
  let searchQuery = '';
  const activeTags = new Set();

  // Build the search bar and inject it before the entry container
  const bar = document.createElement('div');
  bar.className = 'search-filter-bar';
  bar.innerHTML = `
    <div class="search-input-wrap">
      <span class="search-icon">🔍</span>
      <input type="search" class="search-input"
             placeholder="Pesquisar…" autocomplete="off" spellcheck="false" />
    </div>
    ${allTags.length ? `
      <div class="tag-filter-wrap">
        <span class="tag-filter-label">Etiquetas:</span>
        <div class="tag-filter-pills">
          ${allTags.map(t => `<button class="tag-pill" data-tag="${t}">${t}</button>`).join('')}
        </div>
      </div>` : ''}
    <p class="search-count" id="search-count" hidden></p>
  `;
  container.parentNode.insertBefore(bar, container);

  // Re-render with current filter state
  function applyFilters() {
    let filtered = entries;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.summary?.toLowerCase().includes(q) ||
        e.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    if (activeTags.size > 0) {
      filtered = filtered.filter(e =>
        [...activeTags].every(t => e.tags?.includes(t))
      );
    }

    renderEntries(filtered, container, iconMap);
    attachEntryTagHandlers();

    // Update the result count
    const countEl = document.getElementById('search-count');
    if (countEl) {
      const active = searchQuery || activeTags.size > 0;
      countEl.hidden = !active;
      countEl.textContent = active
        ? `${filtered.length} de ${entries.length} entrada${entries.length !== 1 ? 's' : ''}`
        : '';
    }
  }

  // Toggle a tag and sync the filter bar pill state
  function toggleTag(tag) {
    const pill = bar.querySelector(`.tag-pill[data-tag="${CSS.escape(tag)}"]`);
    if (activeTags.has(tag)) {
      activeTags.delete(tag);
      pill?.classList.remove('active');
    } else {
      activeTags.add(tag);
      pill?.classList.add('active');
    }
    applyFilters();
  }

  // Make tags on rendered entry cards trigger the filter
  function attachEntryTagHandlers() {
    container.querySelectorAll('.tag[data-tag]').forEach(el => {
      el.addEventListener('click', () => toggleTag(el.dataset.tag));
    });
  }

  // Wire up the search input
  bar.querySelector('.search-input').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    applyFilters();
  });

  // Wire up the filter bar tag pills
  bar.querySelectorAll('.tag-pill').forEach(pill => {
    pill.addEventListener('click', () => toggleTag(pill.dataset.tag));
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
  const icons = { warrior: '⚔️', mage: '🧙', rogue: '🗡️', cleric: '✨' };
  try {
    const data = await loadJSON(`${BASE}data/heroes.json`);
    setLastUpdated(data.lastUpdated);
    initSearchAndFilter(data.entries, container, icons);
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

// ── Boot ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  markActiveNav();

  const page = location.pathname.split('/').pop() || 'index.html';
  const loaders = {
    'index.html': loadHome,
    'world.html':     loadWorld,
    'locations.html': loadLocations,
    'heroes.html':    loadHeroes,
    'enemies.html':   loadEnemies,
  };

  (loaders[page] || (() => {}))();
});
