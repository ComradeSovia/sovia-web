"use client";

import {
  COSPLAY_PHOTOS,
  getCosplayPhotoPath,
} from "@sovia/gallery/data/cosplay";
import type { GalleryCopy } from "@sovia/gallery/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./gallery.module.css";

export function CosplayPage({
  copy,
  locale,
}: {
  copy: GalleryCopy;
  locale: SiteLocale;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePhoto = activeIndex === null ? null : COSPLAY_PHOTOS[activeIndex];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeIndex !== null && !dialog.open) dialog.showModal();
    if (activeIndex === null && dialog.open) dialog.close();
  }, [activeIndex]);

  const showAdjacent = (delta: number) => {
    setActiveIndex((current) =>
      current === null
        ? null
        : (current + delta + COSPLAY_PHOTOS.length) % COSPLAY_PHOTOS.length,
    );
  };

  const photoAlt = (id: keyof GalleryCopy["photoDescriptions"]) =>
    `${copy.credit}. ${copy.photoDescriptions[id]}`;

  return (
    <section className={styles.album} aria-labelledby="cosplay-heading">
      <nav className={styles.breadcrumb} aria-label={copy.section}>
        <Link href={getSiteLocalizedPath("/gallery", locale)}>
          {copy.backToGallery}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{copy.category}</span>
      </nav>

      <div className={styles.albumHero}>
        <button
          type="button"
          className={styles.heroPhoto}
          onClick={() => setActiveIndex(0)}
          aria-label={`${copy.viewOriginal}: ${photoAlt("08")}`}
        >
          <Image
            src={getCosplayPhotoPath(8)}
            alt={photoAlt("08")}
            fill
            priority
            sizes="(min-width: 1200px) 1200px, 100vw"
            className={styles.heroImage}
          />
          <span className={styles.heroPhotoLabel}>
            01 / 12 · {copy.viewOriginal} ↗
          </span>
        </button>
        <div className={styles.heroTitle}>
          <span className={styles.kicker}>01 / {copy.category}</span>
          <h1 id="cosplay-heading">
            <span>Daily Chill</span> <span>Sovia</span>
          </h1>
          <p>{copy.albumDescription}</p>
          <div className={styles.heroCredit}>
            <span>{copy.credit}</span>
            <Link href={getSiteLocalizedPath("/characters/qi7", locale)}>
              {copy.characterLink} ↗
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.storyLead}>
        <span className={styles.kicker}>{copy.collectionLabel}</span>
        <p>{copy.photoDescriptions["08"]}</p>
      </div>

      <div className={styles.photoGrid}>
        {COSPLAY_PHOTOS.slice(1).map((photo, index) => (
          <figure
            key={photo.id}
            className={`${styles.photoCard} ${styles[photo.layout]}`}
          >
            <button
              type="button"
              onClick={() => setActiveIndex(index + 1)}
              className={styles.photoButton}
              aria-label={`${copy.viewOriginal}: ${photoAlt(photo.id)}`}
            >
              <Image
                src={getCosplayPhotoPath(photo.file)}
                alt={photoAlt(photo.id)}
                fill
                sizes="(min-width: 1200px) 800px, (min-width: 700px) 55vw, 100vw"
                className={styles.photoImage}
              />
              <span className={styles.openMark} aria-hidden="true">
                ↗
              </span>
            </button>
            <figcaption className={styles.photoCaption}>
              <span>{String(index + 2).padStart(2, "0")} / 12</span>
              <span>{copy.photoDescriptions[photo.id]}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setActiveIndex(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") showAdjacent(-1);
          if (event.key === "ArrowRight") showAdjacent(1);
        }}
        aria-label={activePhoto ? photoAlt(activePhoto.id) : copy.albumTitle}
        className={styles.lightbox}
      >
        {activePhoto && (
          <div className={styles.lightboxInner}>
            <div className={styles.lightboxTop}>
              <span>
                {String((activeIndex ?? 0) + 1).padStart(2, "0")} / 12 ·{" "}
                {copy.albumTitle}
              </span>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label={copy.close}
              >
                ×
              </button>
            </div>
            <div className={styles.lightboxImage}>
              <Image
                src={getCosplayPhotoPath(activePhoto.file)}
                alt={photoAlt(activePhoto.id)}
                width={4096}
                height={activePhoto.file === 10 ? 2730 : 2731}
                unoptimized
              />
            </div>
            <div className={styles.lightboxBottom}>
              <button
                type="button"
                onClick={() => showAdjacent(-1)}
                aria-label={copy.previous}
              >
                ←
              </button>
              <p>{copy.photoDescriptions[activePhoto.id]}</p>
              <button
                type="button"
                onClick={() => showAdjacent(1)}
                aria-label={copy.next}
              >
                →
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
