/**
 * admin.js — Spira Wiki browser-based content editor
 *
 * Uses the GitHub Contents API to read and commit JSON data files
 * directly from the browser. No backend required.
 *
 * Security notes:
 *  - The GitHub PAT is stored in sessionStorage only (cleared on tab close).
 *  - Use a fine-grained PAT with "Contents: Read and Write" for this repo only.
 *  - Never share your PAT or leave this page open on a shared machine.
 */

const REPO   = 'spirawb/spira-wiki';
const API    = 'https://api.github.com';
const BRANCH = 'main';

const DATA_FILES = [
  { path: 'data/pantheon.json',  label: '🏛️ Panteão' },
  { path: 'data/news.json',      label: '📰 Notícias' },
  { path: 'data/history.json',   label: '📜 História' },
  { path: 'data/world.json',     label: '🌍 Mundo' },
  { path: 'data/locations.json', label: '🗺️ Localizações' },
  { path: 'data/heroes.json',    label: '⚔️ Heróis' },
  { path: 'data/enemies.json',   label: '💀 Inimigos' },
  { path: 'data/meta.json',      label: '⚙️ Meta / Atualizações' },
];

let currentSha  = null;
let currentPath = null;

// ── Session token ────────────────────────────────────────────────────────────

function getToken() {
  return sessionStorage.getItem('gh_pat') || '';
}

function saveToken(t) {
  sessionStorage.setItem('gh_pat', t.trim());
}

// ── GitHub API helper ─────────────────────────────────────────────────────────

async function ghFetch(path, opts = {}) {
  const token = getToken();
  if (!token) throw new Error('Token GitHub em falta. Introduz o teu PAT primeiro.');

  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Erro HTTP ${res.status}`);
  }
  return res.json();
}

// ── UTF-8 safe base64 encode / decode ────────────────────────────────────────

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function b64decode(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes  = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ── UI helpers ───────────────────────────────────────────────────────────────

function setStatus(msg, type = 'info') {
  const el = document.getElementById('admin-status');
  el.textContent = msg;
  el.className   = `admin-status admin-status--${type}`;
  el.hidden      = !msg;
}

function setLoading(active) {
  document.getElementById('btn-load').disabled   = active;
  document.getElementById('btn-save').disabled   = active;
  document.getElementById('btn-format').disabled = active;
  document.getElementById('editor').readOnly     = active;
  document.getElementById('spinner').hidden      = !active;
}

// ── Load file from GitHub ─────────────────────────────────────────────────────

async function loadFile() {
  const path = document.getElementById('file-select').value;
  if (!path) { setStatus('Selecciona um ficheiro primeiro.', 'error'); return; }

  setLoading(true);
  setStatus('A carregar ficheiro do GitHub…');
  try {
    const data = await ghFetch(`/repos/${REPO}/contents/${path}?ref=${BRANCH}`);
    currentSha  = data.sha;
    currentPath = path;
    document.getElementById('editor').value = b64decode(data.content);
    setStatus(`✅ "${path}" carregado com sucesso.`, 'success');
  } catch (e) {
    setStatus(`❌ Erro ao carregar: ${e.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

// ── Save file to GitHub ───────────────────────────────────────────────────────

async function saveFile() {
  if (!currentPath) { setStatus('Carrega um ficheiro primeiro.', 'error'); return; }

  const raw = document.getElementById('editor').value;

  // Validate JSON before committing
  try {
    JSON.parse(raw);
  } catch (e) {
    setStatus(`❌ JSON inválido: ${e.message}`, 'error');
    return;
  }

  const msg = (document.getElementById('commit-msg').value.trim())
    || `Update ${currentPath} via wiki admin`;

  setLoading(true);
  setStatus('A guardar no GitHub…');
  try {
    await ghFetch(`/repos/${REPO}/contents/${currentPath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msg,
        content: b64encode(raw),
        sha:     currentSha,
        branch:  BRANCH,
      }),
    });

    setStatus('✅ Guardado! O GitHub Actions vai reimplantar o site em ~1 min.', 'success');
    document.getElementById('commit-msg').value = '';

    // Re-fetch to update the SHA (needed for next save)
    await loadFile();
  } catch (e) {
    setStatus(`❌ Erro ao guardar: ${e.message}`, 'error');
    setLoading(false);
  }
}

// ── Format JSON ───────────────────────────────────────────────────────────────

function formatJSON() {
  const editor = document.getElementById('editor');
  try {
    const parsed = JSON.parse(editor.value);
    editor.value = JSON.stringify(parsed, null, 2);
    setStatus('JSON formatado.', 'success');
  } catch (e) {
    setStatus(`❌ JSON inválido: ${e.message}`, 'error');
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Populate file selector
  const select = document.getElementById('file-select');
  DATA_FILES.forEach(f => {
    const opt = document.createElement('option');
    opt.value       = f.path;
    opt.textContent = `${f.label}  (${f.path})`;
    select.appendChild(opt);
  });

  // Restore token hint from session
  const savedToken = getToken();
  if (savedToken) {
    document.getElementById('token-input').value    = '●'.repeat(24);
    document.getElementById('token-status').textContent = '✅ Token activo nesta sessão.';
  }

  // Save token button
  document.getElementById('btn-token').addEventListener('click', () => {
    const val = document.getElementById('token-input').value.trim();
    if (!val || val.startsWith('●')) {
      setStatus('Introduz um token válido (começa com ghp_ ou github_pat_).', 'error');
      return;
    }
    saveToken(val);
    document.getElementById('token-input').value    = '●'.repeat(24);
    document.getElementById('token-status').textContent = '✅ Token guardado para esta sessão.';
    setStatus('');
  });

  // File selector change → reset editor state
  select.addEventListener('change', () => {
    currentSha  = null;
    currentPath = null;
    document.getElementById('editor').value = '';
    setStatus('');
  });

  // Action buttons
  document.getElementById('btn-load').addEventListener('click', loadFile);
  document.getElementById('btn-save').addEventListener('click', saveFile);
  document.getElementById('btn-format').addEventListener('click', formatJSON);

  // Keyboard shortcut: Ctrl+S / Cmd+S to save
  document.getElementById('editor').addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveFile();
    }
  });
});
