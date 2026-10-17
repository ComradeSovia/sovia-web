import { getCosplayPhotoPath } from "@sovia/gallery/data/cosplay";
import type { GalleryCopy } from "@sovia/gallery/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import Image from "next/image";
import Link from "next/link";
import styles from "./gallery.module.css";

export function GalleryLanding({
  copy,
  locale,
  title,
}: {
  copy: GalleryCopy;
  locale: SiteLocale;
  title: string;
}) {
  return (
    <section className={styles.landing} aria-labelledby="gallery-heading">
      <header className={styles.landingHeader}>
        <span className={styles.kicker}>SOVIA / {copy.section}</span>
        <h1 id="gallery-heading">{title}</h1>
        <p>{copy.albumDescription}</p>
      </header>

      <Link
        href={getSiteLocalizedPath("/gallery/cosplay", locale)}
        className={styles.collectionCard}
      >
        <Image
          src={getCosplayPhotoPath(8)}
          alt={`${copy.credit}. ${copy.photoDescriptions["08"]}`}
          fill
          priority
          sizes="(min-width: 1200px) 1100px, 100vw"
          className={styles.collectionImage}
        />
        <span className={styles.collectionShade} />
        <span className={styles.collectionContent}>
          <span className={styles.collectionMeta}>
            01 / {copy.category} · {copy.collectionLabel}
          </span>
          <span className={styles.collectionTitle}>{copy.albumTitle}</span>
          <span className={styles.collectionAction}>
            {copy.viewCollection} <span aria-hidden="true">↗</span>
          </span>
        </span>
      </Link>
    </section>
  );
}
