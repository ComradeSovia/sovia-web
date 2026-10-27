export type Value = number | string | null;
type Report = {
  columnHeaders?: { name: string }[];
  rows?: Value[][];
  error?: { message?: string };
};
const URL = "https://youtubeanalytics.googleapis.com/v2/reports";

// A hard request budget and sequential pagination bound each sync. No page load calls this.
export function createAnalyticsReportReader(
  accessToken: string,
  requestBudget = 50,
) {
  let remaining = requestBudget;
  return async (parameters: Record<string, string>, onePage = false) => {
    const records: Record<string, Value>[] = [];
    let startIndex = 1;
    while (true) {
      if (--remaining < 0)
        throw new Error(
          "Daily Analytics request budget reached; cached data retained. Continue on the next sync.",
        );
      const params = new URLSearchParams({
        ids: "channel==MINE",
        maxResults: "500",
        ...parameters,
        startIndex: String(startIndex),
      });
      const response = await fetch(`${URL}?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      const payload = (await response
        .json()
        .catch(() => null)) as Report | null;
      if (!response.ok || !payload?.columnHeaders)
        throw new Error(
          `Analytics ${parameters.dimensions ?? "unknown"} report failed (${response.status}): ${payload?.error?.message || "invalid response"}`,
        );
      const headers = payload.columnHeaders.map((column) => column.name);
      const rows = payload.rows ?? [];
      records.push(
        ...rows.map((row) =>
          Object.fromEntries(
            headers.map((header, index) => [header, row[index] ?? null]),
          ),
        ),
      );
      if (onePage || rows.length < Number(params.get("maxResults")))
        return records;
      startIndex += rows.length;
    }
  };
}
