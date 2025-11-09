import { GoogleGenerativeAI } from '@google/generative-ai';

import {
    getRecentCallTranscripts,
    getRecentMoments,
    insertConversationNote,
    insertMoments,
} from '@/lib/db';
import { getGeminiApiKey } from '@/lib/env';
import { loadPrompt } from '@/lib/prompt';

const MODEL_NAME = 'gemini-2.5-flash';
const MAX_NOTE_TRANSCRIPT_CHARS = 2000;
const MAX_MOMENT_TRANSCRIPT_CHARS = 2500;
let cachedModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null =
    null;
let cachedConversationNotePrompt: string | null = null;
let cachedMomentsPrompt: string | null = null;

type GenerateResponse = Awaited<
    ReturnType<ReturnType<typeof getModel>['generateContent']>
>['response'];

function getModel() {
    if (!cachedModel) {
        const client = new GoogleGenerativeAI(getGeminiApiKey());
        cachedModel = client.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 16000,
            },
        });
    }
    return cachedModel;
}

export type CreateConversationNoteParams = {
    profileId: string;
    callLogId?: string;
    transcript: string;
};

export async function createConversationNoteFromTranscript({
    profileId,
    callLogId,
    transcript,
}: CreateConversationNoteParams): Promise<boolean> {
    const trimmedTranscript = transcript?.trim();
    if (!profileId || !trimmedTranscript) {
        return false;
    }

    const truncatedTranscript = truncateText(
        trimmedTranscript,
        MAX_NOTE_TRANSCRIPT_CHARS,
    );

    const content =
        await extractConversationNoteFromTranscript(truncatedTranscript);
    if (!content) {
        console.log('[memory] Conversation note skipped: empty content', {
            profileId,
            callLogId,
        });
        return false;
    }

    const saved = await insertConversationNote({
        profile_id: profileId,
        call_log_id: callLogId ?? null,
        content,
    });
    console.log('[memory] Conversation note result', {
        profileId,
        callLogId,
        saved,
        preview: content.slice(0, 120),
    });
    return saved;
}

async function extractConversationNoteFromTranscript(
    transcript: string,
): Promise<string | null> {
    try {
        const model = getModel();
        const prompt = await getConversationNotePrompt();
        console.log('[memory] Conversation note LLM input', {
            promptPreview: prompt.slice(0, 200),
            transcriptPreview: transcript.slice(0, 200),
            transcriptLength: transcript.length,
        });
        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: `${prompt}\n\nTranscript:\n${transcript}`,
                        },
                    ],
                },
            ],
        });

        console.log('[memory] Moments LLM raw response', {
            response: JSON.parse(JSON.stringify(result.response)),
        });
        const text = resolveResponseText(result.response);
        console.log('[memory] Conversation note LLM output', {
            textPreview: text?.slice(0, 200) ?? null,
            hasText: Boolean(text),
            candidatesLength: result.response.candidates?.length ?? 0,
            promptFeedback: result.response.promptFeedback ?? null,
            finishReasons: result.response.candidates?.map(
                (candidate) => candidate.finishReason,
            ),
        });
        if (!text) {
            console.log('[memory] Conversation note raw candidates', {
                candidates: result.response.candidates ?? null,
            });
        }
        if (!text || text.toLowerCase() === 'none') {
            return null;
        }

        return text.replace(/\n{3,}/g, '\n\n').trim();
    } catch (error) {
        console.error('[memory] Failed to extract conversation note', error);
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

function resolveResponseText(response: GenerateResponse): string | null {
    const directText = response.text()?.trim();
    if (directText) {
        return directText;
    }

    const candidates = response.candidates;
    if (!candidates?.length) {
        return null;
    }

    for (const candidate of candidates) {
        const parts = candidate.content?.parts;
        if (!parts?.length) {
            continue;
        }
        const text = parts
            .map((part) => ('text' in part ? (part.text ?? '') : ''))
            .join('')
            .trim();
        if (text) {
            return text;
        }
    }

    return null;
}

function truncateText(text: string, maxChars: number): string {
    if (!text) {
        return '';
    }
    if (text.length <= maxChars) {
        return text;
    }
    return text.slice(text.length - maxChars);
}

type TranscriptSnippet = {
    transcript: string;
    startedAt: string;
};

type ExistingMoment = {
    period_year: number;
    period_month: number;
    summary: string;
};

export type MomentCandidate = {
    year: number;
    month: number;
    summary: string;
};

type ExtractMomentsParams = {
    transcripts: TranscriptSnippet[];
    recentMoments: ExistingMoment[];
};

export async function extractMomentsFromTranscripts(
    params: ExtractMomentsParams,
): Promise<MomentCandidate[]> {
    const cleanedTranscripts = params.transcripts
        .map((entry) => ({
            startedAt: entry.startedAt,
            transcript: entry.transcript?.trim() ?? '',
        }))
        .filter((entry) => entry.transcript);

    if (!cleanedTranscripts.length) {
        return [];
    }

    try {
        const model = getModel();
        const prompt = await getMomentsPrompt();
        const transcriptBlock = cleanedTranscripts
            .map(
                (entry, index) =>
                    `Call ${index + 1} (timestamp: ${entry.startedAt}):\n${entry.transcript}`,
            )
            .join('\n\n');

        const existingMomentsBlock =
            params.recentMoments.length > 0
                ? params.recentMoments
                      .map(
                          (moment) =>
                              `${moment.period_year}-${moment.period_month
                                  .toString()
                                  .padStart(2, '0')}: ${moment.summary}`,
                      )
                      .join('\n')
                : 'None.';

        console.log('[memory] Moments LLM input', {
            transcriptPreview: transcriptBlock.slice(0, 400),
            existingMomentsPreview: existingMomentsBlock.slice(0, 200),
        });
        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: `${prompt}\n\nExisting moments:\n${existingMomentsBlock}\n\nCall transcripts:\n${transcriptBlock}`,
                        },
                    ],
                },
            ],
        });

        const text = resolveResponseText(result.response);
        console.log('[memory] Moments LLM output', {
            textPreview: text?.slice(0, 200) ?? null,
            hasText: Boolean(text),
            candidatesLength: result.response.candidates?.length ?? 0,
            promptFeedback: result.response.promptFeedback ?? null,
            finishReasons: result.response.candidates?.map(
                (candidate) => candidate.finishReason,
            ),
        });
        if (!text) {
            console.log('[memory] Moments raw candidates', {
                candidates: result.response.candidates ?? null,
            });
        }
        if (!text) {
            return [];
        }

        return parseMomentCandidates(text);
    } catch (error) {
        console.error('[gemini] Failed to extract moments', error);
        return [];
    }
}

function parseMomentCandidates(text: string): MomentCandidate[] {
    const normalized = text.replace(/```json|```/g, '').trim();
    if (!normalized) {
        return [];
    }

    try {
        const parsed = JSON.parse(normalized) as Array<{
            year?: unknown;
            month?: unknown;
            summary?: unknown;
        }>;

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((item) => ({
                year: Number(item.year),
                month: Number(item.month),
                summary:
                    typeof item.summary === 'string' ? item.summary.trim() : '',
            }))
            .filter(
                (item) =>
                    Number.isInteger(item.year) &&
                    Number.isInteger(item.month) &&
                    item.year >= 2000 &&
                    item.year <= 2100 &&
                    item.month >= 1 &&
                    item.month <= 12 &&
                    Boolean(item.summary),
            );
    } catch (error) {
        console.error('[gemini] Failed to parse moment candidates', error);
        return [];
    }
}

async function getMomentsPrompt(): Promise<string> {
    if (cachedMomentsPrompt) {
        return cachedMomentsPrompt;
    }

    cachedMomentsPrompt = await loadPrompt('moments.md');
    return cachedMomentsPrompt;
}

export type CreateMomentsParams = {
    profileId: string;
    callLogId?: string;
    currentTranscript: string;
    currentStartedAt: string;
};

export async function createMomentsFromCall({
    profileId,
    callLogId,
    currentTranscript,
    currentStartedAt,
}: CreateMomentsParams): Promise<void> {
    const trimmedTranscript = currentTranscript?.trim();
    if (!profileId || !trimmedTranscript) {
        return;
    }

    const priorTranscripts = await getRecentCallTranscripts(profileId, 2);
    const transcripts: TranscriptSnippet[] = [
        {
            transcript: truncateText(
                trimmedTranscript,
                MAX_MOMENT_TRANSCRIPT_CHARS,
            ),
            startedAt: currentStartedAt,
        },
        ...priorTranscripts.map((entry) => ({
            transcript: truncateText(
                entry.transcript,
                MAX_MOMENT_TRANSCRIPT_CHARS,
            ),
            startedAt: entry.startedAt,
        })),
    ];

    const recentMoments = await getRecentMoments(profileId, 5);
    const candidates = await extractMomentsFromTranscripts({
        transcripts,
        recentMoments,
    });

    console.log('[memory] Moments candidates', {
        profileId,
        callLogId,
        count: candidates.length,
        candidates,
    });

    if (!candidates.length) {
        return;
    }

    const inserted = await insertMoments(
        candidates.map((moment) => ({
            profile_id: profileId,
            call_log_id: callLogId ?? null,
            period_year: moment.year,
            period_month: moment.month,
            summary: moment.summary,
        })),
    );

    console.log('[memory] Moments insert result', {
        profileId,
        callLogId,
        inserted,
    });
}
