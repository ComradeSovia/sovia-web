export interface MusicWork {
  path: string;
  vid: string;
  title: string;
  original?: string | null;
  u2bId?: string | null;
  series?: string | null;
}

export interface MusicWorkWithContent extends MusicWork {
  descriptions?: Record<string, string>; // language -> markdown content
  lyrics?: Record<string, string>; // language -> markdown content
  availableLanguages?: string[];
}

export interface MusicWorkRecord extends MusicWork {
  description?: string | null;
  lyrics?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface MusicWorkDraft extends MusicWork {
  description?: string | null;
  lyrics?: string | null;
}
