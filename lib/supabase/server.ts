import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

import { getSupabaseServiceRoleKey, getSupabaseUrl } from './env';

let serverClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
    if (serverClient) {
        return serverClient;
    }

    serverClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
        auth: { persistSession: false },
    });

    return serverClient;
}
