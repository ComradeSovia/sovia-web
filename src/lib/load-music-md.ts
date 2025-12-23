import fs from "node:fs";
import path from "node:path";

function readMarkdownSafe(dir: string, vid: string): string | null {
  const filePath = path.join(process.cwd(), dir, `${vid}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

export function loadMusicDescription(vid: string) {
  return readMarkdownSafe("data/music-description", vid);
}

export function loadMusicLyrics(vid: string) {
  return readMarkdownSafe("data/music-lyrics", vid);
}
