# Go live — Peterhead Marquees Team Manager

## Live URL

After GitHub Pages is enabled and the deploy workflow succeeds:

**https://scottwallis1.github.io/PMH-Crew-Timesheets/**

## One-time Google Console step (required for Calendar)

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → **PMH Crew Hours Web**:

Add this **Authorized JavaScript origin** (no trailing slash):

```
https://scottwallis1.github.io
```

Save, wait about a minute, then hard-refresh the live site and use **Calendar → Connect Google Calendar**.

## Install on phones (home screen)

- **iPhone:** Safari → Share → **Add to Home Screen**
- **Android:** Chrome → menu → **Install app** / **Add to Home screen**

Icons and the web app manifest ship with the site (`assets/icons/` + `manifest.webmanifest`).

## What “live” means today

- Hours/mileage stay in each phone’s browser storage (not yet shared across devices).
- Calendar needs Google Connect on a device that will sync bookings (then cached locally).
- Mark complete writes crew hours into the matching Google Calendar event description when connected.

## Deploy

Pushes to `main` run `.github/workflows/deploy-pages.yml` and publish the repo root as a static site.
