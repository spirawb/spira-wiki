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
  const res = await fetch(path);
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
      ? `<div class="tags">${entry.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>`
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

// ── Page loaders ───────────────────────────────────────────────────────────

async function loadWorld() {
  const container = document.getElementById('world-entries');
  if (!container) return;
  try {
    const data = await loadJSON(`${BASE}data/world.json`);
    setLastUpdated(data.lastUpdated);
    renderEntries(data.entries, container);
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
    renderEntries(data.entries, container, icons);
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
    renderEntries(data.entries, container, icons);
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
    renderEntries(data.entries, container, icons);
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
