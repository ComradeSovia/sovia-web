import { AdminAnalyticsAudiencePage } from "@sovia/admin";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Audience | Admin",
  robots: { index: false, follow: false },
};
export default function AudienceRoute() {
  return <AdminAnalyticsAudiencePage />;
}
