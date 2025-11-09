"use server";

import { revalidatePath } from "next/cache";

import {
  type EntryRecord,
  getEntryById,
  getLatestCallProfileId,
  getLatestEntries,
  updateEntryContent,
  upsertEntry,
} from "@/lib/db";
import { generateMemoirEntryFromCalls } from "@/lib/memory";

const ENTRY_REVALIDATE_PATHS = ["/home"];

function triggerRevalidate(entryId?: string) {
  for (const path of ENTRY_REVALIDATE_PATHS) {
    revalidatePath(path);
  }
  if (entryId) {
    revalidatePath(`/home/entries/${entryId}`);
  }
}

type EntryActionResult =
  | { success: true; entry: EntryRecord }
  | { success: false; error: string };

export async function generateEntryAction(): Promise<EntryActionResult> {
  const profileId = await resolveEntryProfileId();
  if (!profileId) {
    return { success: false, error: "profile-missing" };
  }

  const draft = await generateMemoirEntryFromCalls(profileId);
  if (!draft) {
    return { success: false, error: "no-transcripts" };
  }

  const now = new Date();
  const entry = await upsertEntry({
    profile_id: profileId,
    period_year: now.getUTCFullYear(),
    period_month: now.getUTCMonth() + 1,
    title: draft.title.trim() || `Memoir ${now.getUTCFullYear()}`,
    body: draft.body.trim(),
  });

  if (!entry) {
    return { success: false, error: "persist-failed" };
  }

  triggerRevalidate(entry.id);

  return { success: true, entry };
}

export async function updateEntryAction(params: {
  entryId: string;
  title: string;
  body: string;
}): Promise<EntryActionResult> {
  const existing = await getEntryById(params.entryId);
  if (!existing) {
    return { success: false, error: "entry-not-found" };
  }

  const title = params.title?.trim() || "Untitled entry";
  const body = params.body?.trim();
  if (!body) {
    return { success: false, error: "body-required" };
  }

  const entry = await updateEntryContent({
    id: params.entryId,
    profile_id: existing.profile_id,
    title,
    body,
  });

  if (!entry) {
    return { success: false, error: "persist-failed" };
  }

  triggerRevalidate(entry.id);

  return { success: true, entry };
}

async function resolveEntryProfileId(): Promise<string | null> {
  const recentEntry = (await getLatestEntries(1))[0];
  if (recentEntry?.profile_id) {
    return recentEntry.profile_id;
  }
  return getLatestCallProfileId();
}
