let cachedUrl: string | null = null;
let cachedAnonKey: string | null = null;
let cachedServiceRoleKey: string | null = null;

function getRequiredEnv(
    value: string | undefined | null,
    message: string,
): string {
    if (!value) {
        throw new Error(message);
    }
    return value;
}

export function getSupabaseUrl(): string {
    if (!cachedUrl) {
        cachedUrl = getRequiredEnv(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            'Missing Supabase env var NEXT_PUBLIC_SUPABASE_URL.',
        );
    }
    return cachedUrl;
}

export function getSupabaseAnonKey(): string {
    if (!cachedAnonKey) {
        cachedAnonKey = getRequiredEnv(
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            'Missing Supabase env var NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        );
    }
    return cachedAnonKey;
}

export function getSupabaseServiceRoleKey(): string {
    if (!cachedServiceRoleKey) {
        const key =
            process.env.SUPABASE_SERVICE_ROLE_KEY ??
            process.env.SUPABASE_SECRET_KEY ??
            null;
        cachedServiceRoleKey = getRequiredEnv(
            key,
            'Missing Supabase env var SUPABASE_SERVICE_ROLE_KEY.',
        );
    }
    return cachedServiceRoleKey;
}
