# Bisou MVP

1. **Login spike on a real iPhone**
   - Goal: prove email OTP login works in a PWA installed on the home screen, before any feature work.
   - Outcome: skeleton Worker (Hono + D1) deployed on workers.dev, installable, UI in Vietnamese and English, OTP mail arrives via Resend from mail.yuchi-education.com, the session survives closing and reopening the installed app.

2. **Pairing and days counter**
   - Goal: two accounts become one couple.
   - Outcome: one partner creates a code, the other enters it, both see the same home screen with names, start date and the days-together counter.

3. **Shared journal with photos**
   - Goal: both partners write entries by day.
   - Outcome: create, edit and delete entries with text and up to a few photos (compressed on the client, stored in R2); a feed grouped by day shows both partners' entries.

4. **Milestone timeline**
   - Goal: see the big moments at a glance.
   - Outcome: an entry can be flagged as a milestone with a title and icon; a timeline view lists only milestones.

5. **Wish jar**
   - Goal: each partner keeps private wishes.
   - Outcome: add, edit and delete wishes (title, photo, price, link, priority); only the owner sees their own jar.

6. **Surprise spin and secret claim**
   - Goal: help the partner pick a gift without seeing the whole jar.
   - Outcome: enter a budget, get one random wish within it, claim it; the owner sees no sign of the claim; the claimer can see and release their claims.

7. **Wish done and celebration**
   - Goal: close the loop and keep the memory.
   - Outcome: the owner marks a wish done with a photo, a celebration plays, and a journal entry is created from it.

8. **PWA polish**
   - Goal: feels like an app on both phones.
   - Outcome: Catppuccin Latte/Frappé theme, icons, splash, cached app shell, works on iPhone and Android.
