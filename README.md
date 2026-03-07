# Spira Wiki

A static TTRPG wiki deployable on GitHub Pages, fed by a Discord bot.

## Structure

```
spira-wiki/
├── index.html              # Home page
├── pages/                  # Section pages
│   ├── world.html
│   ├── locations.html
│   ├── heroes.html
│   └── enemies.html
├── css/style.css           # Dark fantasy theme
├── js/app.js               # Data loader & renderer
├── data/                   # JSON data (updated by Discord bot)
│   ├── meta.json           # Site metadata + recent updates
│   ├── world.json
│   ├── locations.json
│   ├── heroes.json
│   └── enemies.json
├── images/                 # Uploaded images
├── .github/workflows/      # GitHub Actions deploy
└── PLAN.md                 # Full build plan
```

## Deployment

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Source** and select **GitHub Actions**.
3. Push to `main` — the site deploys automatically.

## Discord Bot Pipeline

The Discord bot reads channel messages, extracts structured data, and commits
updated JSON files to this repo via the GitHub API. Each commit triggers a
Pages redeploy, keeping the wiki in sync with the Discord server.

See `PLAN.md` for the full roadmap.
