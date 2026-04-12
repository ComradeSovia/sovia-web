export interface MusicWork {
  path: string;
  vid: string;
  title: string;
  original?: string;
  u2bId?: string;
  series?: string;
}

export interface MusicWorkWithContent extends MusicWork {
  descriptions?: Record<string, string>; // language -> markdown content
  lyrics?: Record<string, string>; // language -> markdown content
  availableLanguages?: string[];
}
