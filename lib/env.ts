const MISSING_GEMINI_KEY_ERROR =
    'Missing Gemini API key. Set GEMINI_API_KEY in your environment.';

let cachedGeminiKey: string | null = null;

function getRequiredEnv(
    value: string | undefined | null,
    message: string,
): string {
    if (!value) {
        throw new Error(message);
    }
    return value;
}

export function getGeminiApiKey(): string {
    if (!cachedGeminiKey) {
        cachedGeminiKey = getRequiredEnv(
            process.env.GEMINI_API_KEY,
            MISSING_GEMINI_KEY_ERROR,
        );
    }
    return cachedGeminiKey;
}
