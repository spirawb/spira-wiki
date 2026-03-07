# Spira Wiki — Build Plan

A living TTRPG wiki, deployable on GitHub Pages, fed by a Discord bot.

---

## Architecture Overview

```
Discord Channel
      │
      ▼
Discord Bot (Python / Node)
      │  reads messages, parses structured content
      │  commits updates to /data/*.json
      ▼
GitHub Repository
      │  push triggers GitHub Actions
      ▼
GitHub Pages (static HTML + JS)
      │  app.js fetches /data/*.json at runtime
      ▼
Browser (the wiki)
```

---

## Phase 1 — Planning & Requirements

**Goal:** Define scope before writing code.

- [ ] Define all content types: World, Locations, Heroes, Enemies, Sessions (add more?)
- [ ] Define the JSON schema for each content type (fields, required vs optional)
- [ ] Decide on Discord bot commands / message format the bot will parse
  - Structured commands: `!wiki add hero "Name" ...`
  - Or freeform + AI parsing (e.g. GPT/Claude summarises session recaps)
- [ ] Decide on image strategy: store in `/images/` (Git LFS?) or external URLs
- [ ] Define versioning: do we keep a history of changes? (Git history is enough?)
- [ ] Identify the Discord server's channels (e.g. `#session-recap`, `#world-lore`)

---

## Phase 2 — Design

**Goal:** Visual and data design before heavy implementation.

### 2a. UI Design
- [ ] Choose a color scheme / theme (dark fantasy, parchment, etc.)
- [ ] Sketch wireframes for: Home, List pages, Detail/Entry page
- [ ] Design the entry detail page (single hero/location/enemy full view)
- [ ] Design search / filter bar for list pages
- [ ] Mobile responsiveness plan

### 2b. Data Schema Design
Define and finalize the shape of each JSON file:

```jsonc
// Example: heroes.json entry (full schema)
{
  "id": "unique-slug",
  "name": "Character Name",
  "type": "warrior | mage | rogue | cleric | ...",
  "player": "Discord username",
  "race": "Elf | Human | ...",
  "class": "Fighter | Wizard | ...",
  "level": 5,
  "status": "active | retired | dead",
  "tags": ["tag1", "tag2"],
  "summary": "Short bio shown on card",
  "description": "Full Markdown description shown on detail page",
  "image": "images/heroes/name.jpg | null",
  "sessionDebuts": ["session-01"],
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

### 2c. Discord Bot Design
- [ ] Choose bot framework: discord.py (Python) or discord.js (Node)
- [ ] Define bot commands and natural language triggers
- [ ] Design the push pipeline: bot → GitHub API (commit JSON) → Pages redeploy

---

## Phase 3 — Implementation

### 3a. Static Site — Core
- [x] Project folder structure
- [x] `index.html` — home page with cards + recent updates
- [x] `pages/world.html`, `locations.html`, `heroes.html`, `enemies.html`
- [x] `css/style.css` — dark fantasy theme
- [x] `js/app.js` — JSON loader + renderer
- [x] `data/*.json` — scaffold data files

### 3b. Static Site — Features (iteration)
- [ ] Entry detail page (`pages/entry.html?type=hero&id=slug`)
- [ ] Search / filter by tag or name
- [ ] Session log page (`pages/sessions.html`)
- [ ] Interactive world map (SVG or Leaflet.js)
- [ ] Image gallery per entry
- [ ] Markdown rendering for long descriptions (use Marked.js)
- [ ] Print / export a single entry as PDF

### 3c. GitHub Pages Deployment
- [x] `.github/workflows/deploy.yml` — deploy on push to main
- [ ] Set custom domain (optional)
- [ ] Add `404.html` fallback page

### 3d. Discord Bot
- [ ] Set up bot with required intents (message content)
- [ ] Implement `!wiki add <type> <json-payload>` command
- [ ] Implement `!wiki update <type> <id> <fields>` command
- [ ] Implement `!wiki recap` — posts session summary, bot parses it into `sessions.json`
- [ ] GitHub API integration: bot commits JSON changes via GitHub REST API
  - Uses a fine-grained GitHub PAT stored as a bot secret
  - Triggers Pages redeploy on push
- [ ] Optional: Use Claude API to extract structured data from freeform session recaps

---

## Phase 4 — Testing

- [ ] Manual: verify all pages render correctly with sample data
- [ ] Manual: verify mobile layout at 375px width
- [ ] Manual: verify Discord bot commands update JSON and site redeploys
- [ ] Manual: test with empty data (empty-state UI)
- [ ] Manual: test with many entries (performance, overflow)
- [ ] Check Lighthouse scores (accessibility, performance)
- [ ] Test 404 handling for bad entry IDs

---

## Phase 5 — Deployment & Maintenance

- [ ] Push repo to GitHub, enable GitHub Pages (Settings → Pages → Branch: main / root)
- [ ] Invite Discord bot to server with correct permissions
- [ ] Document bot commands in `#wiki-help` channel
- [ ] Set up bot hosting (Railway, Fly.io, a VPS, or a free tier)
- [ ] Write a `CONTRIBUTING.md` for players to add lore manually via PRs
- [ ] Periodic audit: remove outdated entries, fix broken images

---

## Content Types Reference

| Type      | File                   | Key Fields                                      |
|-----------|------------------------|-------------------------------------------------|
| World     | `data/world.json`      | name, type, tags, summary, description          |
| Locations | `data/locations.json`  | name, type (city/dungeon/…), region, tags       |
| Heroes    | `data/heroes.json`     | name, player, race, class, level, status        |
| Enemies   | `data/enemies.json`    | name, type (beast/undead/…), CR, defeated       |
| Sessions  | `data/sessions.json`   | number, title, date, recap, participants        |

---

## Tech Decisions

| Concern              | Decision                                        |
|----------------------|-------------------------------------------------|
| Site framework       | Vanilla HTML/CSS/JS (no build tool, easiest CI) |
| Data storage         | JSON files in the repo (`/data/`)               |
| Deployment           | GitHub Actions → GitHub Pages                   |
| Markdown rendering   | Marked.js (CDN, add when needed)                |
| Images               | `/images/` folder; Git LFS for large files      |
| Bot language         | TBD — discord.py or discord.js                  |
| Bot hosting          | TBD — Railway / Fly.io / VPS                    |
| Bot → GitHub bridge  | GitHub REST API with fine-grained PAT           |
| AI parsing (optional)| Claude API (claude-haiku-4-5 for cost)          |
