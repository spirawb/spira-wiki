# spira-wiki — Claude Context

## Project Overview
Static TTRPG wiki for the **Spira** D&D 2024 campaign. Portuguese-language UI. Data is fed automatically by **spira-lorekeeper** (a Discord bot that extracts lore and commits JSON to this repo), which triggers GitHub Actions to redeploy.

**Stack:** Vanilla HTML/CSS/JavaScript · No build step · GitHub Pages
**GitHub:** https://github.com/spirawb/spira-wiki
**Live site:** https://spirawb.github.io/spira-wiki
**Dev server:** `npx serve -l 3000 .` (configured in `.claude/launch.json`)

---

## File Structure

```
spira-wiki/
├── index.html              # Home page (recent updates, nav cards)
├── pages/
│   ├── heroes.html         # Player characters grouped by status
│   ├── pantheon.html       # Deities grouped by tier
│   ├── news.html           # In-world news sorted newest-first
│   ├── history.html        # Timeline of eras and events
│   ├── search.html         # Global search results
│   ├── world.html          # World/realm info (skeleton)
│   ├── locations.html      # Locations (skeleton)
│   ├── enemies.html        # Enemies (skeleton)
│   └── admin.html          # Admin panel (stub)
├── css/
│   ├── style.css           # Main dark fantasy theme (775 lines, CSS variables)
│   └── admin.css           # Admin styles (minimal)
├── js/
│   ├── app.js              # Core loader & renderer (571 lines)
│   └── admin.js            # Admin logic (stub)
├── data/                   # JSON data files — updated by spira-lorekeeper bot
│   ├── meta.json           # Site metadata + recent updates list
│   ├── heroes.json         # ✅ Fully populated
│   ├── pantheon.json       # ✅ Fully populated
│   ├── news.json           # ✅ Fully populated
│   ├── history.json        # ✅ Fully populated
│   ├── enemies.json        # ⚠️ Skeleton only
│   ├── locations.json      # ⚠️ Skeleton only
│   └── world.json          # ⚠️ Skeleton only
├── images/                 # Uploaded images (.gitkeep)
└── .github/workflows/
    └── deploy.yml          # Auto-deploy to GitHub Pages on push to main
```

---

## Architecture

- **Pages are shells** — each HTML page just defines a container; `app.js` populates it by loading the matching JSON
- **Cache busting** — `loadJSON()` appends `?t=<timestamp>` to every fetch; GitHub Actions also injects build timestamps into HTML
- **Data pipeline:** `spira-lorekeeper` bot → commits to `/data/*.json` → GitHub Actions redeploys

## JSON Data Schema

```json
{
  "lastUpdated": "ISO timestamp",
  "entries": [
    {
      "id": "kebab-case-slug",
      "name": "Display Name",
      "type": "warrior|mage|cleric|...",
      "status": "active|retired|deceased",   // heroes only
      "tier": "major|minor",                  // pantheon only
      "tags": ["tag1", "tag2"],
      "summary": "Short description (Portuguese)",
      "image": "URL or null"
    }
  ]
}
```

---

## Design
- **Theme:** Dark fantasy with gold accents
- **CSS variables:** `--color-bg: #0f0e17`, `--color-accent: #c9a84c`, `--color-surface: #1a1828`, `--color-text: #e8e0d0`
- **Fonts:** Georgia (headings), Segoe UI (body)
- **Features:** Collapsible sections (heroes by status, pantheon by tier), clickable tag filters, per-page search + global nav search, lazy image loading

---

## Deployment
Push to `main` → GitHub Actions auto-deploys to GitHub Pages. No manual steps needed.

```bash
git add .
git commit -m "..."
git push  # triggers deploy automatically
```

---

## Status (as of 2026-03-10)
- ✅ All main pages implemented
- ✅ Search & filter (per-page + global)
- ✅ GitHub Pages deployment
- ✅ Data populated for heroes, pantheon, news, history
- ⚠️ Admin panel stubbed (not functional)
- ⚠️ enemies, locations, world pages are skeleton
