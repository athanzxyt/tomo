import { notFound } from "next/navigation";
import HomePageClient from "@/components/home/home-page-client";
import {
  getEntryById,
  getLatestEntries,
  getLatestMoments,
  getRecentCallLogs,
} from "@/lib/db";

const CALL_LIMIT = 10;
const MOMENTS_LIMIT = 8;

export default async function EntryPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;

  const [calls, moments, entries, selectedEntry] = await Promise.all([
    getRecentCallLogs(CALL_LIMIT),
    getLatestMoments(MOMENTS_LIMIT),
    getLatestEntries(),
    getEntryById(entryId),
  ]);

  if (!selectedEntry) {
    notFound();
  }

  const hasSelected = entries.some((entry) => entry.id === selectedEntry.id);
  const mergedEntries = hasSelected ? entries : [selectedEntry, ...entries];

  return (
    <HomePageClient
      calls={calls}
      moments={moments}
      entries={mergedEntries}
      initialView="entries"
      initialEntryId={selectedEntry.id}
      showEntryDetail
    />
  );
}
