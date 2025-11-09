# tomo landing

Minimal Next.js (App Router) site for the tomo landing page plus the Tomo and Vapi webhook.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to view the landing page. Edit `app/page.tsx` to adjust the copy or styling.

## Vapi Webhook (`POST /api/vapi`)

Vapi sends call lifecycle events to `/api/vapi`. When the payload `type` is `assistant-request`, the route responds with a transient assistant document (no wrapping object) that merges the base prompt with the per-user template.

### Authentication

Set `VAPI_WEBHOOK_BEARER` (see `.env.example`). If the env var is present, the route enforces `Authorization: Bearer <token>`; unset means auth is skipped.

### Caller identification (Supabase)

`/api/vapi` now attempts to personalize the assistant by looking up the caller in `public.profiles`:

The endpoint normalizes the inbound phone number (E.164) and matches it against `profiles.phone_e164`. Populate the columns listed in `lib/db.ts` (`first_name`, `last_name`, `phone_e164`, `timezone`) and set `SUPABASE_SERVICE_ROLE_KEY` so the server can issue Admin API queries. Missing env vars fall back to the non-personalized prompt.

### Call completion logging

When Vapi sends one of the completion events (`call-finished`, `call.completed`, or `call-ended`), the webhook looks up the corresponding profile (via phone number) and persists the record to `public.call_logs`. The following fields are written:

- `profile_id` (FK → `public.profiles.id`)
- `started_at` (ISO timestamp; defaults to the event payload time)
- `duration_sec` (best effort from the Vapi payload)
- `audio_url` (recording URL when available)
- `transcript` (flattened text transcript when provided)

When a transcript is available, we also summarize follow-up topics into `conversation_notes` so Tomo can reference them during future calls.

### Gemini conversation notes

Set `GEMINI_API_KEY` to enable the Gemini-powered summarization that populates `conversation_notes`. If this env var is missing, calls still succeed but no notes are created.

### Vapi Server URL

Point your Vapi app's Server URL to `https://<domain>/api/vapi` (or `http://localhost:3000/api/vapi` while testing).

### Example

```bash
curl -X POST http://localhost:3000/api/vapi \
  -H "Authorization: Bearer supersecrettoken" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"assistant-request",
    "call": { "from": { "phoneNumber":"+15551234567" } },
    "assistantOverrides": {
      "model": { "model": "gemini-2.5-flash-lite" },
      "voice": { "voiceId": "Hana" },
      "firstMessage": "Hello."
    }
  }'
```

Example response:

```json
{
  "updatedAt": "2025-11-08T21:27:20.293Z",
  "createdAt": "2025-11-08T06:02:25.017Z",
  "orgId": "b7d123a2-6151-4765-89bb-5c11104311de",
  "id": "4c35aaab-2d8b-4556-b753-870b8d317ef6",
  "endCallMessage": "Goodbye.",
  "voicemailMessage": "Please call back when you're available.",
  "firstMessage": "Hello.",
  "transcriber": {
    "model": "nova-2",
    "provider": "deepgram",
    "language": "en"
  },
  "name": "Tomo",
  "voice": {
    "voiceId": "Hana",
    "provider": "vapi"
  },
  "model": {
    "model": "gemini-2.5-flash-lite",
    "provider": "google",
    "messages": [
      {
        "content": "Your name is Tomo. You are a memoir writer, follower, and friend.",
        "role": "system"
      }
    ]
  }
}
```

### Notes

- DB lookups now hit Supabase directly via `getUserByPhone`; if the table or env vars are missing the webhook falls back to the generic assistant prompt so calls still succeed.
