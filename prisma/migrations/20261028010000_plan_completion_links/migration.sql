-- Work associations now live in music_plan_works. The old check required the
-- single legacy pointer and blocked several plans from sharing a completed Work.
-- Keep all legacy pointers/data; validate fulfilment through the new associations.
ALTER TABLE "admin_music_todos"
  DROP CONSTRAINT "admin_music_todos_completed_content_check";
