import { SONG_PLANS_PATH } from "@sovia/shared/constants/routes";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import {
  getSiteLocalizedPath,
  getSiteMetadataAlternates,
} from "@sovia/shared/i18n/site-routing";
import { cookies } from "next/headers";
import Link from "next/link";
import { SongPlansPage } from "@/features/song-plans";
import {
  listPublicPlans,
  VOTE_COOKIE,
  voterHash,
} from "@/features/song-plans/data";
import {
  PLAN_SORTS,
  PLAN_TABS,
  type PlanSort,
  type PlanTab,
} from "@/features/song-plans/model";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const locale = await getCurrentSiteLocale();
  const copy = getSharedCopy(locale).songPlans;
  return {
    title: copy.title,
    description: copy.intro,
    alternates: getSiteMetadataAlternates(SONG_PLANS_PATH, locale),
  };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    sort?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const tab: PlanTab = PLAN_TABS.includes(params.tab as PlanTab)
    ? (params.tab as PlanTab)
    : "pool";
  const sort: PlanSort = PLAN_SORTS.includes(params.sort as PlanSort)
    ? (params.sort as PlanSort)
    : "recent";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 150) : "";
  const page = Math.min(
    100000,
    Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1),
  );
  const locale = await getCurrentSiteLocale();
  const shared = getSharedCopy(locale);
  try {
    const data = await listPublicPlans({
      tab,
      sort,
      q,
      page,
      voterId: voterHash((await cookies()).get(VOTE_COOKIE)?.value),
    });
    return (
      <SongPlansPage
        data={data}
        copy={shared.songPlans}
        locale={locale}
        tab={tab}
        sort={sort}
        q={q}
        page={page}
      />
    );
  } catch (error) {
    console.error("Public song plans could not be loaded", error);
    return (
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-20">
        <h1 className="text-3xl font-black">{shared.unavailable.title}</h1>
        <p>{shared.unavailable.description}</p>
        <Link
          className="underline"
          href={getSiteLocalizedPath(SONG_PLANS_PATH, locale)}
        >
          {shared.unavailable.retry}
        </Link>
      </main>
    );
  }
}
