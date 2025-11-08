export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

/**
 * Vapi will POST conversation events here.
 * On the first assistant-request event, respond with either:
 *   - { assistantId: "..." }  // saved assistant
 *   - { assistant: { ... } }  // transient assistant (inline config)
 *
 * Keep response < ~6s for reliability.
 */
export async function POST(req: NextRequest) {
    const msg = await req.json().catch(() => null);

    // TODO: verify auth header against my secret for credentialId in Vapi
    // const token = req.headers.get('authorization');

    // Only build assistant on the assistant-request message; otherwise 204.
    if (!msg || msg.type !== 'assistant-request') {
        return new NextResponse(null, { status: 204 });
    }

    // TODO: get caller info here later
    // const caller = msg.call?.from?.phoneNumber;

    const transientAssistant = {
        // High-level behavior
        name: "Tomo Transient",
        instructions:
            "You are Tomo, a concise and friendly voice agent. " +
            "Greet the caller by name if available, confirm purpose, and get to a helpful action fast.",

        // Core Vapi pipeline components (swap providers/models as needed)
        // Vapi orchestrates: transcriber -> model -> voice
        transcriber: { provider: "deepgram", model: "nova-2" },
        model: { provider: "openai", model: "gpt-4o-mini" },
        voice: { provider: "11labs", voiceId: "your-11labs-voice-id" },

        // Optional: tools the LLM can call (e.g., your own APIs)
        tools: [
            {
                name: "get_user_status",
                description: "Fetch the caller's current status from our app",
                inputSchema: { type: "object", properties: { phone: { type: "string" } }, required: ["phone"] },
                server: { // this mirrors a “custom tool” that calls back to THIS endpoint
                    // Vapi will POST a function/tool call event to your Server URL; you then respond with results
                    type: "webhook"
                }
            }
        ],

        // Optional: variables you can inject per-call (also override-able on the /call API)
        variableValues: { productName: "Tomo" },

        // Reasonable safety/latency defaults
        backchanneling: true,
        allowInterruptions: true,
        temperature: 0.5
    };

    // Respond with the transient assistant (inline)
    return NextResponse.json({ assistant: transientAssistant });
}
