BEGIN;

-- Abort rather than guess if a compact source date is not a real calendar date.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "admin_youtube_video_reach_daily"
    WHERE "date" ~ '^[0-9]{8}$'
      AND to_char(to_date("date", 'YYYYMMDD'), 'YYYYMMDD') <> "date"
  ) THEN
    RAISE EXCEPTION 'Invalid compact Reach date; cache normalization aborted';
  END IF;
END $$;

-- Compact and ISO keys can represent the same source day. Preserve the newer
-- imported observation before removing only the superseded duplicate key.
UPDATE "admin_youtube_video_reach_daily" AS iso
SET "contentId" = compact."contentId",
    "impressions" = compact."impressions",
    "impressionClickThroughRate" = compact."impressionClickThroughRate",
    "reportId" = compact."reportId",
    "syncedAt" = compact."syncedAt"
FROM "admin_youtube_video_reach_daily" AS compact
WHERE compact."date" ~ '^[0-9]{8}$'
  AND iso."videoId" = compact."videoId"
  AND iso."date" = to_char(to_date(compact."date", 'YYYYMMDD'), 'YYYY-MM-DD')
  AND compact."syncedAt" > iso."syncedAt";

DELETE FROM "admin_youtube_video_reach_daily" AS compact
USING "admin_youtube_video_reach_daily" AS iso
WHERE compact."date" ~ '^[0-9]{8}$'
  AND iso."videoId" = compact."videoId"
  AND iso."date" = to_char(to_date(compact."date", 'YYYYMMDD'), 'YYYY-MM-DD');

UPDATE "admin_youtube_video_reach_daily"
SET "date" = to_char(to_date("date", 'YYYYMMDD'), 'YYYY-MM-DD')
WHERE "date" ~ '^[0-9]{8}$';

-- Reuse the application's conservative full-calendar-window semantics. Missing
-- days or positive-weight missing CTR remain null; no views or Analytics dates
-- are changed, and source observation timestamps are preserved.
CREATE TEMP VIEW sovia_reach_windows AS
SELECT 'rolling' AS kind, id, "videoId", "startDate", "endDate"
FROM "admin_youtube_video_analytics_snapshots"
UNION ALL
SELECT 'early' AS kind, id, "videoId", "startDate", "endDate"
FROM "admin_youtube_video_early_performance_snapshots";

CREATE TEMP TABLE sovia_reach_aggregates ON COMMIT DROP AS
SELECT w.kind, w.id,
  CASE WHEN w."startDate" >= '2020-01-01'
    AND w."endDate"::date - w."startDate"::date + 1 BETWEEN 1 AND 730
    AND count(r.id) = w."endDate"::date - w."startDate"::date + 1
    THEN sum(r.impressions) ELSE NULL END AS impressions,
  CASE WHEN w."startDate" >= '2020-01-01'
    AND w."endDate"::date - w."startDate"::date + 1 BETWEEN 1 AND 730
    AND count(r.id) = w."endDate"::date - w."startDate"::date + 1
    AND sum(r.impressions) > 0
    AND count(r.id) FILTER (WHERE r.impressions > 0 AND r."impressionClickThroughRate" IS NULL) = 0
    THEN sum(r.impressions * r."impressionClickThroughRate") / sum(r.impressions)
    ELSE NULL END AS ctr
FROM sovia_reach_windows w
LEFT JOIN "admin_youtube_video_reach_daily" r
  ON r."videoId" = w."videoId" AND r.date >= w."startDate" AND r.date <= w."endDate"
GROUP BY w.kind, w.id, w."startDate", w."endDate";

UPDATE "admin_youtube_video_analytics_snapshots" s
SET impressions = a.impressions, "impressionClickThroughRate" = a.ctr
FROM sovia_reach_aggregates a
WHERE a.kind = 'rolling' AND a.id = s.id
  AND (s.impressions, s."impressionClickThroughRate") IS DISTINCT FROM (a.impressions, a.ctr);

UPDATE "admin_youtube_video_early_performance_snapshots" s
SET impressions = a.impressions, "impressionClickThroughRate" = a.ctr
FROM sovia_reach_aggregates a
WHERE a.kind = 'early' AND a.id = s.id
  AND (s.impressions, s."impressionClickThroughRate") IS DISTINCT FROM (a.impressions, a.ctr);

DROP VIEW sovia_reach_windows;
COMMIT;
