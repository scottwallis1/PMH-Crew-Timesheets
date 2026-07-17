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

Asset cache bust: **`?v=1.8.0`**

## Clean slate (v1.8)

- All demo hour **entries** removed (storage `pm_entries_v7` starts empty)
- Demo seed hours zeroed on profiles — Crew/Profile totals only show real logged hours
- Completed-job demo state cleared (`pm_completed_jobs_v2`)
- **Calendar left intact** (Google connect + cached events unchanged)
- Demo user names / PINs kept

## What’s working

- Crew hours app: **Profile** / All Jobs / Crew (localStorage hours)
- Login: names visible; **PIN required** to open a Profile (create 4–6 digit PIN on first entry)
- **Calendar** tab:
  - Google OAuth connect (Client ID in `google-config.js`)
  - One **rolling list** of upcoming bookings
  - Colour coding: dark green if title/description mentions marquee/tent/gazebo/pagoda; purple otherwise
  - Tap booking → details
  - Events cached in `localStorage` after sync
  - **Connect** only when signed out; **Refresh Sync** while connected
- Preview URL (may expire): `https://democratic-shows-abilities-exp.trycloudflare.com`

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

1. ~~Rename Summary → Profile~~ **done (v1.4.0)**
2. ~~Per-profile PIN~~ **done (v1.4.0)** — demo still uses seeded names
3. **Self-signup onboarding (real app)** — no pre-seeded names; each person creates username + password
4. **Shared calendar (no per-user Google connect)** — crew open the app and the calendar is already there / kept up to date
5. **Owner role** — Scott is Owner and can see everyone; other users only their own Profile
6. Add Hours → select a calendar booking / job *(dropdown started in v1.5.0; refine with calendar pick if needed)*
7. Deploy to a stable host (GitHub Pages / Netlify) and lock that origin in Google Console
8. Hide Connect Google / Refresh Sync from crew Calendar UI (Owner/setup only)

## Product notes — roles (decided)

**Scott = Owner** (not Admin / Master / Moderator).

- Owner can see everyone’s Profiles / hours / crew data as needed
- Other crew are standard users: own Profile only (PIN/password protected)
- Role label in the app: **Owner**
- Scott’s avatar: Terminator-style option 3 (dark armor + gold trim)
- Alternatives considered: Admin, Master User, Moderator

Open later: whether Owner-only covers All Jobs + Crew + retire/add users, while standard users only see Profile + Calendar + Add Hours.

## Product notes — job complete + photos (decided)

**Decided**
1. **Anyone** can mark a job complete (no Owner-only gate)
2. Write crew hours into the Google Calendar entry **when marked complete**
3. **Ask for photos** when marking complete (prompt; can continue without)

**Shipped in demo (v1.7)**
- All Jobs → Mark complete → photo picker → confirm
- Photos stored in device IndexedDB; view/download on completed job cards
- On complete: PATCH calendar event description with `--- Crew hours (completed) ---` block (all crew on that job+date)
- STORE cannot be marked complete
- If Google not connected / no matching event: still completes locally and warns about calendar

**Later**
- Cloud photo storage for multi-phone sharing
- Central calendar sync (no per-phone Connect for crew)

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
