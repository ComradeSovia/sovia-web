import { getPrismaClient } from "@sovia/sound/data/prisma";

const REPORTING_API_URL = "https://youtubereporting.googleapis.com/v1";
const REACH_REPORT_TYPE_ID = "channel_reach_basic_a1";
const REACH_JOB_NAME = "Sovia channel reach";
const REPORT_LOOKBACK_DAYS = 120;

type ReportingJob = {
  expireTime?: string;
  id?: string;
  name?: string;
  reportTypeId?: string;
};

type ReportingReport = {
  createTime?: string;
  downloadUrl?: string;
  endTime?: string;
  id?: string;
  jobId?: string;
  startTime?: string;
};

type ReportingError = {
  error?: { message?: string };
};

type ListJobsResponse = ReportingError & {
  jobs?: ReportingJob[];
  nextPageToken?: string;
};

type ListReportsResponse = ReportingError & {
  nextPageToken?: string;
  reports?: ReportingReport[];
};

export async function syncYoutubeReachReports({
  accessToken,
  videoIdToContentId,
}: {
  accessToken: string;
  videoIdToContentId: Map<string, string>;
}) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database is unavailable.");

  const { created, job } = await ensureReachJob(accessToken);
  if (!job.id) throw new Error("YouTube Reporting reach job has no ID.");

  const reports = await listReachReports(accessToken, job.id);
  const importedIds = new Set(
    (
      await prisma.adminYoutubeReportingImport.findMany({
        select: { reportId: true },
        where: {
          reportId: { in: reports.flatMap((report) => report.id ?? []) },
        },
      })
    ).map((item) => item.reportId),
  );
  const pending = reports
    .filter(
      (report) =>
        report.id && report.downloadUrl && !importedIds.has(report.id),
    )
    .sort((left, right) =>
      String(left.createTime).localeCompare(String(right.createTime)),
    );
  let importedReports = 0;
  let importedRows = 0;

  for (const report of pending) {
    if (
      !report.id ||
      !report.downloadUrl ||
      !report.startTime ||
      !report.endTime ||
      !report.createTime
    ) {
      continue;
    }
    const csv = await downloadReport(accessToken, report.downloadUrl);
    const rows = parseReachCsv(csv);
    let reportRows = 0;

    await prisma.$transaction(async (transaction) => {
      for (const row of rows) {
        const contentId = videoIdToContentId.get(row.videoId);
        if (!contentId) continue;
        await transaction.adminYoutubeVideoReachDaily.upsert({
          create: {
            contentId,
            date: row.date,
            impressionClickThroughRate: row.ctr,
            impressions: row.impressions,
            reportId: report.id as string,
            videoId: row.videoId,
          },
          update: {
            contentId,
            impressionClickThroughRate: row.ctr,
            impressions: row.impressions,
            reportId: report.id as string,
            syncedAt: new Date(),
          },
          where: {
            videoId_date: { date: row.date, videoId: row.videoId },
          },
        });
        reportRows += 1;
      }
      await transaction.adminYoutubeReportingImport.create({
        data: {
          createdAt: new Date(report.createTime as string),
          endTime: new Date(report.endTime as string),
          jobId: job.id as string,
          reportId: report.id as string,
          rowCount: reportRows,
          startTime: new Date(report.startTime as string),
        },
      });
    });
    importedReports += 1;
    importedRows += reportRows;
  }

  const updatedSnapshots =
    importedReports > 0 ? await updateAnalyticsReachSnapshots() : 0;
  return {
    importedReports,
    importedRows,
    jobCreated: created,
    jobId: job.id,
    pendingGeneration: reports.length === 0,
    reportCount: reports.length,
    updatedSnapshots,
  };
}

async function ensureReachJob(accessToken: string) {
  const jobs = await listJobs(accessToken);
  const existing = jobs.find(
    (job) => job.reportTypeId === REACH_REPORT_TYPE_ID && !job.expireTime,
  );
  if (existing) return { created: false, job: existing };

  const response = await fetch(`${REPORTING_API_URL}/jobs`, {
    body: JSON.stringify({
      name: REACH_JOB_NAME,
      reportTypeId: REACH_REPORT_TYPE_ID,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as
    | (ReportingJob & ReportingError)
    | null;
  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        "YouTube Reporting reach job could not be created.",
    );
  }
  return { created: true, job: payload ?? {} };
}

async function listJobs(accessToken: string) {
  const jobs: ReportingJob[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    const payload = await fetchReportingJson<ListJobsResponse>(
      `${REPORTING_API_URL}/jobs?${params}`,
      accessToken,
    );
    jobs.push(...(payload.jobs ?? []));
    pageToken = payload.nextPageToken;
  } while (pageToken);
  return jobs;
}

async function listReachReports(accessToken: string, jobId: string) {
  const reports: ReportingReport[] = [];
  let pageToken: string | undefined;
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - REPORT_LOOKBACK_DAYS);

  do {
    const params = new URLSearchParams({
      pageSize: "100",
      startTimeAtOrAfter: start.toISOString(),
    });
    if (pageToken) params.set("pageToken", pageToken);
    const payload = await fetchReportingJson<ListReportsResponse>(
      `${REPORTING_API_URL}/jobs/${encodeURIComponent(jobId)}/reports?${params}`,
      accessToken,
    );
    reports.push(...(payload.reports ?? []));
    pageToken = payload.nextPageToken;
  } while (pageToken);
  return reports;
}

async function fetchReportingJson<T extends ReportingError>(
  url: string,
  accessToken: string,
) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    throw new Error(
      payload?.error?.message || "YouTube Reporting API request failed.",
    );
  }
  return (payload ?? {}) as T;
}

async function downloadReport(accessToken: string, downloadUrl: string) {
  const response = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`YouTube Reach CSV download failed (${response.status}).`);
  }
  return response.text();
}

function parseReachCsv(csv: string) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const index = Object.fromEntries(
    headers.map((header, column) => [header, column]),
  );
  const required = [
    "date",
    "video_id",
    "video_thumbnail_impressions",
    "video_thumbnail_impressions_ctr",
  ];
  if (required.some((header) => index[header] === undefined)) {
    throw new Error("YouTube Reach CSV is missing required columns.");
  }

  return lines.slice(1).flatMap((line) => {
    const columns = parseCsvLine(line);
    const date = columns[index.date]?.trim();
    const videoId = columns[index.video_id]?.trim();
    const impressions = Number(columns[index.video_thumbnail_impressions]);
    const ctr = Number(columns[index.video_thumbnail_impressions_ctr]);
    if (
      !date ||
      !videoId ||
      !Number.isFinite(impressions) ||
      !Number.isFinite(ctr)
    ) {
      return [];
    }
    return [{ ctr, date, impressions: Math.trunc(impressions), videoId }];
  });
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current);
  return values;
}

async function updateAnalyticsReachSnapshots() {
  const prisma = getPrismaClient();
  if (!prisma) return 0;
  const snapshots = await prisma.adminYoutubeVideoAnalyticsSnapshot.findMany({
    select: { endDate: true, id: true, startDate: true, videoId: true },
  });
  const earlySnapshots =
    await prisma.adminYoutubeVideoEarlyPerformanceSnapshot.findMany({
      select: { endDate: true, id: true, startDate: true, videoId: true },
    });
  const reachRows = await prisma.adminYoutubeVideoReachDaily.findMany();
  const byVideo = new Map<string, typeof reachRows>();
  for (const row of reachRows) {
    const current = byVideo.get(row.videoId) ?? [];
    current.push(row);
    byVideo.set(row.videoId, current);
  }
  let updated = 0;

  for (const snapshot of snapshots) {
    const rows = (byVideo.get(snapshot.videoId) ?? []).filter(
      (row) => row.date >= snapshot.startDate && row.date <= snapshot.endDate,
    );
    if (!rows.length) continue;
    const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
    const ctr =
      impressions > 0
        ? rows.reduce(
            (sum, row) =>
              sum + (row.impressionClickThroughRate ?? 0) * row.impressions,
            0,
          ) / impressions
        : null;
    await prisma.adminYoutubeVideoAnalyticsSnapshot.update({
      data: {
        impressionClickThroughRate: ctr,
        impressions,
      },
      where: { id: snapshot.id },
    });
    updated += 1;
  }
  for (const snapshot of earlySnapshots) {
    const rows = (byVideo.get(snapshot.videoId) ?? []).filter(
      (row) => row.date >= snapshot.startDate && row.date <= snapshot.endDate,
    );
    if (!rows.length) continue;
    const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
    const ctr =
      impressions > 0
        ? rows.reduce(
            (sum, row) =>
              sum + (row.impressionClickThroughRate ?? 0) * row.impressions,
            0,
          ) / impressions
        : null;
    await prisma.adminYoutubeVideoEarlyPerformanceSnapshot.update({
      data: { impressionClickThroughRate: ctr, impressions },
      where: { id: snapshot.id },
    });
    updated += 1;
  }
  return updated;
}
