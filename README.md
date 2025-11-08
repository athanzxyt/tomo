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

- DB lookups (`getUserById`, `getUserByPhone`) are currently stubs that return `null`. The webhook is structured so a real database can be wired in later without changing the response contract.
