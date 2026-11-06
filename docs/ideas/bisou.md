# Bisou

## Problem Statement
How might two partners keep their shared story (daily moments, milestones, and the small wishes they are too shy to say out loud) in one private place that both can open from their phone home screen?

## Recommended Direction
A PWA for one couple at a time: each person has an account, they pair with a code, and then share three things.

1. **Shared journal**: entries by day with text and photos, written by either partner. Some entries are flagged as milestones and form a timeline. The home screen shows the days-together counter.
2. **Wish jar** (rebuilt from the public description of Wishlove): each partner keeps a private jar of wishes (title, photo, price, link, priority). The partner cannot browse the jar. Instead they enter a budget and spin, the app picks one random wish within that budget, and they can secretly claim it ("I'll make it"). The owner never sees that a wish was claimed. When the owner receives it, they mark it done with a photo, get a small celebration, and the wish becomes a journal entry automatically.
3. **Pairing**: one partner creates a 6 character code (no look-alike characters such as 0/O, 1/I), the other enters it. A user belongs to at most one couple.

The stack stays on free tiers: one Cloudflare Worker (Hono) serves the PWA and the API, D1 stores data, R2 stores photos. Login is a 6 digit email OTP typed inside the app (no redirect, so it works in an installed iOS PWA), sent through Resend free from a subdomain of yuchi-education.com. The app runs on `*.workers.dev` until a domain is bought.

Market check (Nov 2026): Wishlove (Vietnam, launched Sep 2026) already has pairing, wish jar, diary and day counter, so this MVP is for personal use first. Room left in the market, if it ever goes public: a "write separately, reveal together" daily ritual, and real privacy (no ads, no tracking).

## Key Assumptions to Validate
- [ ] Email OTP login keeps the session in a PWA installed on the iPhone home screen. Test on a real iPhone before building features.
- [ ] Resend free (3,000 mails/month, 100/day) with a verified subdomain delivers OTP mails to Gmail inboxes, not spam.
- [ ] HEIC photos from iPhone compress on the client (about 1600 px WebP) fast enough.
- [ ] Both partners actually open the app without push notifications. Use it for 2 weeks and see.

## MVP Scope
In: OTP login, pairing code, days-together counter, journal entries with photos, milestone timeline, wish jar (create, budget spin, secret claim, mark done with photo, auto journal entry), installable PWA. The approved visual direction and theme rules live in [DESIGN.md](../../DESIGN.md).

Out: everything in Not Doing.

## Not Doing (and Why)
- Push notifications: setup cost on iOS PWA, revisit after 2 weeks of use (now the first item in Next Ideas).
- Comments and reactions: add only if the two of us ask for them.
- Offline editing and sync: data lives on the server, only the app shell is cached.
- End to end encryption: worth it if the app goes public, not for the MVP.
- Notion import and "two perspectives" mode: later or never. Daily questions and the garden moved to Next Ideas.
- Native app and App Store: the PWA covers both phones.
- Custom domain: workers.dev until a domain is bought.

## Decisions
- OTP mail is sent from `mail.yuchi-education.com` through Resend free.
- The UI ships in Vietnamese and English (follows the browser language: vi for Vietnamese browsers, en otherwise; switchable in the app).

## Next Ideas (brainstorm, Nov 2026)
What similar couple apps charge for (prices from Oct 2026 comparisons): a daily question with answers hidden until both reply (Paired about $80 a year per couple, Agapé, SumOne), home screen widgets with the partner's photo or drawing (Locket, I Choose You, Widgetable), a shared pet or plant that grows with daily use (SumOne, Widgetable, Cozy Couples), Between Plus (love letters, themes, longer voice and video, no ads), date idea libraries with filters and a monthly date goal (Lovewick, Cupla), a "thumb kiss" tap that buzzes the other phone (Candle, Love8), and AI coaching for conflicts (Connected, Lasting). Most charge one plan for both partners.

Ideas for Bisou, in three directions:

- **A. Daily ritual** (what the market pays for most)
  - Daily question: write separately, reveal together once both answered. D1 is simple; the hard part is about 365 good Vietnamese questions.
  - Garden (the planned tab): a shared plant that grows from daily questions, journal entries and received wishes. Risk: a streak can turn into pressure.
- **B. Memories** (cheap, reuses existing data)
  - On this day: journal entries from the same date in past years, shown on Home.
  - Time capsule letters: written now, locked until an anniversary or a chosen event.
  - Milestone timeline and a yearly recap built from journal, events and received wishes.
- **C. Staying in touch**
  - Web Push: event reminders, "your partner wrote in the journal", and a light tap. On iPhone it works only after Add to Home Screen; the Worker can send it and Cron Triggers are free. The other ideas work better once this exists.
  - Date jar: spin for a date idea, reusing the wish jar spin.

Not worth it here: home screen widgets (a PWA cannot ship them), AI coaching (cost and privacy), chat (Zalo or Messenger already does it).

Suggested order: Web Push first, then the daily question feeding the Garden, with On this day slotted in between as a quick win.

Open questions:
- Only the two of us, or other couples later with a paid plan? This decides whether a free and paid split is needed.
- Near each other or long distance? Long distance makes direction C matter more.
