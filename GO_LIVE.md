# Go live — Peterhead Marquees Team Manager

## Live URL

**https://scottwallis1.github.io/PMH-Crew-Timesheets/**

## Status

App code + icons + deploy workflow are on `main`.  
GitHub Pages must be switched on once in the repo settings (Actions cannot create the Pages site for this repo).

### 1) Enable GitHub Pages (one minute — do this now)

1. Open: https://github.com/scottwallis1/PMH-Crew-Timesheets/settings/pages  
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**  
3. Save if prompted  
4. Re-run the workflow:  
   https://github.com/scottwallis1/PMH-Crew-Timesheets/actions/workflows/deploy-pages.yml  
   → **Run workflow** → branch `main` → **Run workflow**

When it goes green, open the live URL above.

### 2) Google Calendar origin (required for Connect)

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → **PMH Crew Hours Web**:

Add this **Authorized JavaScript origin** (no trailing slash):

```
https://scottwallis1.github.io
```

Save, wait about a minute, hard-refresh the live site, then **Calendar → Connect Google Calendar**.

## Web app icon — do you need one?

**Yes for a proper phone home-screen icon** — and it’s already done.

We generated square icons from the existing Marquees logo (no new artwork needed):

| File | Use |
|------|-----|
| `assets/icons/icon-192.png` / `icon-512.png` | Android / PWA |
| `assets/icons/apple-touch-icon.png` | iPhone Add to Home Screen |
| `assets/icons/favicon.ico` (+ 16/32 PNG) | Browser tab |
| `manifest.webmanifest` | App name, theme, icons |

Optional later: a tent-only mark (no text) can look sharper at tiny sizes. Fine to ship with the full logo now.

### Install on phones

- **iPhone:** Safari → Share → **Add to Home Screen**
- **Android:** Chrome → menu → **Install app** / **Add to Home screen**

## What “live” means today

- Hours/mileage stay in each phone’s browser storage (not yet shared across devices).
- Calendar needs Google Connect on a device that will sync bookings (then cached locally).
- Mark complete writes crew hours into the matching Google Calendar event description when connected.

## Deploy

Pushes to `main` run `.github/workflows/deploy-pages.yml` and publish the static site.
