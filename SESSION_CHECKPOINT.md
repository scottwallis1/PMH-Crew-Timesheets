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
2. **Self-signup onboarding (real app)** — no pre-seeded names; each person opens the app, creates username + password, lands on their Profile, then uses the app. Demo name list goes away when we leave demo mode.
3. **Per-profile credentials** — names/usernames can appear where needed, but nobody can open someone else’s Profile without their password (same privacy rule as the PIN plan)
4. **Shared calendar (no per-user Google connect)** — crew open the app and the calendar is already there / kept up to date. Only a central sync (admin or backend) talks to Google; profile users do not Connect.
5. Add Hours → select a calendar booking / job
6. Deploy to a stable host (GitHub Pages / Netlify) and lock that origin in Google Console

## Product notes — calendar access (decided)

**Demo now:** someone Connects Google on a device → events cache locally on that browser.

**Real app:** calendar appears automatically for every profile. Users do **not** each do Connect Google.
- Google Calendar stays source of truth
- One central sync writes into shared storage
- All phones read that shared schedule (view-only for crew)
- Connect Google is admin/setup only, not part of normal crew onboarding

## Product notes — private profiles (decided)

**Agreed path:**

### Demo environment (now)
- Pre-seeded crew names for testing
- Next small step can still be PIN-on-existing-profiles if useful while demoing

### Real app (execute when leaving demo)
1. App ships with **no user names**
2. Each crew member opens the app on their phone
3. **Create account:** choose username + password
4. They’re taken to their **Profile** page
5. They use Add Hours / Calendar from there
6. Another person can see a username in lists later if needed, but **cannot log into that Profile without that password**

Technically doable on-device first (local accounts); for the same username/password to work across phones and keep hours private properly, pair this with shared backend storage when we leave demo.

**Action when finished in demo environment:**
1. Rename Summary → Profile
2. Replace demo name picker with **Create account / Sign in**
3. Remove pre-seeded Scott/Ronnie/… list from real onboarding
4. Password-protect Profile + Add Hours per account
5. Keep Calendar shared/viewable as decided separately

Open later: whether All Jobs / Crew stay visible to everyone; calendar stays shared/read-only; admin reset for forgotten passwords.

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
