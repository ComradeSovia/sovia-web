import { AdminAnalyticsStrategyPage } from "@sovia/admin";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Content Strategy | Admin",
  robots: { index: false, follow: false },
};
export default async function StrategyRoute({
  searchParams,
}: {
  searchParams: Promise<{
    hours?: string;
    q?: string;
    candidateTitle?: string;
    sourceTitle?: string;
    artist?: string;
    ip?: string;
    series?: string;
    workType?: string;
    vocalLanguages?: string;
    durationSeconds?: string;
    allowRemake?: string;
  }>;
}) {
  const query = await searchParams;
  const hours = [24, 72, 168, 672].includes(Number(query.hours))
    ? Number(query.hours)
    : 168;
  return (
    <AdminAnalyticsStrategyPage
      hours={hours}
      query={query.q?.slice(0, 200)}
      candidate={{
        title: query.candidateTitle ?? query.q ?? "",
        sourceTitle: query.sourceTitle,
        artist: query.artist,
        ip: query.ip,
        series: query.series,
        workType: query.workType,
        vocalLanguages: query.vocalLanguages,
        durationSeconds: query.durationSeconds,
        allowRemake: query.allowRemake === "1",
      }}
    />
  );
}
