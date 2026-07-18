# Google Calendar — setup status

## Done

- [x] Google Cloud project: **PMH Time Tracker** (`pmh-time-tracker`)
- [x] Google Calendar API enabled
- [x] OAuth consent screen (External, testing) + test user `scottwallis1@googlemail.com`
- [x] OAuth Web Client: **PMH Crew Hours Web**
- [x] Client ID pasted into `google-config.js`
- [x] App reads calendar bookings into Week/Day views + detail panel
- [x] Synced events cached in browser `localStorage`

## Client ID (public — OK in frontend)

```
192280919701-dbrqmkfr8518cupi6hj5ngv0ekpbqsm4.apps.googleusercontent.com
```

Do **not** put the client secret in this app.

## Authorized JavaScript origins checklist

Add each exact origin you open the app from (no trailing slash):

- [x] `http://localhost:8080`
- [ ] `https://scottwallis1.github.io` — **add this when the live site is up** (GitHub Pages)
- [ ] Current preview tunnel URL — **must match exactly**; Cloudflare quick tunnels change when restarted

If you see `Error 400: origin_mismatch`, add the URL from the browser address bar (scheme + host only) under Authorized JavaScript origins, Save, wait ~1 minute, hard-refresh.

## Product decisions so far

- Google Calendar = source of truth for schedule
- App recreates its own calendar view for crew
- Hours stay user-entered for now
- Later: shared backend so phones share one calendar without Google login
- Later: Add Hours can pick a calendar event

## Calendar ID

- Currently: `primary` (signed-in Google account’s main calendar)
- Optional later: shared team calendar ID
