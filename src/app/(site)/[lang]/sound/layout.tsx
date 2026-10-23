import { SoundAvailability } from "@sovia/sound/ui/sound-availability";
import type { ReactNode } from "react";

export default async function SoundLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return <SoundAvailability locale={lang}>{children}</SoundAvailability>;
}
