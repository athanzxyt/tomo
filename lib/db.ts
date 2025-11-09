import { getSupabaseServerClient } from './supabase/server';

export type MinimalUser = {
    id: string;
    first_name: string;
    last_name: string;
    phone_e164: string;
    timezone: string;
};

type ProfileRow = Partial<Record<keyof MinimalUser, string | null>>;
type CallLogRow = {
    id: string | null;
    started_at: string | null;
    duration_sec: number | null;
    audio_url: string | null;
    transcript: string | null;
};

const PROFILE_FIELDS: Array<keyof MinimalUser> = [
    'id',
    'first_name',
    'last_name',
    'phone_e164',
    'timezone',
];

const PROFILE_COLUMNS = PROFILE_FIELDS.join(', ');

export type CallLogInput = {
    profile_id: string;
    started_at: string;
    duration_sec: number | null;
    audio_url: string;
    transcript: string;
};

export type CallLogRecord = {
    id: string;
    startedAt: string;
    durationSec: number | null;
    audioUrl: string;
    transcript: string;
};

export async function getUserByPhone(
    phoneInput: string,
): Promise<MinimalUser | null> {
    const phone = normalizePhone(phoneInput);
    return phone ? fetchProfileByPhone(phone) : null;
}

function normalizePhone(rawPhone: string): string | null {
    if (!rawPhone) {
        return null;
    }
    const trimmed = rawPhone.trim();
    if (!trimmed) {
        return null;
    }
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (!digitsOnly) {
        return null;
    }
    if (trimmed.startsWith('+')) {
        return `+${digitsOnly}`;
    }
    if (digitsOnly.startsWith('00')) {
        return `+${digitsOnly.slice(2)}`;
    }
    return `+${digitsOnly}`;
}

async function fetchProfileByPhone(phone: string): Promise<MinimalUser | null> {
    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('profiles')
            .select(PROFILE_COLUMNS)
            .eq('phone_e164', phone)
            .maybeSingle();

        if (error) {
            console.error('[db] Failed to load profile', { phone, error });
            return null;
        }

        if (!data) {
            return null;
        }

        return mapProfileRow(data as ProfileRow);
    } catch (error) {
        console.error('[db] Unexpected Supabase error', error);
        return null;
    }
}

function mapProfileRow(row: ProfileRow): MinimalUser {
    return {
        id: row.id ?? '',
        first_name: row.first_name ?? '',
        last_name: row.last_name ?? '',
        phone_e164: row.phone_e164 ?? '',
        timezone: row.timezone ?? '',
    };
}

export async function insertCallLog(log: CallLogInput): Promise<boolean> {
    try {
        const client = getSupabaseServerClient();
        const { error } = await client.from('call_logs').insert([log]);
        if (error) {
            console.error('[db] Failed to insert call log', { error });
            return false;
        }
        return true;
    } catch (error) {
        console.error('[db] Unexpected error inserting call log', error);
        return false;
    }
}

export async function getRecentCallLogs(limit = 10): Promise<CallLogRecord[]> {
    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('call_logs')
            .select('id, started_at, duration_sec, audio_url, transcript')
            .order('started_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[db] Failed to load call logs', error);
            return [];
        }

        return (
            (data as CallLogRow[] | null)?.map((row, index) => ({
                id: row.id ?? `call-${row.started_at ?? index}`,
                startedAt: row.started_at ?? new Date().toISOString(),
                durationSec: row.duration_sec ?? null,
                audioUrl: row.audio_url ?? '',
                transcript: row.transcript ?? '',
            })) ?? []
        );
    } catch (error) {
        console.error('[db] Unexpected error loading call logs', error);
        return [];
    }
}
