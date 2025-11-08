import { type NextRequest, NextResponse } from 'next/server';

import { getUserById, getUserByPhone, type MinimalUser } from '@/lib/db';
import { loadPrompt, renderTemplate } from '@/lib/prompt';

export const runtime = 'nodejs';

type VapiMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

type VapiAssistant = {
    endCallMessage: string;
    voicemailMessage: string;
    firstMessage: string;
    transcriber: { provider: string; model: string; language?: string };
    name: string;
    voice: { provider: string; voiceId: string };
    model: { provider: string; model: string; messages: VapiMessage[] };
};

type VapiPayload = {
    type?: string;
    call?: {
        from?: { phoneNumber?: string };
        customer?: { number?: string };
    };
    assistantOverrides?: {
        model?: { model?: string };
        voice?: { voiceId?: string };
        firstMessage?: string;
    };
    // when Vapi wraps the event: { message: VapiPayload }
    message?: VapiPayload;
};

const EMPTY_USER: MinimalUser = {
    id: '',
    first_name: '',
    last_name: '',
    phone_e164: '',
    timezone: '',
    tone: '',
    goals: '',
    recent_highlights: '',
    plan: '',
};

export async function POST(req: NextRequest) {
    // Enforce bearer secret when configured.
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- Safe parse: tolerate missing/incorrect Content-Type or empty body ---
    const raw = await req.text();
    let body: VapiPayload = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

    // Vapi often wraps payload as { message: {...} }
    const msg: VapiPayload = body.message ?? body;

    // If it's not the bootstrap event, surface what we got (don't silently 204).
    if (msg.type !== 'assistant-request') {
        return NextResponse.json(
            { error: 'unexpected message type', got: msg.type ?? null },
            { status: 400 }
        );
    }

    // Personalization currently disabled; keep EMPTY_USER.
    // const user = await _findUser(req, msg);

    // Build a generic system prompt from the base instructions only.
    const systemContent = await buildSystemPrompt(EMPTY_USER, false);

    // Assemble transient assistant (use overrides from the unwrapped message)
    const assistant = buildAssistant(systemContent, msg.assistantOverrides);

    return NextResponse.json({ assistant });
}

function isAuthorized(req: NextRequest): boolean {
    const token = process.env.VAPI_WEBHOOK_BEARER;
    if (!token) return true;
    return req.headers.get('authorization') === `Bearer ${token}`;
}

// Not used yet, but keep ready for when personalization is enabled.
async function _findUser(
    req: NextRequest,
    payload: VapiPayload,
): Promise<MinimalUser | null> {
    const userId = req.nextUrl.searchParams.get('userId');
    const phone =
        payload.call?.from?.phoneNumber ??
        payload.call?.customer?.number ??
        null;

    if (userId) {
        const byId = await getUserById(userId);
        if (byId) return byId;
    }
    return phone ? getUserByPhone(phone) : null;
}

async function buildSystemPrompt(
    user: MinimalUser,
    _hasUserContext: boolean,
): Promise<string> {
    const basePrompt = await loadPrompt('base.md');
    return renderTemplate(basePrompt, { user });
}

function buildAssistant(
    systemContent: string,
    overrides?: VapiPayload['assistantOverrides'],
): VapiAssistant {
    const assistant: VapiAssistant = {
        endCallMessage: 'Talk to you soon. Take care!',
        voicemailMessage:
            'Just wanted to check in to see how you were doing, call me back when you get a chance.',
        firstMessage: 'Hey how are you doing?',
        transcriber: {
            provider: 'deepgram',
            model: process.env.DG_MODEL || 'nova-2',
            language: 'en',
        },
        name: 'Tomo',
        voice: {
            provider: 'vapi',
            voiceId: process.env.VAPI_VOICE_ID || 'Hana',
        },
        model: {
            provider: process.env.LLM_PROVIDER || 'google',
            model: process.env.LLM_MODEL || 'gemini-2.5-flash-lite',
            messages: [{ role: 'system', content: systemContent }],
        },
    };

    if (overrides?.model?.model) assistant.model.model = overrides.model.model;
    if (overrides?.voice?.voiceId) assistant.voice.voiceId = overrides.voice.voiceId;
    if (typeof overrides?.firstMessage === 'string') assistant.firstMessage = overrides.firstMessage;

    return assistant;
}