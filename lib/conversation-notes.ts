import { insertConversationNote } from '@/lib/db';
import { extractConversationNoteFromTranscript } from '@/lib/gemini';

export type ConversationNoteParams = {
    profileId: string;
    callLogId?: string;
    transcript: string;
};

export async function createConversationNoteFromTranscript(
    params: ConversationNoteParams,
): Promise<boolean> {
    const transcript = params.transcript?.trim();
    if (!transcript) {
        return false;
    }

    const content = await extractConversationNoteFromTranscript(transcript);
    if (!content) {
        return false;
    }

    return insertConversationNote({
        profile_id: params.profileId,
        call_log_id: params.callLogId ?? null,
        content,
    });
}
