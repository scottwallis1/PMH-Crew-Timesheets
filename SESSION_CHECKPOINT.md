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

1. **Rename Summary → Profile** (nav label + headings)
2. **Per-profile PIN** — can’t open someone else’s Profile without their PIN (agreed least-resistance privacy)
3. Shared storage so all crew phones see the same synced calendar (no per-phone Google login)
4. Add Hours → select a calendar booking / job
5. Deploy to a stable host (GitHub Pages / Netlify) and lock that origin in Google Console

## Product notes — private profiles (discussion)

**Today:** “login” is pick a name; all hours live in one browser `localStorage`. Anyone on that phone can switch user and see everyone’s Summary.

**Recommended direction (simple → real privacy):**

1. **Own phone first (lightest):** each crew member installs/opens the app on *their* phone and only uses their own profile. Privacy is mostly “my device.” Still no password. Fine for casual use; weak if phones are shared.
2. **Local PIN per profile (medium):** each profile has a PIN/password stored only on that device (hashed). Locks Profile / Add Hours for that user. Good for a shared yard tablet. Does **not** sync across phones and is not strong security.
3. **Real accounts + cloud (proper privacy):** each person creates a profile (email/password or Google Sign-In) and hours are stored on a backend (Firebase/Supabase) scoped to that user. This is what you need if Profile must stay private across devices and people.

Scott’s lean: give them the app → create profile + password → private Profile page. That maps to **(3)** once shared storage exists; until then **(2)** can bridge on a single device.

Open decisions for next session: PIN vs full password; who can see All Jobs / Crew (everyone vs managers only); whether calendar stays shared/read-only for all.

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
