import { getSupabaseServerClient } from './supabase/server';

export type MinimalUser = {
    id: string;
    first_name: string;
    last_name: string;
    phone_e164: string;
    timezone: string;
};

type ProfileRow = Partial<Record<keyof MinimalUser, string | null>>;

const PROFILE_FIELDS: Array<keyof MinimalUser> = [
    'id',
    'first_name',
    'last_name',
    'phone_e164',
    'timezone',
];

const PROFILE_COLUMNS = PROFILE_FIELDS.join(', ');

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

        return mapProfileRow(data);
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
