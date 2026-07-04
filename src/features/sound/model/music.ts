import type { SiteLocale } from "@sovia/shared/i18n/site-locale";

export type YoutubeLocalizationContent = {
  title?: string | null;
  description?: string | null;
};

export type MusicWorkYoutubeLocalization = Partial<
  Record<SiteLocale, YoutubeLocalizationContent>
>;

export type MusicWorkSubtitleTracks = Partial<Record<SiteLocale, string>>;

export interface MusicWork {
  path: string;
  vid: string;
  title: string;
  original?: string | null;
  u2bId?: string | null;
  thumbnailBlurDataUrl?: string | null;
  series?: string | null;
  bilibiliId?: string | null;
  inspiredByAuthor?: string | null;
  inspiredByDetail?: string | null;
  inspiredByTitle?: string | null;
  introText?: string | null;
  isOriginal?: boolean;
  lyrics?: string | null;
  musicStyle?: string | null;
  musicType?: string | null;
  pixivId?: string | null;
  productionNotes?: string | null;
  publishedAt?: string | null;
  relatedWorkUids?: string | null;
  shortDescription?: string | null;
  subtitleTracks?: MusicWorkSubtitleTracks | null;
  vkId?: string | null;
  youtubeLocalization?: MusicWorkYoutubeLocalization | null;
}

export interface MusicWorkWithContent extends MusicWork {}

export interface MusicWorkRecord extends MusicWork {
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface MusicWorkDraft extends MusicWork {}
