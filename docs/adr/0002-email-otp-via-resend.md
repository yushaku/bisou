# ADR 0002: Email OTP login via Resend

Status: accepted (November 2026)

## Context
Both partners open Bisou from a home screen PWA, often iOS standalone mode. Login must work without leaving the app, survive a later domain change, and stay on free tiers. Passwords are a burden for two casual users.

## Decision
Passwordless login with a 6 digit code mailed by Resend (free: 3,000 mails/month, 100/day) from `no-reply@mail.yuchi-education.com`, typed inside the app. Codes are stored as HMAC-SHA256 with `OTP_PEPPER`, expire in 10 min, allow 5 attempts, and are rate limited to 1 per 60 s and 5 per hour per email. Responses are generic (no account enumeration). Success sets a 90 day sliding `bisou_session` cookie (HttpOnly, Secure, SameSite=Lax); D1 keeps only the token's SHA-256.

## Consequences
- No redirect, so no risk of the flow escaping the standalone PWA.
- Depends on mail deliverability: SPF, DKIM and DMARC must be set on the subdomain (human step).
- An email account compromise means a Bisou compromise; acceptable for this app.
- Quota is ample because sessions last 90 days.

## Alternatives rejected
- Cloudflare Email Service: sending to arbitrary recipients needs Workers Paid (5 USD/month).
- Passkeys: bound to the domain (RP ID), so moving off `workers.dev` forces every user to re-register.
- Google OAuth: the redirect in an iOS standalone PWA can drop to Safari and lose the session.
- Magic links: opening the link launches Safari, not the installed PWA, so the session lands in the wrong cookie jar.
