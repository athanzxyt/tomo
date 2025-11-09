import { type NextRequest, NextResponse } from 'next/server';

import { handleAssistantRequest } from './assistant-request';
import { handleEndOfCallReport } from './end-of-call-report';
import type { VapiPayload, VapiRequestBody } from './types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const message = await parseMessage(req);
    if (!message) {
        return NextResponse.json(
            { error: 'invalid payload: missing message' },
            { status: 400 },
        );
    }

    if (message.type === 'assistant-request') {
        return handleAssistantRequest(message);
    }

    if (message.type === 'end-of-call-report') {
        console.log('[vapi] end-of-call-report', message);
        return handleEndOfCallReport(message);
    }

    return NextResponse.json({ ok: true, skipped: 'ignored-type' });
}

async function parseMessage(req: NextRequest): Promise<VapiPayload | null> {
    try {
        const body = (await req.json()) as VapiRequestBody;
        return body?.message ?? null;
    } catch {
        return null;
    }
}

function isAuthorized(req: NextRequest): boolean {
    const token = process.env.VAPI_WEBHOOK_BEARER;
    if (!token) return true;
    const header = req.headers.get('authorization');
    if (!header) {
        return false;
    }
    const [scheme, value] = header.split(' ');
    if (!scheme || !value) {
        return false;
    }
    return scheme.trim().toLowerCase() === 'bearer' && value === token;
}
