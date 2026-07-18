CREATE TABLE "admin_youtube_locales" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_youtube_locales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_youtube_locales_locale_key" ON "admin_youtube_locales"("locale");
CREATE INDEX "admin_youtube_locales_position_idx" ON "admin_youtube_locales"("position");

INSERT INTO "admin_youtube_locales" ("id", "locale", "label", "position", "enabled", "createdAt", "updatedAt") VALUES
    ('admin_youtube_locale_en', 'en', 'English', 100, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
   ('admin_youtube_locale_ru', 'ru', 'Russian', 100, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
