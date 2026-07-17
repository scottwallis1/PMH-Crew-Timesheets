# Session checkpoint — calendar pause

Saved so the next session can continue without re-discovering setup.

## Git backups

| Kind | Name | Notes |
|------|------|--------|
| Working branch | `cursor/setup-crew-hours-app-e562` | Latest calendar work |
| PR | https://github.com/scottwallis1/PMH-Crew-Timesheets/pull/1 | Base: `main` |
| Backup branch | `backup/v1.1-calendar-pause` | Same commit as this pause |
| Backup tag | `backup/crew-hours-v1.1-calendar-pause` | Annotated restore point |
| Earlier backup | `backup/crew-hours-v1.0-pre-calendar` / `backup/v1.0-pre-calendar` | Pre-calendar v1.0 |

Restore tag:

```bash
git fetch --tags
git checkout backup/crew-hours-v1.1-calendar-pause
```

## App version

Asset cache bust: **`?v=1.2.2`**

## What’s working

- Crew hours app: Summary / All Jobs / Crew (localStorage hours)
- **Calendar** tab:
  - Google OAuth connect (Client ID in `google-config.js`)
  - **Week** / **Day** boards
  - Tap booking → details (description, location, attendees, status, links)
  - Events cached in `localStorage` after sync
  - **Connect** only when signed out; **Refresh Sync** while connected
- Preview tested: Google sign-in opens (no `origin_mismatch`) when JS origin is registered

## Google Cloud (already set up)

- Project: **PMH Time Tracker** (`pmh-time-tracker`)
- OAuth client: **PMH Crew Hours Web**
- Client ID (public, in repo):  
  `192280919701-dbrqmkfr8518cupi6hj5ngv0ekpbqsm4.apps.googleusercontent.com`
- Scope: `https://www.googleapis.com/auth/calendar.events`
- Calendar: `primary`
- Test user: `scottwallis1@googlemail.com`
- Do **not** put client secrets in the frontend

Authorized JavaScript origins that matter:

- `http://localhost:8080`
- Any live preview origin in use (Cloudflare quick tunnels change each restart — add the exact `https://….trycloudflare.com` origin when the preview URL changes)
- Older Cursor ingress origins if still used (`https://p-8080-….agent.cvm.dev`)

## Preview note

Cloudflare quick-tunnel URLs are temporary. Next session: start `python3 -m http.server 8080`, create a tunnel, add the new origin in Google Console if the hostname changed, then Connect again.

## Next session priorities

1. Shared storage so all crew phones see the same synced calendar (no per-phone Google login)
2. Add Hours → select a calendar booking / job
3. Deploy to a stable host (GitHub Pages / Netlify) and lock that origin in Google Console

## Key files

```
index.html
app.js
styles.css
calendar.js
google-config.js
GOOGLE_CALENDAR_SETUP.md
README.md
SESSION_CHECKPOINT.md   (this file)
assets/
```
