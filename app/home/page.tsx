import type { ViewValue } from "@/components/home/app-sidebar";
import HomePageClient from "@/components/home/home-page-client";
import {
  getLatestEntries,
  getLatestMoments,
  getRecentCallLogs,
} from "@/lib/db";

const CALL_LIMIT = 10;
const MOMENTS_LIMIT = 8;

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const viewParam = Array.isArray(resolvedParams.view)
    ? resolvedParams.view[0]
    : resolvedParams.view;
  const initialView = isValidView(viewParam)
    ? viewParam
    : ("calls" as ViewValue);

  const [calls, moments, entries] = await Promise.all([
    getRecentCallLogs(CALL_LIMIT),
    getLatestMoments(MOMENTS_LIMIT),
    getLatestEntries(),
  ]);

  return (
    <HomePageClient
      calls={calls}
      moments={moments}
      entries={entries}
      initialView={initialView}
    />
  );
}

function isValidView(value?: string): value is ViewValue {
  if (!value) {
    return false;
  }
  return ["calls", "entries", "moments"].includes(value);
}
