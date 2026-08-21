export type YoutubeLocalizationContent = {
  title?: string | null;
  description?: string | null;
};

export type MusicWorkYoutubeLocalization = Partial<
  Record<string, YoutubeLocalizationContent>
>;

export type MusicWorkYoutubeAdminMetadata = {
  subtitlePrimaryLocale?: string | null;
  youtubePrimaryLocale?: string | null;
};

export type MusicWorkYoutubePlatformMetadata = MusicWorkYoutubeLocalization & {
  __admin?: MusicWorkYoutubeAdminMetadata;
};

export type MusicWorkSubtitleTracks = Partial<Record<string, string>>;

export type MusicWorkType = "C" | "CO" | "LC" | "O" | "R";
export type MusicWorkFromType =
  | "Anime"
  | "Cartoon"
  | "Game"
  | "Meme"
  | "Movie"
  | "Original"
  | "Pop";

export interface MusicWork {
  path: string;
  contentId: string;
  storageSource?: "db" | "db+file" | "file";
  workType: MusicWorkType | string;
  visible?: boolean | null;
  publishedAt?: string | null;
  songTitle?: string | null;
  fromTitle?: string | null;
  fromArtists?: string[] | null;
  fromSource?: string | null;
  fromType?: MusicWorkFromType | string | null;
  fromIp?: string | null;
  fromSeries?: string | null;
  fromSession?: string | null;
  fromDetails?: string | null;
  vid: string;
  title: string;
  original?: string | null;
  u2bId?: string | null;
  thumbnailBlurDataUrl?: string | null;
  series?: string | null;
  bilibiliId?: string | null;
  bilibiliTitle?: string | null;
  bilibiliDescription?: string | null;
  inspiredByAuthor?: string | null;
  inspiredByDetail?: string | null;
  inspiredByTitle?: string | null;
  introText?: string | null;
  isOriginal?: boolean;
  lyrics?: string | null;
  musicStyle?: string | null;
  musicType?: string | null;
  pixivId?: string | null;
  pixivTitle?: string | null;
  pixivDescription?: string | null;
  pixivTags?: string | null;
  productionNotes?: string | null;
  relatedWorkUids?: string | null;
  shortDescription?: string | null;
  subtitleTracks?: MusicWorkSubtitleTracks | null;
  vkId?: string | null;
  vkTitle?: string | null;
  vkDescription?: string | null;
  youtubeLocalization?: MusicWorkYoutubeLocalization | null;
  youtubePrimaryLocale?: string | null;
  subtitlePrimaryLocale?: string | null;
}

export interface MusicWorkWithContent extends MusicWork {}

export interface MusicWorkRecord extends MusicWork {
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface MusicWorkDraft extends MusicWork {}
