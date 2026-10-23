import { getSharedCopy } from "@sovia/shared/i18n/copy";
import { ContentUnavailable } from "@sovia/shared/ui/content-unavailable";
import type { ReactNode } from "react";
import { checkMusicDatabaseConnection } from "../data/music-repository";

export async function SoundAvailability({
  children,
  locale,
}: {
  children: ReactNode;
  locale: string;
}) {
  const status = await checkMusicDatabaseConnection();
  if (!status.ok) {
    return <ContentUnavailable copy={getSharedCopy(locale).unavailable} />;
  }
  return children;
}
