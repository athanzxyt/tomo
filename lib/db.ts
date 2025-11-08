export type MinimalUser = {
    id: string;
    first_name: string;
    last_name: string;
    phone_e164: string;
    timezone: string;
    tone: string;
    goals: string;
    recent_highlights: string;
    plan: string;
};

export async function getUserById(
    _userId: string,
): Promise<MinimalUser | null> {
    return null;
}

export async function getUserByPhone(
    _phoneE164: string,
): Promise<MinimalUser | null> {
    return null;
}
