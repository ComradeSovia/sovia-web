import { loadAllMusicWorks } from "@/lib/load-music";
import { SoundClient } from "./client";

export const dynamic = "force-dynamic";

export default async function MusicPage() {
  const musicWorks = await loadAllMusicWorks();

  return <SoundClient musicWorks={musicWorks} />;
}
