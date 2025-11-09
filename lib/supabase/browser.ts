import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

import { getSupabaseAnonKey, getSupabaseUrl } from './env';

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
    if (browserClient) {
        return browserClient;
    }

    browserClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        auth: {
            persistSession: true,
            detectSessionInUrl: true,
        },
    });

    return browserClient;
}
