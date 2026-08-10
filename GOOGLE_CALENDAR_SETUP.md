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

## Google Maps mileage (driving round trip)

Auto mileage for **open** (not fully complete) jobs uses Google Maps driving directions:

`AB42 1UA → job postcode → AB42 1UA` (out + return), rounded to the nearest mile.

Setup:

1. In the same Google Cloud project, enable **Maps JavaScript API** and **Directions API** (billing required by Google).
2. Create an **API key** → Application restrictions: **HTTP referrers**, add:
   - `http://localhost:8080/*`
   - `https://scottwallis1.github.io/*`
3. API restriction: allow **Maps JavaScript API** and **Directions API**.
4. Paste the key into `google-config.js` as `mapsApiKey`.

Closed jobs are not auto-recalculated. If the key is missing or Maps fails, the app falls back to a straight-line estimate and says so in the mileage hint.
