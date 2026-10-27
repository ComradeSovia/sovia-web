export function parseReachCsv(csv: string) {
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

  const seen = new Set<string>();
  return lines.slice(1).flatMap((line) => {
    const columns = parseCsvLine(line);
    const rawDate = columns[index.date]?.trim();
    const date = rawDate?.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
    const videoId = columns[index.video_id]?.trim();
    const rawImpressions = columns[index.video_thumbnail_impressions]?.trim();
    const rawCtr = columns[index.video_thumbnail_impressions_ctr]?.trim();
    const impressions = rawImpressions ? Number(rawImpressions) : Number.NaN;
    const ctr = rawCtr ? Number(rawCtr) : null;
    if (
      !date ||
      !videoId ||
      !Number.isFinite(impressions) ||
      (ctr !== null && (!Number.isFinite(ctr) || ctr < 0 || ctr > 1)) ||
      impressions < 0 ||
      !Number.isInteger(impressions) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      throw new Error(
        "Invalid Reach CSV metric or date; previous report retained.",
      );
    }
    const key = `${videoId}:${date}`;
    if (seen.has(key))
      throw new Error("Duplicate video/date in Reach basic report.");
    seen.add(key);
    return [{ ctr, date, impressions, videoId }];
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
