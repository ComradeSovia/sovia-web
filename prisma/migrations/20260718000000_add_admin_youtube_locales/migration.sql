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
    ('admin_youtube_locale_en_us', 'en-US', 'English', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('admin_youtube_locale_zh_cn', 'zh-CN', 'Chinese (Simplified)', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('admin_youtube_locale_zh_tw', 'zh-TW', 'Chinese (Traditional)', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('admin_youtube_locale_ja_jp', 'ja-JP', 'Japanese', 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('admin_youtube_locale_ko_kr', 'ko-KR', 'Korean', 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('admin_youtube_locale_ru_ru', 'ru-RU', 'Russian', 60, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
