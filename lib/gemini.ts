import { GoogleGenerativeAI } from '@google/generative-ai';

import { getGeminiApiKey } from '@/lib/env';
import { loadPrompt } from '@/lib/prompt';

const MODEL_NAME = 'gemini-2.5-flash';
let cachedModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null =
    null;
let cachedConversationNotePrompt: string | null = null;

function getModel() {
    if (!cachedModel) {
        const client = new GoogleGenerativeAI(getGeminiApiKey());
        cachedModel = client.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 400,
            },
        });
    }
    return cachedModel;
}

export async function extractConversationNoteFromTranscript(
    transcript: string,
): Promise<string | null> {
    const trimmedTranscript = transcript?.trim();
    if (!trimmedTranscript) {
        return null;
    }

    try {
        const model = getModel();
        const prompt = await getConversationNotePrompt();
        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: `${prompt}\n\nTranscript:\n${trimmedTranscript}`,
                        },
                    ],
                },
            ],
        });

        const text = result.response.text()?.trim();
        if (!text || text.toLowerCase() === 'none') {
            return null;
        }

        return text.replace(/\n{3,}/g, '\n\n').trim();
    } catch (error) {
        console.error('[gemini] Failed to extract conversation note', error);
        return null;
    }
}

async function getConversationNotePrompt(): Promise<string> {
    if (cachedConversationNotePrompt) {
        return cachedConversationNotePrompt;
    }

    cachedConversationNotePrompt = await loadPrompt('conversation_notes.md');
    return cachedConversationNotePrompt;
}
