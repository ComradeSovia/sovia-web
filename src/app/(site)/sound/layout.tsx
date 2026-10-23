import { getCurrentSiteLocale } from "@sovia/shared/i18n/server";
import { SoundAvailability } from "@sovia/sound/ui/sound-availability";
import type { ReactNode } from "react";

export default async function SoundLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SoundAvailability locale={await getCurrentSiteLocale()}>
      {children}
    </SoundAvailability>
  );
}
