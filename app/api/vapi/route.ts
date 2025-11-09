import { type NextRequest, NextResponse } from 'next/server';

import { getUserByPhone, type MinimalUser } from '@/lib/db';
import { joinAsSystemMessage, loadPrompt, renderTemplate } from '@/lib/prompt';

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
    voice: {
        model: string;
        provider: string;
        voiceId: string;
        stability?: number;
        similarityBoost?: number;
    };
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
};

export async function POST(req: NextRequest) {
    // Enforce bearer secret when configured.
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- Safe parse: tolerate missing/incorrect Content-Type or empty body ---
    const raw = await req.text();
    let body: VapiPayload = {};
    try {
        body = raw ? JSON.parse(raw) : {};
    } catch {
        body = {};
    }

    // Vapi often wraps payload as { message: {...} }
    const msg: VapiPayload = body.message ?? body;

    // If it's not the bootstrap event, surface what we got (don't silently 204).
    if (msg.type !== 'assistant-request') {
        return NextResponse.json(
            { error: 'unexpected message type', got: msg.type ?? null },
            { status: 400 },
        );
    }

    const resolvedUser = await _findUser(msg);
    console.log('Vapi route: resolved user', resolvedUser);
    const user = resolvedUser ?? EMPTY_USER;

    const hasUserContext = Boolean(resolvedUser);
    const systemContent = await buildSystemPrompt(user, hasUserContext);

    // Assemble transient assistant (use overrides from the unwrapped message)
    const assistant = buildAssistant(
        systemContent,
        msg.assistantOverrides,
        user,
        hasUserContext,
    );

    return NextResponse.json({ assistant });
}

function isAuthorized(req: NextRequest): boolean {
    const token = process.env.VAPI_WEBHOOK_BEARER;
    if (!token) return true;
    return req.headers.get('authorization') === `Bearer ${token}`;
}

// Look up the caller via the phone number present on the inbound event.
async function _findUser(payload: VapiPayload): Promise<MinimalUser | null> {
    const phone =
        payload.call?.from?.phoneNumber ??
        payload.call?.customer?.number ??
        null;

    return phone ? getUserByPhone(phone) : null;
}

async function buildSystemPrompt(
    user: MinimalUser,
    hasUserContext: boolean,
): Promise<string> {
    const basePrompt = await loadPrompt('base.md');
    const baseContent = renderTemplate(basePrompt, { user });

    if (!hasUserContext) {
        return baseContent;
    }

    const userPrompt = await loadPrompt('user_template.md');
    const userContent = renderTemplate(userPrompt, { user });
    return joinAsSystemMessage(baseContent, userContent);
}

function buildAssistant(
    systemContent: string,
    overrides?: VapiPayload['assistantOverrides'],
    user?: MinimalUser | null,
    hasUserContext?: boolean,
): VapiAssistant {
    const defaultFirstMessage = 'Hey how are you doing?';
    const firstName = user?.first_name?.trim();
    const personalizedGreeting =
        hasUserContext && firstName
            ? `Hi ${firstName}, how are you doing?`
            : null;

    const assistant: VapiAssistant = {
        endCallMessage: 'Talk to you soon. Take care!',
        voicemailMessage:
            'Just wanted to check in to see how you were doing, call me back when you get a chance.',
        firstMessage: personalizedGreeting ?? defaultFirstMessage,
        transcriber: {
            provider: 'deepgram',
            model: 'nova-2',
            language: 'en',
        },
        name: 'Tomo',
        voice: {
            model: 'eleven_flash_v2_5',
            voiceId: '56bWURjYFHyYyVf490Dp',
            provider: '11labs',
            stability: 0.70,
            similarityBoost: 0.80,
        },
        model: {
            provider: 'google',
            model: 'gemini-2.5-flash-lite',
            messages: [{ role: 'system', content: systemContent }],
        },
    };

    if (overrides?.model?.model) assistant.model.model = overrides.model.model;
    if (overrides?.voice?.voiceId)
        assistant.voice.voiceId = overrides.voice.voiceId;
    if (typeof overrides?.firstMessage === 'string')
        assistant.firstMessage = overrides.firstMessage;

    return assistant;
}
