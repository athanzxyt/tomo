import HomePageClient from "@/components/home/home-page-client";
import { getLatestMoments, getRecentCallLogs } from "@/lib/db";

const CALL_LIMIT = 10;
const MOMENTS_LIMIT = 8;

export default async function HomePage() {
  const [calls, moments] = await Promise.all([
    getRecentCallLogs(CALL_LIMIT),
    getLatestMoments(MOMENTS_LIMIT),
  ]);

  return <HomePageClient calls={calls} moments={moments} />;
}
