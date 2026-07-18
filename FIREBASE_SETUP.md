# Firebase cloud sync — one-time setup

This gives the app a shared live database so every phone stays up to date automatically.  
No download/backup buttons for the crew.

Use the existing Google project **PMH Time Tracker** if you like, or create a new Firebase project.

## 1) Create Firebase

1. Open https://console.firebase.google.com/
2. **Add project** (or add Firebase to `pmh-time-tracker`)
3. Disable Google Analytics if you want to keep it simple → Create

## 2) Enable the services the app uses

1. **Build → Authentication → Get started → Sign-in method**
2. Enable **Anonymous** → Save  
3. **Build → Firestore Database → Create database**
4. Start in **production mode**
5. Choose a location (e.g. `europe-west2`) → Enable

## 3) Security rules (paste exactly)

Firestore → Rules → Edit → Publish:

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

## 4) Register the web app

1. Project overview → **Add app** → **Web** (`</>`)
2. App nickname: `PMH Crew Hours`
3. Copy the `firebaseConfig` values

## 5) Paste config into the repo

Edit `firebase-config.js`:

```js
window.PMH_FIREBASE_CONFIG = {
  apiKey: "…",
  authDomain: "…",
  projectId: "…",
  storageBucket: "…",
  messagingSenderId: "…",
  appId: "…"
};
```

Commit and push to `main` (GitHub Pages will deploy).

## 6) Authorized domains

Authentication → Settings → **Authorized domains** — add:

- `localhost`
- `scottwallis1.github.io`

## 7) Check it worked

1. Open the live app
2. Header should show **Cloud sync on**
3. Add hours on one phone → they appear on another after a moment
4. Clear site data on a phone → reopen → hours come back from the cloud

## What syncs automatically

- Crew users / roles  
- Hours & mileage entries  
- PINs  
- Completed-job flags  

Still local for now: job photos (on-device only) and Google Calendar connection cache.

## Notes

- First device with data uploads it to the cloud if Firestore is empty.
- After that, the cloud is the live book every phone shares.
- Anonymous Auth is automatic — crew still use their normal name + PIN login.
