# Bisou

A private PWA for one couple: a shared journal with photos, a secret wish jar, the days counter and upcoming events, all in one place both partners open from the phone home screen.

How might two partners keep their shared story (daily moments, milestones, and the small wishes they are too shy to say out loud) in one private place?

## Decisions
- Stack on free tiers only: one Cloudflare Worker (Hono) serves the PWA and the API, D1 stores data, R2 (bucket `bisou`, private) stores photos.
- Login is a 6 digit email OTP typed in the app, with no redirect, so it works in an installed iOS PWA. Sent through Resend free (3,000 mails a month, 100 a day) from `mail.yuchi-education.com`. Locally `DEV_LOGIN_CODE` (111111) works only in development.
- One couple at a time: a user belongs to at most one couple, paired with a 6 character single-use code without look-alike characters (0/O, 1/I).
- Wish jar rebuilt from the public description of Wishlove: the partner never browses the jar, only spins within a budget and claims in secret.
- UI in Vietnamese and English (browser language, switchable). Design "Soft fabric" with peach (light) and cocoa (dark) themes; rules in [DESIGN.md](DESIGN.md).
- Runs on `bisou.levanson180200.workers.dev` until a domain is bought. Merge to `main` deploys through GitHub Actions.
- For personal use first: Wishlove (Vietnam, launched Sep 2026) already has pairing, a wish jar, a diary and a day counter. If it ever goes public, the room left is a "write separately, reveal together" daily ritual and real privacy (no ads, no tracking).

## Phase 1: MVP
- [x] **Login and pairing**
  - Goal: each partner has an account and they join one shared space.
  - Outcome: email OTP with persistent sessions, pairing code, onboarding, days counter on Home, daily cron cleanup of expired rows.
- [x] **Shared journal with photos**
  - Goal: both partners write entries by day.
  - Outcome: create, edit and delete one's own entries with text and up to a few square photos (cropped and compressed on the client, stored in R2); a feed grouped by day; full screen photo viewer.
- [x] **Wish jar**
  - Goal: each partner keeps private wishes.
  - Outcome: add, edit and delete wishes (title, photo, price, link, priority); only the owner sees their own jar; one list with an All, Wishing, Received filter.
- [x] **Surprise spin and secret claim**
  - Goal: help the partner pick a gift without seeing the whole jar.
  - Outcome: enter a budget, get one random wish within it, claim it; the owner sees no sign of the claim; the claimer sees and releases claims; an empty partner jar is said plainly.
- [x] **Wish received and celebration**
  - Goal: close the loop and keep the memory.
  - Outcome: the owner marks a wish received with a photo, a celebration plays, and a journal entry is created from it.
- [x] **App shell and settings**
  - Goal: feels like one app with clear places.
  - Outcome: bottom tab bar with a centre create button, tab names in the top bar, Settings page, Appearance page (style, mode, palette, background), language dropdown.

## Phase 2: Events and Home
- [x] **Upcoming events**
  - Goal: never miss a date that matters.
  - Outcome: yearly anniversaries, every 1,000th day, both birthdays (with age), four holidays; 3 on Home, 12 months under See all.
- [x] **Custom events**
  - Goal: add the couple's own dates.
  - Outcome: one-off or yearly events with an icon, edited by either partner; distant ones under Later.
- [x] **Profile photos**
  - Goal: see each other's face, not an initial.
  - Outcome: set, replace or remove a private avatar in Settings (up to 20 changes a day).
- [x] **Wish jars on Home**
  - Goal: feel the jars without opening the tab.
  - Outcome: both jars under the days counter; mine fills with my open wishes, my partner's only shows empty or filled; tapping opens my jar or the spin.
- [x] **Money fields and phone keyboard**
  - Goal: typing amounts and text on an iPhone feels right.
  - Outcome: amounts grouped while typing (500.000) and starting at 0; sheets no longer slide off screen when the keyboard opens.

## Phase 3: Polish and trust
- [x] **PWA polish**
  - Goal: feels like an app on both phones.
  - Outcome: splash screens, install card, Android shortcuts, offline bar, status bar following the theme ([docs/product/pwa.md](docs/product/pwa.md)).
  - [ ] Tested installed on a real iPhone and an Android phone (PO).
- [x] **Error boundary**
  - Goal: a failure never shows a white page.
  - Outcome: a root error screen with a Reload button.
- [ ] **Leave the couple, delete the account, export data**
  - Goal: each person stays in control of their data.
  - Outcome: unpair, delete the account (including `users/<id>/avatar/` in R2), download one's data. The full avatar purge on account deletion belongs here.
- [x] **Carry-over fixes**
  - Goal: clear the small debts reviews left.
  - Outcome: money paste with decimals, caret on Delete, photo purge guard, ICC cap, shared control-character regex, stale upload cleanup.

## Phase 4: Memories
- [ ] **Milestone timeline**
  - Goal: see the big moments at a glance.
  - Outcome: an entry can be flagged as a milestone with a title and icon; a timeline lists only milestones.
- [ ] **On this day**
  - Goal: bring old moments back.
  - Outcome: journal entries from the same date in past years shown on Home.
- [ ] **Time capsule letters**
  - Goal: say something for later.
  - Outcome: a letter written now stays locked until an anniversary or a chosen event.
- [ ] **Yearly recap**
  - Goal: look back together at the end of a year.
  - Outcome: a recap built from journal entries, events and received wishes.

## Phase 5: Daily connection
- [x] **Web Push**
  - Goal: the app reaches the partner without being opened.
  - Outcome: device opt-in notifications for partner journal entries and event reminders, quiet hours with batched night entries, and an installed-app invitation on Home. On iPhone it works only after Add to Home Screen; the Worker sends it, Cron Triggers are free.
- [ ] **Questions and the Garden**
  - Goal: a relationship built on understanding and respect, cared for a little every day.
  - Outcome: a daily question both answer separately and see once both answered; question sets by love stage; weekly compliments; a shared garden that grows from that care and fades gently without it.
- [ ] **Kind feedback**
  - Goal: say what could be better without hurting, after the compliment habit exists.
  - Outcome: feedback written in a guided form, opened only when the partner is ready to hear it, and counted as pruning in the garden.
- [ ] **Date jar**
  - Goal: stop "what do we do tonight".
  - Outcome: spin for a date idea, reusing the wish jar spin.

### Questions and Garden: idea one-pager (brainstorm, Nov 2026)
How might the two of us understand each other more deeply through questions grounded in relationship psychology, and say what is good and what could be better without anyone feeling attacked?

Grounding:
- Gottman Love Maps (knowing each other's inner world), the 5 to 1 ratio of positive to negative interactions, the Four Horsemen (criticism, contempt, defensiveness, stonewalling) and the softened startup.
- Aron's 36 questions: self-disclosure that deepens in layers.
- Nonviolent Communication (Rosenberg) for feedback: what I saw, how I felt, what I need, one concrete request.
- Love stages (Bader and Pearson, or Knapp) to pick the question set for where the couple is.

The garden is the mirror of care:
- Water: both answered the day's question and opened each other's answer (one answer only moistens the soil).
- Sun: compliments.
- Pruning: a guided feedback the partner marked as understood.
- Flowers: correct guesses in the Love Map quiz (guess what the partner would answer).
- Paths and benches: journal memories and milestones.
- Beauty is balance between understanding, appreciation, respect and memories, not volume.
- The garden's plants follow the love stage, so a 3 year garden looks different from a 3 month one.

Fading without punishment:
- Leaves turn after about 3 days without a shared action and droop after about 2 weeks; nothing ever dies or is lost.
- One shared answer brings most of it back.
- The garden shows only the shared state, never who neglected it (same principle as the wish jar's R10).
- Either partner can pause the garden (travel, illness, exams).

Suggested order: Web Push, then questions with compliments and the garden, then kind feedback; the Love Map quiz and a monthly talk later.

Risks:
- Feedback can turn the app into a list of grievances: a delay before sending, "ready to hear" on the receiving side, and compliments first.
- Writing about 150 to 300 good Vietnamese questions is the main cost, not code.
- Goodhart: no scores or numbers on screen; very short answers water less.
- Garden art needs layered SVG states (growth, fading, bloom): a Designer task with a G-UI.
- No AI rewriting of feedback (cost and privacy); tone hints come from simple rules.

Decisions to confirm (recommended first):
- Question source: a curated Vietnamese set reviewed by the PO; or the couple adds their own; or both.
- Rhythm: one question a day; or pick a set and answer any time.
- Feedback delivery: opened when the receiver taps "ready to hear"; or sent after a few hours' delay; or only gathered for a monthly talk.
- Old answers: kept and browsable; whether they also go into the journal.
- Fading: slow and never dies; or can wilt fully and be replanted; or no fading, only slower growth.
- Garden shape: one shared garden with plants per dimension; or one single tree; or one bed each joined into a shared garden.
- Success: for example both answer at least 4 days a week for a month.

## Market notes (Nov 2026)
What similar couple apps charge for: a daily question with answers hidden until both reply (Paired about $80 a year per couple, Agapé, SumOne), home screen widgets with the partner's photo (Locket, I Choose You, Widgetable), a shared pet or plant (SumOne, Widgetable, Cozy Couples), Between Plus (love letters, themes, longer voice and video, no ads), date idea libraries and a monthly date goal (Lovewick, Cupla), a "thumb kiss" tap (Candle, Love8), AI coaching (Connected, Lasting). Most charge one plan for both partners.

## Key assumptions
- [x] Resend free with a verified subdomain delivers OTP mails to Gmail inboxes, not spam.
- [x] iPhone photos (HEIC included) are cropped and compressed on the client fast enough.
- [ ] Email OTP login keeps the session in a PWA installed on the iPhone home screen: test on a real iPhone during PWA polish.
- [ ] Both partners keep opening the app without push notifications: use it for 2 weeks and see before building Web Push.

## Not doing (and why)
- Home screen widgets: a PWA cannot ship them.
- Forms as their own pages: after the keyboard fix the sheets behave well enough on the iPhone.
- AI coaching: cost and privacy.
- Chat: Zalo or Messenger already does it.
- Comments and reactions: only if the two of us ask for them.
- Offline editing and sync: data lives on the server, only the app shell is cached.
- End to end encryption: worth it only if the app goes public.
- Notion import and a "two perspectives" mode: later or never.
- Native app and App Store: the PWA covers both phones.
- Custom domain: workers.dev until a domain is bought.

## Open questions
- Only the two of us, or other couples later with a paid plan? This decides whether a free and paid split is needed.
- Near each other or long distance? Long distance makes Phase 5 matter more.
