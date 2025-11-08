# Tomo — PRD v1.2

## Key decisions

* **Name:** Tomo
* **Voice stack:** **ElevenLabs Conversational AI** (native Twilio connect)
* **Check-ins:** every **3 days at 9:00pm local time**
* **Monthly compose:** **9:00am local on the 1st** (covers previous month)
* **Calendar:** not in MVP
* **Safety:** US **988** resources; exclude that segment from memoir unless user opts in later
* **Domain:** **withtomo.tech**
* **Retention:** keep all data forever (user can delete on command)
* **Tone:** gen-z, lowercase, multi-block, friendly + respectful
* **Outbound calls:** **only after** explicit SMS "call"

---

## Technical Stack

### Backend
* **Framework:** FastAPI (Python)
* **API documentation:** Auto-generated via FastAPI/OpenAPI

### Frontend
* **Framework:** Next.js
* **Purpose:** Landing page (withtomo.tech) + shareable memoir pages (`/e/{token}`)

### Database & Storage
* **Database:** Supabase (PostgreSQL)
  * User data, moments, entries stored in PostgreSQL
  * Row-Level Security (RLS) for multi-tenancy isolation
  * pg_cron extension for timezone-aware scheduling
* **Blob storage:** Supabase Storage
  * Images (up to 10 per SMS with EXIF data preserved)
  * Audio recordings from calls
  * Built-in image transformations for optimization

### Hosting
* **Backend:** Digital Ocean App Platform
* **Frontend:** Digital Ocean (or Vercel)
* **Database:** Supabase (managed PostgreSQL + Storage)

### Integrations
* **SMS/Voice:** Twilio
* **Voice AI:** ElevenLabs Conversational AI (native Twilio integration)
* **LLM:** TBD (for memoir composition, moment extraction, quote detection)

### Scheduling
* **pg_cron** (via Supabase) for timezone-aware check-ins and monthly compose jobs

---

## Feature spec (abridged)

### Messaging (SMS/MMS)

* Receive/store texts + up to 10 images/message; EXIF + auto-caption.
* Outbound SMS style: lowercase, 1–3 short lines per message.

### Calls

* Inbound: consent → 60–120s open mic → 1–2 smart follow-ups → transcription → moments + quotes.
* Outbound: triggered **only** after user replies “call”.

### Moments

* Each interaction → `moment {occurred_at, text_clean, people[], places[], themes[], mood, quotes[], media[]}`.
* No invented facts; quotes verbatim.

### Monthly memoir page

* First-person chapter for prior month; **≤ 8 images** (LLM “most referenced” selection).
* Includes 1–3 pull-quotes, captions, title, dateline; magic-link page `/e/{token}`.

### Scheduling

* **Check-ins:** every 3 days @ **9:00pm local**; silence backoff: if two consecutive no-replies → shift to every 6 days until re-engagement.
* **Compose:** **9:00am local on the 1st**.

### Safety & consent

* First SMS: consent for storage/recording.
* Self-harm cue → send 988 info; flag content excluded from memoir until user says “ok to include”.
* Commands: `delete last`, `forget <topic>`, `pause`, `resume`, `stop`.

---

## Microcopy (ready to paste)

### Welcome (first SMS after user texts in)

```
hey, i’m tomo — your quiet biographer.
text me pics or call when you want. i’ll remember.

heads up: i store messages + recordings to write your story.
reply “yes” to continue.
```

### Consent confirmed

```
nice. i’m here whenever.
send a line or a photo when something matters.
```

### 3-day check-in (9:00pm local)

```
quick check in:
one highlight + one headache since we last talked?
pic welcome.
```

### Offer to call (always ask first)

```
want a 2-min call now?
i’ll listen + ask one follow-up.
reply “call” to start.
```

### Call greeting (spoken, ElevenLabs voice)

> “hey — it’s tomo. i’ll record this to help write your story. say ‘yes’ to continue.”
> “tell me about your last few days — one highlight, one headache, and one small detail you don’t want to forget.”

**Follow-ups (choose up to 2):**

> “when did you feel most like yourself?”
> “who showed up for you?”
> “what surprised you?”

### Post-call SMS

```
got it. i’ll write this up when your monthly chapter rolls around.
```

### Monthly delivery (9:00am on the 1st)

```
your monthly chapter is live:
{link}

want a different title? reply with a new one.
```

### Title updated

```
done. refreshed the page.
```

### Safety (self-harm cue)

```
i’m here to listen, but this sounds serious.
you matter. in the u.s., call or text 988 for immediate help.
i won’t include this part in your chapter unless you say “ok to include”.
```

### Commands help

```
commands:
delete last • forget <topic> • pause • resume • stop
```

---

## Image selection (≤ 8)

1. Score each image by: references to its time/place/subject in moments/quotes (×2), recency boost, diversity bonus.
2. Pick top-8 with per-day/theme cap.
3. Caption each: **5–12 words**, concrete, EXIF-aware.

---

## APIs (thin outline)

* `POST /sms/inbound` — Twilio webhook (store text/media; enqueue extraction)
* `POST /voice/answer` — TwiML (consent + record + optional gather)
* `POST /voice/recording` — save audio → ASR → extract → moments
* `POST /entries/compose?user_id&period=month` — compose previous month
* `GET /entries/:share_token` — returns sanitized HTML
* `POST /admin/trigger-checkin?user_id` — force 3-day check-in (demo)
* `POST /users/:id/cadence` — future flexibility (default 3 days)

---

## Schedules

* **Check-in cron (per user, TZ-aware):** every 3 days at **21:00**.
* **Compose cron (per user, TZ-aware):** **1st of month, 09:00** → previous month window.

---

## Acceptance tests (MVP)

* [ ] Text with 3 photos → stored; captions appear; monthly page shows at most 3 of them unless others are more referenced.
* [ ] Inbound call (~90s) → transcript saved; ≥1 verbatim quote pulled.
* [ ] “compose month” produces HTML ≤ 60s: title, dateline (“october 2025”), 4–7 paragraphs, 1–3 quotes, ≤8 images.
* [ ] Check-in SMS fires at **9:00pm local** every 3 days; two ignores push cadence to 6 days; a reply restores 3-day cadence.
* [ ] Outbound call only occurs after user replies “call”.
* [ ] `delete last` removes the last moment and re-compose omits it.
* [ ] Self-harm message sends 988 info and flags exclusion; “ok to include” later allows composing with that content.
* [ ] Landing page at **withtomo.tech** shows number + value prop + opt-out note.

---

## Judge-friendly QA script (10 minutes)

**Prep**

* Seed number connected; Twilio + ElevenLabs Agent wired.
* One test user in EST with a few dummy moments + 6 images in October.

**1) Text & images (2 min)**

* Send: “ran in the rain today. felt good.” + photo of shoes.
* Show admin/log: new message → moment → caption.
* (Optional) trigger “compose month” for last month; refresh page.

**2) Call (3 min)**

* Place inbound call; say 60–90s story with one quotable line (“i finally sent the email.”).
* Hang up; show transcript + captured quote.
* SMS auto-reply arrives: “got it…”

**3) Delivery (2 min)**

* Trigger monthly compose; open link from SMS:

  * Title, dateline, 4–7 paragraphs, pull-quote, gallery (≤8 images).
  * Change title via SMS; refresh page.

**4) Check-in + consented outbound (2 min)**

* Force check-in job: receive 3-day prompt at 9:00pm (mock now).
* Reply “call”; Tomo places a 2-min outbound call; show that no call occurs without explicit “call”.

**5) Safety (1 min)**

* Send a message containing a self-harm cue.
* Show immediate 988 response and that “exclude from memoir” flag is set.

---

## Landing page copy (withtomo.tech)

**Hero**

* headline: *text tomo.*
* sub: *your phone-native autobiographer. talk now, read monthly chapters forever.*
* cta: **text (###) ###-####**
* footnote: *text stop to opt out. we store messages + recordings to write your story.*

---
