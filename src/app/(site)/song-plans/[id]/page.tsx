import { SONG_PLANS_PATH } from "@sovia/shared/constants/routes";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { getSiteMetadataAlternates } from "@sovia/shared/i18n/site-routing";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SongPlanDetail } from "@/features/song-plans";
import {
  getPublicPlan,
  VOTE_COOKIE,
  voterHash,
} from "@/features/song-plans/data";

export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale).songPlans;
  const plan = await getPublicPlan(id);
  return {
    title: plan?.title ?? copy.title,
    description: plan?.summary || copy.intro,
    alternates: getSiteMetadataAlternates(
      `${SONG_PLANS_PATH}/${encodeURIComponent(id)}`,
      locale,
    ),
    ...(!plan ? { robots: { index: false, follow: false } } : {}),
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getCurrentSiteLocale();
  const plan = await getPublicPlan(
    id,
    voterHash((await cookies()).get(VOTE_COOKIE)?.value),
  );
  if (!plan) notFound();
  return (
    <SongPlanDetail
      plan={plan}
      locale={locale}
      copy={getSharedCopy(locale).songPlans}
    />
  );
}
