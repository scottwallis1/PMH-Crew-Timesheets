# Google Calendar — info needed

Fill these in when ready (paste values back in chat or edit `google-config.js`):

1. **OAuth Web Client ID**
   - From Google Cloud Console → Credentials → OAuth 2.0 Client IDs
   - Looks like: `1234567890-xxxx.apps.googleusercontent.com`

2. **Site URL(s) you will use**
   - Local: `http://localhost:8080`
   - Live (example): `https://scottwallis1.github.io`

3. **Which calendar?**
   - [ ] Signed-in user's primary calendar
   - [ ] A shared team calendar (need calendar ID)

4. **What should the tab do first?**
   - [ ] Read upcoming events (started)
   - [ ] Push hours/jobs onto the calendar
   - [ ] Both

Do **not** send client secrets — this frontend only needs the public Client ID.
