# Rani Mahal — Sunday Buffet Reservations

A minimalist, mobile-first reservation system for the Sunday Lunch Special
Buffet ($15.95, by reservation only), plus a staff reservation manager and an
opt-in marketing list with CSV export. Built with React (Vite) + Vercel
serverless functions + Redis + Resend email.

## Routes

| Path         | Who       | What                                                              |
|--------------|-----------|-------------------------------------------------------------------|
| `/`          | Customers | Pick one of three Sundays, book (name, party, email, phone opt.)  |
| `/privacy`   | Public    | Privacy policy (linked from the opt-in and footer)                |
| `/staff`     | Staff     | PIN-gated: view a Sunday's bookings, mark seated, delete spam      |
| `/marketing` | Staff     | PIN-gated: opted-in contacts, search, opt-out, export CSV         |

The staff pages share one PIN (`STAFF_PIN`).

---

## Setup

### 1. Install & run locally
```bash
npm install
npm run dev      # http://localhost:3000  (front-end only)
```
The API functions run on Vercel. To run them locally too, use
`npm i -g vercel` then `vercel dev` after linking the project (step 2).

### 2. Create the Vercel project
Push this folder to a Git repo and import it at vercel.com, or run `vercel`
from this directory. Vercel auto-detects Vite (build `vite build`, output
`dist`) and turns everything in `/api` into serverless functions.

### 3. Add the database (Redis)
In the Vercel dashboard → **Storage** → **Create** → choose **Redis storage**
→ **Connect** it to this project. Vercel injects a single `REDIS_URL`
connection string automatically — you do **not** set this by hand. The code
connects to it directly with `ioredis`.

### 4. Set up email (Resend)
1. Sign up at **resend.com** (free tier is plenty to start).
2. **Domains** → add `rani-mahal.com`. Resend gives you a few DNS records
   (SPF/DKIM). Add them wherever your domain's DNS lives. Verification takes a
   few minutes to a couple of hours.
3. **API Keys** → create one → copy it into `RESEND_API_KEY`.
4. Set `FROM_EMAIL` to a verified address, e.g.
   `Rani Mahal <reservations@rani-mahal.com>`.

> **Launch-before-verified tip:** if `RESEND_API_KEY`/`FROM_EMAIL` are missing,
> bookings still succeed — the confirmation email is simply skipped, and the
> confirmation screen tells the customer to keep it for their records. So you
> can go live immediately and turn email on once DNS verifies. To test before
> your domain is ready, use Resend's sandbox sender `onboarding@resend.dev`.

### 5. Set up push notifications (optional)
The staff manager can push a notification to your phone/desktop the moment a
new reservation comes in.

1. Generate a key pair once, from this project folder:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Copy the two keys it prints into `VAPID_PUBLIC_KEY` and
   `VAPID_PRIVATE_KEY`. Set `VAPID_SUBJECT` to `mailto:` plus an email you
   control (e.g. `mailto:reservations@rani-mahal.com`) — this is required by
   the push standard so providers can contact you if something's misconfigured,
   it's never emailed to anyone.
3. Deploy. Open `/staff`, enter the PIN, and tap **Enable notifications** —
   your browser will ask for notification permission once.
4. Do this on each device/browser that should get alerts (e.g. the phone at
   the host stand). Each one registers its own subscription.

If these three vars are absent, the notification button simply doesn't
appear — bookings and the rest of the staff manager work exactly the same.

> **iPhone note:** iOS Safari only delivers web push to a site that's been
> **added to the Home Screen** (Share → Add to Home Screen) and opened from
> there at least once; a normal Safari tab won't receive them. Android Chrome
> and desktop browsers work without that step.

### 6. Environment variables
Add these in **Vercel → Project → Settings → Environment Variables**:

| Variable            | Required | Example                                     | Notes                                            |
|---------------------|----------|---------------------------------------------|--------------------------------------------------|
| `STAFF_PIN`         | Yes      | `4917`                                      | Shared PIN for `/staff` and `/marketing`         |
| `RESEND_API_KEY`    | Email    | `re_xxxx…`                                  | From Resend → API Keys                            |
| `FROM_EMAIL`        | Email    | `Rani Mahal <reservations@rani-mahal.com>`  | Must be a Resend-verified sender                  |
| `VAPID_PUBLIC_KEY`  | Push     | `BKk2T9f_...`                               | From `npx web-push generate-vapid-keys`          |
| `VAPID_PRIVATE_KEY` | Push     | `hOnFP0CT...`                               | Keep secret — server-side only                    |
| `VAPID_SUBJECT`     | Push     | `mailto:reservations@rani-mahal.com`        | Contact address required by the push standard    |
| `REDIS_URL`         | Auto     | —                                           | Injected when you connect the store in step 3    |

`.env.example` mirrors this for local development (`vercel env pull` fetches
`REDIS_URL` for `vercel dev`).

### 7. Deploy
Push to your main branch (or `vercel --prod`). Done.

---

## How the "which Sunday" logic works

All date math runs in **America/New_York**, so it's correct no matter where
the serverless function executes.

- The buffet program has a **launch floor of Sunday, September 6, 2026** — no
  Sunday before that is ever offered to customers or viewable by staff. To
  change the launch date later, edit `LAUNCH_SUNDAY` in `api/_lib/sundays.js`.
- Before **Sunday 12:00 PM ET**, this coming Sunday is bookable (right down to
  the last minute — 11:59 AM still works).
- At **12:00 PM ET** the buffet has started, so the soonest bookable date
  rolls to the **next** Sunday.
- Customers see **three** quick-pick Sundays first (each button shows the
  explicit month + day, so the date is never ambiguous), plus a **"Choose
  another date"** calendar for planning further ahead. The calendar grays out
  every day except Sundays, and further grays out anything before the earliest
  bookable date or more than a year past it (a sanity bound, not a business
  rule — raise it in `isValidBookableSunday` in `api/_lib/sundays.js` if you
  ever need to).
- The chosen date is **re-validated server-side** on submit, so a page left
  open across the cutoff can't book a past date.
- The **staff** view keeps the current week's Sunday visible even during and
  after service, so the day's list stays on screen while you're seating guests.
  Staff can also **jump to any Sunday** — past or future — via the calendar
  picker, which grays out every day except Sundays (and any Sunday before the
  launch floor).

## Data model (Redis)

- `week:{YYYY-MM-DD}` — a hash of that Sunday's reservations (field = id).
- `marketing` — a hash of opted-in contacts (field = lowercased email),
  deduplicated, with reservation count, last visit, consent timestamp, and the
  exact consent wording shown at opt-in.

## Compliance notes (email / CAN-SPAM)

- Marketing opt-in is a **separate, unchecked** checkbox and is never a
  condition of booking.
- Confirmation emails are **transactional only** (no promotions).
- The consent **timestamp and wording** are stored with each contact as a
  paper trail.
- Opted-out contacts are flagged and **excluded from the CSV export**.
- The privacy policy documents collection, opt-in, opt-out, sharing, and your
  physical mailing address.
- When you send campaigns (e.g. via Mailchimp), that platform supplies the
  required one-click unsubscribe and address footer. Keep the two lists in
  sync: honor unsubscribes back here (mark the contact opted-out) so future
  exports stay clean.

_Not legal advice — have counsel review wording for your situation._

## Exporting for campaigns

`/marketing` → **Export CSV** downloads opted-in, non-opted-out contacts with
headers Mailchimp expects (`Email Address`, `First Name`, `Last Name`, plus
`Phone`, opt-in date, last reservation, and visit count). The same file imports
cleanly into Constant Contact, Klaviyo, Squarespace, and similar tools.
