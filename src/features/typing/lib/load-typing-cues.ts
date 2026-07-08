import { promises as fs } from "node:fs";
import path from "node:path";
import { createTypingCues } from "./create-typing-cue";
import { parseSrt } from "./parse-srt";
import type { TypingDifficulty, TypingLang } from "./types";

const DATA_WORKS_DIR = path.join(process.cwd(), "data", "works");
const WORK_LIST_PATH = path.join(process.cwd(), "data", "list.json");

type RawWork = {
  path?: unknown;
  series?: unknown;
  title?: unknown;
  u2bId?: unknown;
  vid?: unknown;
};

export type TypingWorkOption = {
  id: string;
  title: string;
  series: string | null;
  youtubeId: string;
  captions: {
    en: boolean;
    ru: boolean;
  };
};

export async function loadTypingCues({
  difficulty,
  lang,
  workId,
}: {
  difficulty: TypingDifficulty;
  lang: TypingLang;
  workId: string;
}) {
  const captionLang = lang === "en" ? "en" : "ru";
  const captionPath = path.join(
    DATA_WORKS_DIR,
    workId,
    `captions.${captionLang}.srt`,
  );
  const rawSrt = await fs.readFile(captionPath, "utf8");

  return createTypingCues(parseSrt(rawSrt), lang, difficulty);
}

export async function getTypingWorkOptions(): Promise<TypingWorkOption[]> {
  const [rawList, workDirectories] = await Promise.all([
    fs.readFile(WORK_LIST_PATH, "utf8"),
    fs.readdir(DATA_WORKS_DIR, { withFileTypes: true }),
  ]);
  const captionWorkIds = new Set(
    workDirectories
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter(isSafeWorkId),
  );
  const rawWorks = JSON.parse(rawList) as RawWork[];

  const works = await Promise.all(
    rawWorks.flatMap((work) => {
      const id = getRawString(work.vid) ?? getRawString(work.path);
      const title = getRawString(work.title);
      const youtubeId = getRawString(work.u2bId);

      if (!id || !title || !youtubeId || !captionWorkIds.has(id)) {
        return [];
      }

      return [
        getCaptionAvailability(id).then((captions) => ({
          captions,
          id,
          series: getRawString(work.series),
          title,
          youtubeId,
        })),
      ];
    }),
  );

  return works.filter((work) => work.captions.en || work.captions.ru);
}

export async function getTypingWorkOption(workId: string) {
  const works = await getTypingWorkOptions();

  return works.find((work) => work.id === workId) ?? null;
}

export function isLangAvailableForWork(
  work: TypingWorkOption,
  lang: TypingLang,
) {
  return lang === "en" ? work.captions.en : work.captions.ru;
}

export function isSafeWorkId(workId: string) {
  return /^[A-Za-z0-9_-]+$/.test(workId);
}

function getRawString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getCaptionAvailability(workId: string) {
  const workDir = path.join(DATA_WORKS_DIR, workId);
  const [en, ru] = await Promise.all([
    fileExists(path.join(workDir, "captions.en.srt")),
    fileExists(path.join(workDir, "captions.ru.srt")),
  ]);

  return { en, ru };
}
