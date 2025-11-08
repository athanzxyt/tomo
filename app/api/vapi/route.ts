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

    // Parse webhook payload; reject unknown shapes.
    const payload = (await req.json()) as VapiPayload;

    // Ignore events other than assistant requests.
    if (payload.type !== 'assistant-request') {
        return new NextResponse(null, { status: 204 });
    }

    // Personalization disabled for now: skip DB/user detection.
    // const user = await _findUser(req, payload);

    // Build a generic system prompt from the base instructions only.
    const systemContent = await buildSystemPrompt(EMPTY_USER, false);

    // Assemble transient assistant (with optional overrides).
    const assistant = buildAssistant(systemContent, payload.assistantOverrides);

    return NextResponse.json(assistant);
}

function isAuthorized(req: NextRequest): boolean {
    const token = process.env.VAPI_WEBHOOK_BEARER;
    if (!token) {
        return true;
    }

    return req.headers.get('authorization') === `Bearer ${token}`;
}

async function _findUser(
    req: NextRequest,
    payload: VapiPayload,
): Promise<MinimalUser | null> {
    // Prefer explicit userId parameter.
    const userId = req.nextUrl.searchParams.get('userId');

    // Fall back to caller phone in the Vapi payload.
    const phone =
        payload.call?.from?.phoneNumber ??
        payload.call?.customer?.number ??
        null;

    if (userId) {
        const byId = await getUserById(userId);
        if (byId) {
            return byId;
        }
    }

    return phone ? getUserByPhone(phone) : null;
}

async function buildSystemPrompt(
    user: MinimalUser,
    _hasUserContext: boolean,
): Promise<string> {
    // Personalization temporarily disabled: only load the base prompt.
    const basePrompt = await loadPrompt('base.md');

    // When ready to re-enable personalization, render user_template.md here.
    // const userPrompt = await loadPrompt('user_template.md');
    // return joinAsSystemMessage(
    //     renderTemplate(basePrompt, { user }),
    //     hasUserContext ? renderTemplate(userPrompt, { user }) : undefined,
    // );

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
        firstMessage: 'Hello.',
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
            messages: [
                {
                    role: 'system',
                    content: systemContent,
                },
            ],
        },
    };

    if (overrides?.model?.model) {
        assistant.model.model = overrides.model.model;
    }
    if (overrides?.voice?.voiceId) {
        assistant.voice.voiceId = overrides.voice.voiceId;
    }
    if (typeof overrides?.firstMessage === 'string') {
        assistant.firstMessage = overrides.firstMessage;
    }

    return assistant;
}
