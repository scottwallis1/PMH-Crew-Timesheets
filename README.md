# Peterhead Marquees — Crew Hours

Mobile-friendly crew timesheet web app for logging job hours, mileage, STORE time, and crew totals.

## What's included

- **Select team member** on every load
- **Summary** — monthly hours/mileage, add/edit/cancel entries
- **All Jobs** — month view with search; cancelled jobs greyed out; STORE entries in teal
- **Crew** — all-time leaderboard, unique robot avatars, retire (tombstone) + reinstate
- Data stored in the browser (`localStorage`) — no backend required

## Project files

```
index.html          App shell
app.js              App logic
styles.css          Brand styling
assets/
  peterhead-marquees-logo.jpg
  avatars/          Robot profile images per crew member (+ spares for new users)
```

## Run locally

From this folder:

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

Or open `index.html` directly in a browser (some browsers restrict `localStorage` on `file://`).

## Publish as a web app

This is a static site. Deploy the repo root to any static host:

### GitHub Pages
1. Merge this branch to `main`
2. Repo **Settings → Pages → Deploy from branch** → `main` / root
3. Site URL will be like `https://scottwallis1.github.io/PMH-Crew-Timesheets/`

### Netlify / Cloudflare Pages / Vercel
1. Connect the GitHub repo
2. Build command: none (leave empty)
3. Publish directory: `/` (repo root)

### Phone home screen
On iPhone/Android, open the live URL → Share / browser menu → **Add to Home Screen**.

## Notes for next steps

- Data is **per device/browser** today. Shared live data across phones needs a backend later (e.g. Supabase/Firebase).
- Demo July entries seed for Scott, Ronnie, Jason, and Kadek on first load of storage version `v6`.
- New users automatically get an unused robot avatar from the pool.
