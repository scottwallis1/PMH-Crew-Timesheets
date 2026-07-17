# Peterhead Marquees — Crew Hours

Mobile-friendly crew timesheet web app for logging job hours, mileage, STORE time, and crew totals.

## What's included

- **Select team member** on every load
- **Summary** — monthly hours/mileage, add/edit/cancel entries
- **All Jobs** — month view with search; cancelled jobs greyed out; STORE entries in teal
- **Crew** — all-time leaderboard, unique robot avatars, retire (tombstone) + reinstate
- **Calendar** — Google Calendar connect tab (needs your OAuth Client ID)
- Data stored in the browser (`localStorage`) — no backend required for hours

## Project files

```
index.html          App shell
app.js              App logic
styles.css          Brand styling
calendar.js         Google Calendar tab logic
google-config.js    Paste Google OAuth Client ID here
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

## Publish as a web app

Static site — deploy the repo root (GitHub Pages / Netlify / Cloudflare Pages). No build step.

## Google Calendar setup

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable **Google Calendar API**
4. Configure OAuth consent screen (add your Google account as a test user while testing)
5. Create credentials → **OAuth client ID** → Application type **Web application**
6. Authorized JavaScript origins:
   - `http://localhost:8080`
   - your live site origin
7. Paste the Client ID into `google-config.js`
8. Reload → **Calendar** tab → **Connect Google Calendar**

See `GOOGLE_CALENDAR_SETUP.md` for the checklist of values to provide.

## Notes

- Hours data is per device/browser today.
- Calendar uses Google browser OAuth (public Client ID only — no secrets in the app).
- Demo July entries seed on first load of storage `v6`.
