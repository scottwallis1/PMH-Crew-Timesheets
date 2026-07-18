# Go live — step by step

Do these in order. Most are one-time clicks in your browser.

**Live URL (after Stage A):**  
https://scottwallis1.github.io/PMH-Crew-Timesheets/

---

## Stage A — Put the website online (GitHub Pages)

1. Open https://github.com/scottwallis1/PMH-Crew-Timesheets/settings/pages  
2. **Build and deployment → Source** → choose **GitHub Actions**  
3. Open https://github.com/scottwallis1/PMH-Crew-Timesheets/actions/workflows/deploy-pages.yml  
4. **Run workflow** → branch `main` → **Run workflow**  
5. Wait until it goes green  
6. Open https://scottwallis1.github.io/PMH-Crew-Timesheets/  

You should see the app. Header may say **Cloud sync off** until Stage B.

---

## Stage B — Turn on automatic cloud sync (Firebase)

Full detail: `FIREBASE_SETUP.md`. Short version:

1. Open https://console.firebase.google.com/ → create project (or add Firebase to **PMH Time Tracker**)  
2. **Authentication** → enable **Anonymous** sign-in  
3. **Firestore Database** → create (production mode, e.g. `europe-west2`)  
4. Paste these **Rules** and Publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pmhCrew/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Project overview → **Add app** → **Web** → copy `firebaseConfig`  
6. Put those values into `firebase-config.js` in the repo and push to `main`  
   (or paste them here in chat and I’ll commit/push for you)  
7. Firebase **Authentication → Settings → Authorized domains** — add:
   - `localhost`
   - `scottwallis1.github.io`  
8. Hard-refresh the live app → header should say **Cloud sync on**

After this: hours/PINs sync across phones automatically. Clearing site data no longer wipes the books.

---

## Stage C — Google Calendar on the live site

1. [Google Cloud Console](https://console.cloud.google.com/) → Credentials → **PMH Crew Hours Web**  
2. Add **Authorized JavaScript origin** (no trailing slash):

```
https://scottwallis1.github.io
```

3. Save → wait ~1 minute → live app → **Calendar → Connect Google Calendar**

---

## Stage D — Put it on crew phones

- **iPhone:** Safari → Share → **Add to Home Screen**  
- **Android:** Chrome → menu → **Install app** / **Add to Home screen**  
- PIN for everyone (demo): `0000` (change on Profile)

---

## Quick check list

| Check | What you should see |
|--------|---------------------|
| Site loads | Live URL opens the app |
| Cloud sync | Header: **Cloud sync on** |
| Hours sync | Add hours on phone A → appear on phone B |
| Survive clear | Clear site data → reopen → hours still there |
| Calendar | Connect works; bookings list loads |

---

## What’s left for later (not blocking go-live)

- Cloud sync for **job photos** (still on-device today)  
- Shared calendar without each person connecting Google  
- Tent-only app icon tweak  

---

## If something fails

- **Pages 404:** Stage A not finished / workflow not green  
- **Cloud sync off / error:** Stage B config missing or rules/domains wrong — see `FIREBASE_SETUP.md`  
- **Calendar origin_mismatch:** Stage C origin not added exactly as `https://scottwallis1.github.io`  
