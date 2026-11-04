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
In: OTP login, pairing code, days-together counter, journal entries with photos, milestone timeline, wish jar (create, budget spin, secret claim, mark done with photo, auto journal entry), installable PWA with Catppuccin theme.

Out: everything in Not Doing.

## Not Doing (and Why)
- Push notifications: setup cost on iOS PWA, revisit after 2 weeks of use.
- Comments and reactions: add only if the two of us ask for them.
- Offline editing and sync: data lives on the server, only the app shell is cached.
- End to end encryption: worth it if the app goes public, not for the MVP.
- Notion import, "two perspectives" mode, daily questions, Love Tree: later or never.
- Native app and App Store: the PWA covers both phones.
- Custom domain: workers.dev until a domain is bought.

## Decisions
- OTP mail is sent from `mail.yuchi-education.com` through Resend free.
- The UI ships in Vietnamese and English (Vietnamese default, follows the browser language, switchable in settings).
