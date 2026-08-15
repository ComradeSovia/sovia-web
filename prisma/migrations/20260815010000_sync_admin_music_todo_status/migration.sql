UPDATE "admin_music_todos" AS todo
SET
  "status" = CASE
    WHEN todo."contentId" IS NULL
      THEN 'PROPOSED'::"AdminMusicTodoStatus"
    WHEN EXISTS (
      SELECT 1
      FROM "music_work_statuses" AS work_status
      WHERE work_status."contentId" = todo."contentId"
        AND NULLIF(TRIM(work_status."publishedAt"), '') IS NOT NULL
    )
      THEN 'COMPLETED'::"AdminMusicTodoStatus"
    ELSE 'PLANNING'::"AdminMusicTodoStatus"
  END,
  "completedAt" = CASE
    WHEN EXISTS (
      SELECT 1
      FROM "music_work_statuses" AS work_status
      WHERE work_status."contentId" = todo."contentId"
        AND NULLIF(TRIM(work_status."publishedAt"), '') IS NOT NULL
    )
      THEN COALESCE(todo."completedAt", CURRENT_TIMESTAMP)
    ELSE NULL
  END;
