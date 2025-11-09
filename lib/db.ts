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
    profile_id?: string | null;
};

type CallProfileRow = {
    profile_id: string | null;
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
    profileId?: string;
};

export type ConversationNoteInput = {
    profile_id: string;
    content: string;
    call_log_id?: string | null;
};

type ConversationNoteRow = {
    content: string | null;
};

type CallTranscriptRow = {
    id: string | null;
    started_at: string | null;
    transcript: string | null;
};

type MomentRow = {
    id: string;
    period_year: number;
    period_month: number;
    summary: string;
};

export async function getUserByPhone(
    phoneInput: string,
): Promise<MinimalUser | null> {
    const phone = normalizePhone(phoneInput);
    return phone ? fetchProfileByPhone(phone) : null;
}

export type CallTranscriptRecord = {
    callLogId: string | null;
    startedAt: string;
    transcript: string;
};

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

export async function insertCallLog(
    log: CallLogInput,
): Promise<{ success: boolean; id?: string }> {
    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('call_logs')
            .insert([log])
            .select('id')
            .single();

        if (error) {
            console.error('[db] Failed to insert call log', { error });
            return { success: false };
        }

        return { success: true, id: data?.id ?? undefined };
    } catch (error) {
        console.error('[db] Unexpected error inserting call log', error);
        return { success: false };
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

export async function insertConversationNote(
    note: ConversationNoteInput,
): Promise<boolean> {
    const content = note.content?.trim();
    if (!content) {
        return false;
    }

    try {
        const client = getSupabaseServerClient();
        const { error } = await client.from('conversation_notes').insert([
            {
                profile_id: note.profile_id,
                call_log_id: note.call_log_id ?? null,
                content,
            },
        ]);

        if (error) {
            console.error('[db] Failed to insert conversation note', { error });
            return false;
        }

        return true;
    } catch (error) {
        console.error(
            '[db] Unexpected error inserting conversation note',
            error,
        );
        return false;
    }
}

export async function getRecentConversationNotes(
    profileId: string,
    limit = 3,
): Promise<string[]> {
    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('conversation_notes')
            .select('content')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[db] Failed to load conversation notes', error);
            return [];
        }

        return (
            data
                ?.map((row: ConversationNoteRow) => row.content?.trim())
                .filter((content): content is string => Boolean(content)) ?? []
        );
    } catch (error) {
        console.error(
            '[db] Unexpected error loading conversation notes',
            error,
        );
        return [];
    }
}

export async function getRecentCallTranscripts(
    profileId: string,
    limit = 2,
): Promise<CallTranscriptRecord[]> {
    if (!profileId) {
        return [];
    }

    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('call_logs')
            .select('id, started_at, transcript')
            .eq('profile_id', profileId)
            .not('transcript', 'is', null)
            .order('started_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[db] Failed to load call transcripts', error);
            return [];
        }

        const rows = (data as CallTranscriptRow[] | null) ?? [];
        return rows
            .map((row) => ({
                callLogId: row.id,
                startedAt: row.started_at ?? new Date().toISOString(),
                transcript: row.transcript ?? '',
            }))
            .filter((entry) => entry.transcript.trim());
    } catch (error) {
        console.error('[db] Unexpected error loading call transcripts', error);
        return [];
    }
}

export type MomentRecord = {
    id: string;
    period_year: number;
    period_month: number;
    summary: string;
};

export type MomentInput = {
    profile_id: string;
    call_log_id?: string | null;
    period_year: number;
    period_month: number;
    summary: string;
};

function mapMomentRows(rows: MomentRow[] | null): MomentRecord[] {
    if (!rows?.length) {
        return [];
    }

    return rows.map((row) => ({
        id: row.id,
        period_year: row.period_year,
        period_month: row.period_month,
        summary: row.summary ?? '',
    }));
}

export async function getRecentMoments(
    profileId: string,
    limit = 5,
): Promise<MomentRecord[]> {
    if (!profileId) {
        return [];
    }

    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('moments')
            .select('id, period_year, period_month, summary')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[db] Failed to load moments', error);
            return [];
        }

        const rows = (data as MomentRow[] | null) ?? [];
        return mapMomentRows(rows);
    } catch (error) {
        console.error('[db] Unexpected error loading moments', error);
        return [];
    }
}

export async function getLatestMoments(limit = 8): Promise<MomentRecord[]> {
    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('moments')
            .select('id, period_year, period_month, summary')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[db] Failed to load latest moments', error);
            return [];
        }

        return mapMomentRows((data as MomentRow[] | null) ?? []);
    } catch (error) {
        console.error('[db] Unexpected error loading latest moments', error);
        return [];
    }
}

export async function insertMoments(moments: MomentInput[]): Promise<boolean> {
    if (!moments.length) {
        return false;
    }

    const sanitized = moments
        .map((moment) => ({
            profile_id: moment.profile_id,
            call_log_id: moment.call_log_id ?? null,
            period_year: moment.period_year,
            period_month: moment.period_month,
            summary: moment.summary.trim(),
        }))
        .filter(
            (moment) =>
                moment.summary &&
                Number.isInteger(moment.period_year) &&
                Number.isInteger(moment.period_month) &&
                moment.period_year >= 2000 &&
                moment.period_year <= 2100 &&
                moment.period_month >= 1 &&
                moment.period_month <= 12,
        );

    if (!sanitized.length) {
        return false;
    }

    try {
        const client = getSupabaseServerClient();
        const { error } = await client.from('moments').insert(sanitized);
        if (error) {
            console.error('[db] Failed to insert moments', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('[db] Unexpected error inserting moments', error);
        return false;
    }
}

type EntryRow = {
    id: string | null;
    profile_id: string | null;
    period_year: number | null;
    period_month: number | null;
    title: string | null;
    body: string | null;
    created_at: string | null;
    updated_at: string | null;
};

export type EntryRecord = {
    id: string;
    profile_id: string;
    period_year: number;
    period_month: number;
    title: string;
    body: string;
    created_at: string;
    updated_at: string;
};

function mapEntryRow(row: EntryRow): EntryRecord {
    return {
        id: row.id ?? '',
        profile_id: row.profile_id ?? '',
        period_year: row.period_year ?? new Date().getUTCFullYear(),
        period_month: row.period_month ?? new Date().getUTCMonth() + 1,
        title: row.title?.trim() || 'Untitled entry',
        body: row.body ?? '',
        created_at: row.created_at ?? new Date().toISOString(),
        updated_at: row.updated_at ?? new Date().toISOString(),
    };
}

export async function getEntriesForProfile(
    profileId: string,
    limit = 24,
): Promise<EntryRecord[]> {
    if (!profileId) {
        return [];
    }

    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('entries')
            .select(
                'id, profile_id, period_year, period_month, title, body, created_at, updated_at',
            )
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[db] Failed to load entries', error);
            return [];
        }

        return ((data as EntryRow[] | null) ?? []).map(mapEntryRow);
    } catch (error) {
        console.error('[db] Unexpected error loading entries', error);
        return [];
    }
}

export async function getEntryForProfile(
    profileId: string,
    entryId: string,
): Promise<EntryRecord | null> {
    if (!profileId || !entryId) {
        return null;
    }

    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('entries')
            .select(
                'id, profile_id, period_year, period_month, title, body, created_at, updated_at',
            )
            .eq('profile_id', profileId)
            .eq('id', entryId)
            .maybeSingle();

        if (error) {
            console.error('[db] Failed to load entry', { entryId, error });
            return null;
        }

        if (!data) {
            return null;
        }

        return mapEntryRow(data as EntryRow);
    } catch (error) {
        console.error('[db] Unexpected error loading entry', error);
        return null;
    }
}

export async function getLatestEntries(limit = 24): Promise<EntryRecord[]> {
    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('entries')
            .select(
                'id, profile_id, period_year, period_month, title, body, created_at, updated_at',
            )
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[db] Failed to load latest entries', error);
            return [];
        }

        return ((data as EntryRow[] | null) ?? []).map(mapEntryRow);
    } catch (error) {
        console.error('[db] Unexpected error loading latest entries', error);
        return [];
    }
}

export async function getEntryById(
    entryId: string,
): Promise<EntryRecord | null> {
    if (!entryId) {
        return null;
    }

    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('entries')
            .select(
                'id, profile_id, period_year, period_month, title, body, created_at, updated_at',
            )
            .eq('id', entryId)
            .maybeSingle();

        if (error) {
            console.error('[db] Failed to load entry by id', {
                entryId,
                error,
            });
            return null;
        }

        if (!data) {
            return null;
        }

        return mapEntryRow(data as EntryRow);
    } catch (error) {
        console.error('[db] Unexpected error loading entry by id', error);
        return null;
    }
}

type UpsertEntryInput = {
    profile_id: string;
    period_year: number;
    period_month: number;
    title: string;
    body: string;
};

export async function upsertEntry(
    entry: UpsertEntryInput,
): Promise<EntryRecord | null> {
    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('entries')
            .upsert(entry, {
                onConflict: 'profile_id,period_year,period_month',
            })
            .select(
                'id, profile_id, period_year, period_month, title, body, created_at, updated_at',
            )
            .single();

        if (error) {
            console.error('[db] Failed to upsert entry', error);
            return null;
        }

        return mapEntryRow(data as EntryRow);
    } catch (error) {
        console.error('[db] Unexpected error upserting entry', error);
        return null;
    }
}

type UpdateEntryInput = {
    id: string;
    profile_id: string;
    title: string;
    body: string;
};

export async function updateEntryContent(
    entry: UpdateEntryInput,
): Promise<EntryRecord | null> {
    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('entries')
            .update({
                title: entry.title,
                body: entry.body,
                updated_at: new Date().toISOString(),
            })
            .eq('id', entry.id)
            .eq('profile_id', entry.profile_id)
            .select(
                'id, profile_id, period_year, period_month, title, body, created_at, updated_at',
            )
            .single();

        if (error) {
            console.error('[db] Failed to update entry', error);
            return null;
        }

        return mapEntryRow(data as EntryRow);
    } catch (error) {
        console.error('[db] Unexpected error updating entry', error);
        return null;
    }
}

export async function getLatestCallProfileId(): Promise<string | null> {
    try {
        const client = getSupabaseServerClient();
        const { data, error } = await client
            .from('call_logs')
            .select('profile_id')
            .not('profile_id', 'is', null)
            .order('started_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('[db] Failed to read latest call profile', error);
            return null;
        }

        const row = (data as CallProfileRow[] | null)?.[0];
        return row?.profile_id ?? null;
    } catch (error) {
        console.error(
            '[db] Unexpected error reading latest call profile',
            error,
        );
        return null;
    }
}
