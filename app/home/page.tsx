import HomePageClient from "@/components/home/home-page-client";
import { getRecentCallLogs } from "@/lib/db";

const CALL_LIMIT = 10;

export default async function HomePage() {
  const calls = await getRecentCallLogs(CALL_LIMIT);
  return <HomePageClient calls={calls} />;
}
