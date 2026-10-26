"use client";

import { getCosplayPhotoPath } from "@sovia/gallery/data/cosplay";
import type { GalleryCopy } from "@sovia/gallery/i18n/copy";
import { WORLD_ORIGIN_PATH } from "@sovia/shared/constants/routes";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import { getCharacterPath } from "@sovia/shared/seo/character-path";
import { Backpack, Heart, Sparkles, ThumbsDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import canon from "../../../../data/canon/sovia.json";
import { getCharacterDisplayName } from "../data/character-names";
import type { HomeCopy } from "../i18n/copy";
import styles from "./characters-page.module.css";

const characters = [
  {
    id: "sovia",
    name: canon.entities.characters.sovia.displayName,
    number: "01",
    identityNumber: canon.entities.characters.sovia.identityNumber,
    polarization: canon.entities.characters.sovia.worldPolarizationRate,
    polarizationType: canon.entities.characters.sovia.worldPolarizationType,
    age: String(canon.entities.characters.sovia.age),
  },
  {
    id: "kata",
    name: canon.entities.characters.kata.displayName,
    number: "02",
    identityNumber: canon.entities.characters.kata.identityNumber,
    polarization: canon.entities.characters.kata.worldPolarizationRate,
    polarizationType: canon.entities.characters.kata.worldPolarizationType,
    age: String(canon.entities.characters.kata.age),
  },
  {
    id: "runa",
    name: canon.entities.characters.runa.displayName,
    number: "03",
    identityNumber: canon.entities.characters.runa.identityNumber,
    polarization: canon.entities.characters.runa.worldPolarizationRate,
    polarizationType: canon.entities.characters.runa.worldPolarizationType,
    age: null,
  },
  {
    id: "qi7",
    name: canon.entities.characters.qi7.displayName,
    number: "04",
    identityNumber: canon.entities.characters.qi7.identityNumber,
    polarization: canon.entities.characters.qi7.worldPolarizationRate,
    polarizationType: canon.entities.characters.qi7.worldPolarizationType,
    age: null,
  },
  {
    id: "hina",
    name: canon.entities.characters.hina.displayName,
    number: "05",
    identityNumber: canon.entities.characters.hina.identityNumber,
    polarization: canon.entities.characters.hina.worldPolarizationRate,
    polarizationType: canon.entities.characters.hina.worldPolarizationType,
    age: null,
  },
  {
    id: "kio",
    name: canon.entities.characters.kio.displayName,
    number: "06",
    identityNumber: canon.entities.characters.kio.identityNumber,
    polarization: canon.entities.characters.kio.worldPolarizationRate,
    polarizationType: canon.entities.characters.kio.worldPolarizationType,
    age: null,
  },
  {
    id: "lucy",
    name: canon.entities.characters.lucy.displayName,
    number: "07",
    identityNumber: canon.entities.characters.lucy.identityNumber,
    polarization: canon.entities.characters.lucy.worldPolarizationRate,
    polarizationType: canon.entities.characters.lucy.worldPolarizationType,
    age: null,
  },
  {
    id: "lucy-m",
    name: canon.entities.characters["lucy-m"].displayName,
    number: "08",
    identityNumber: canon.entities.characters["lucy-m"].identityNumber,
    polarization: canon.entities.characters["lucy-m"].worldPolarizationRate,
    polarizationType: canon.entities.characters["lucy-m"].worldPolarizationType,
    age: null,
  },
] as const;
const polarizationTypes = canon.worldPolarizationTypes as Array<{
  type: keyof HomeCopy["characters"]["worldTypeNames"];
  symbol: string;
}>;
const expressionSlots = [1, 2, 3, 4, 5, 6] as const;

export type CharacterId = (typeof characters)[number]["id"];
type CharacterCopy = HomeCopy["characters"];
type Dossier = CharacterCopy["dossiers"]["sovia"];
type OriginalImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

function Portrait({
  id,
  name,
  sizes,
  src,
}: {
  src?: string;
  id: CharacterId;
  name: string;
  sizes: string;
}) {
  return (
    <span className="relative block h-full w-full overflow-hidden rounded-full bg-block theme-grid">
      <Image
        src={src ?? "/assets/characters/" + id + "_main.png"}
        alt={name}
        fill
        sizes={sizes}
        className="origin-top scale-[1.65] object-cover object-top"
      />
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-t border-ink py-3">
      <dt className="meta text-xs">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold sm:text-base">
        {value}
      </dd>
    </div>
  );
}

function CharacterFacts({
  character,
  dossier,
  copy,
  locale,
}: {
  character: (typeof characters)[number];
  dossier: Dossier;
  copy: CharacterCopy;
  locale: SiteLocale;
}) {
  const labels = copy.labels;
  const profile = canon.entities.characters[character.id];
  const ageFallback =
    "ageDisplay" in profile && profile.ageDisplay === "Undisclosed"
      ? labels.undisclosed
      : labels.unknown;
  const type = polarizationTypes.find(
    (item) => item.type === character.polarizationType,
  );

  return (
    <div className={styles.factGroups}>
      <section className={styles.factsCard}>
        <h4>{copy.profileSections.basics}</h4>
        <dl className={styles.quickFacts}>
          <Fact label={labels.gender} value={dossier.gender} />
          <Fact label={labels.age} value={character.age ?? ageFallback} />
          <Fact label={labels.height} value={dossier.height} />
          <Fact label={labels.species} value={dossier.species} />
        </dl>
        <dl className={styles.factsGrid}>
          <Fact label={labels.fullName} value={dossier.fullName} />
          <Fact
            label={labels.identityNumber}
            value={character.identityNumber ?? labels.undisclosed}
          />
          <Fact label={labels.nationality} value={dossier.nationality} />
          <Fact label={labels.residence} value={dossier.residence} />
          <Fact label={labels.languages} value={dossier.languages} />
        </dl>
      </section>
      <section className={styles.worldRecord}>
        <h4>{copy.profileSections.world}</h4>
        <dl>
          <div>
            <dt>{labels.worldOrigin}</dt>
            <dd>{dossier.origin}</dd>
          </div>
          <div>
            <dt>{labels.worldPolarizationRate}</dt>
            <dd>{character.polarization ?? labels.undisclosed}</dd>
          </div>
        </dl>
        <Link
          href={getSiteLocalizedPath(
            WORLD_ORIGIN_PATH + (type ? "#" + type.type : ""),
            locale,
          )}
          title={type ? copy.worldTypeNames[type.type] : labels.undisclosed}
        >
          <span className={styles.originSymbol}>{type?.symbol ?? "?"}</span>
          <span>
            {labels.worldTypes} <span aria-hidden="true">↗</span>
          </span>
        </Link>
      </section>
    </div>
  );
}

function CharacterNotes({
  dossier,
  copy,
  draftFields,
}: {
  dossier: Dossier;
  copy: CharacterCopy;
  draftFields: readonly string[];
}) {
  const isDraft = draftFields.some((field) => field !== "heightCm");
  const draftBadge = (field: string) =>
    draftFields.includes(field) ? (
      <span className={styles.fieldDraft}>{copy.profileSections.draft}</span>
    ) : null;
  return (
    <section
      className={styles.characterNotes}
      aria-labelledby="character-notes-heading"
    >
      <header className={styles.notesHeader}>
        <h3 id="character-notes-heading">{copy.profileSections.daily}</h3>
      </header>
      {isDraft && (
        <p className={styles.draftNote}>{copy.profileSections.draftNote}</p>
      )}
      <div className={styles.personalityRow}>
        <h4>
          {copy.labels.personality}
          {draftBadge("personality")}
        </h4>
        <ul>
          {dossier.personality.map((trait) => (
            <li key={trait}>{trait}</li>
          ))}
        </ul>
      </div>
      <div className={styles.notesGrid}>
        <article className={styles.noteCard} data-kind="likes">
          <h4>
            <Heart size={18} aria-hidden="true" />
            {copy.labels.likes}
            {draftBadge("likes")}
          </h4>
          <p>{dossier.likes}</p>
        </article>
        <article className={styles.noteCard} data-kind="dislikes">
          <h4>
            <ThumbsDown size={18} aria-hidden="true" />
            {copy.labels.dislikes}
            {draftBadge("dislikes")}
          </h4>
          <p>{dossier.dislikes}</p>
        </article>
        <article className={styles.noteCard}>
          <h4>
            <Sparkles size={18} aria-hidden="true" />
            {copy.labels.strengths}
            {draftBadge("strengths")}
          </h4>
          <ul>
            {dossier.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </article>
        <article className={styles.noteCard}>
          <h4>
            <Backpack size={18} aria-hidden="true" />
            {copy.labels.items}
            {draftBadge("items")}
          </h4>
          <ul>
            {dossier.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

function ExpressionCarousel({
  character,
  copy,
  onOpenOriginal,
  artwork,
}: {
  artwork?: { src: string; width: number; height: number };
  character: (typeof characters)[number];
  copy: CharacterCopy;
  onOpenOriginal: (image: OriginalImage) => void;
}) {
  const [active, setActive] = useState(0);
  const imagePath =
    artwork?.src ?? "/assets/characters/" + character.id + "_emote.png";
  const imageAlt = character.name + " — " + copy.views.emote;
  const showExpression = (index: number) => setActive((index + 6) % 6);

  return (
    <figure className={`${styles.galleryPanel} ${styles.expressionPanel}`}>
      <div className={styles.galleryHeading}>
        <span>03 / {copy.views.emote}</span>
        <span aria-live="polite">
          {String(active + 1).padStart(2, "0")} / 06
        </span>
      </div>
      <div
        key={character.id + "-expression-" + active}
        className={styles.expressionImage}
        role="img"
        aria-label={`${imageAlt} ${active + 1} / 6`}
        style={{
          aspectRatio: artwork
            ? (artwork.width * 2) / (artwork.height * 3)
            : undefined,
          backgroundImage: `url("${imagePath}")`,
          backgroundPosition: `${(active % 3) * 50}% ${Math.floor(active / 3) * 100}%`,
        }}
      />
      <figcaption className={styles.galleryFooter}>
        <div className={styles.expressionControls}>
          <button
            type="button"
            onClick={() => showExpression(active - 1)}
            aria-label={`${copy.views.emote} ${((active + 5) % 6) + 1} / 6`}
          >
            ←
          </button>
          <div className={styles.expressionDots}>
            {expressionSlots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => showExpression(slot - 1)}
                aria-label={`${copy.views.emote} ${slot} / 6`}
                aria-current={active === slot - 1 ? "true" : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => showExpression(active + 1)}
            aria-label={`${copy.views.emote} ${((active + 1) % 6) + 1} / 6`}
          >
            →
          </button>
        </div>
        <button
          type="button"
          onClick={() =>
            onOpenOriginal({
              src: imagePath,
              alt: imageAlt,
              width: artwork?.width ?? 1672,
              height: artwork?.height ?? (character.id === "hina" ? 940 : 941),
            })
          }
          className={styles.galleryOriginal}
        >
          {copy.openOriginal} ↗
        </button>
      </figcaption>
    </figure>
  );
}

export function CharactersPage({
  copy,
  cosplayCopy,
  modelViewerCopy,
  locale,
  selectedId,
}: {
  copy: CharacterCopy;
  cosplayCopy: GalleryCopy;
  modelViewerCopy: SharedCopy["pages"]["modelViewer"];
  locale: SiteLocale;
  selectedId: CharacterId;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const [selectorOverflow, setSelectorOverflow] = useState({
    start: false,
    end: false,
  });
  const [original, setOriginal] = useState<OriginalImage | null>(null);
  const localizedCharacters = characters.map((item) => ({
    ...item,
    name: getCharacterDisplayName(item.id, locale),
  }));
  const character =
    localizedCharacters.find((item) => item.id === selectedId) ??
    localizedCharacters[0];
  const dossier = copy.dossiers[character.id];
  const profile = canon.entities.characters[character.id];
  const artwork = profile.images;
  const imageDimensions =
    "imageDimensions" in profile ? profile.imageDimensions : undefined;
  const heroPath = artwork.hero;

  useEffect(() => {
    const viewport = selectorRef.current;
    if (!viewport) return;

    const isHorizontal = () =>
      window.getComputedStyle(viewport).overflowX === "auto";
    const updateOverflow = () => {
      const horizontal = isHorizontal();
      const position = horizontal ? viewport.scrollLeft : viewport.scrollTop;
      const remaining = horizontal
        ? viewport.scrollWidth - viewport.clientWidth - position
        : viewport.scrollHeight - viewport.clientHeight - position;
      const start = position > 1;
      const end = remaining > 1;
      setSelectorOverflow((previous) =>
        previous.start === start && previous.end === end
          ? previous
          : { start, end },
      );
    };
    const revealSelected = () => {
      const selected = viewport.querySelector<HTMLAnchorElement>(
        `[data-character-id="${selectedId}"]`,
      );
      if (selected) {
        const horizontal = isHorizontal();
        const bounds = viewport.getBoundingClientRect();
        const item = selected.getBoundingClientRect();
        const before = horizontal
          ? item.left - bounds.left - 16
          : item.top - bounds.top - 16;
        const after = horizontal
          ? item.right - bounds.right + 16
          : item.bottom - bounds.bottom + 16;
        const delta = before < 0 ? before : after > 0 ? after : 0;
        if (delta) {
          viewport.scrollBy(horizontal ? { left: delta } : { top: delta });
        }
      }
      updateOverflow();
    };

    const observer = new ResizeObserver(revealSelected);
    observer.observe(viewport);
    if (viewport.firstElementChild)
      observer.observe(viewport.firstElementChild);
    viewport.addEventListener("scroll", updateOverflow, { passive: true });
    revealSelected();
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", updateOverflow);
    };
  }, [selectedId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (original && !dialog.open) dialog.showModal();
    if (!original && dialog.open) dialog.close();
  }, [original]);

  return (
    <div className="space-y-10 sm:space-y-14">
      <section
        id="character-stage"
        aria-labelledby="active-character-heading"
        className={styles.showcase}
        data-character={character.id}
      >
        <div className={styles.showcaseInner}>
          <header className={styles.showcaseTopline}>
            <div>
              <span className="meta">
                {copy.eyebrow} / 01—{String(characters.length).padStart(2, "0")}
              </span>
              <h1>{copy.title}</h1>
            </div>
            <span className={styles.showcaseIndex}>
              {character.number} / {String(characters.length).padStart(2, "0")}
            </span>
          </header>

          <nav aria-label={copy.eyebrow} className={styles.selector}>
            <div
              ref={selectorRef}
              className={styles.selectorScroll}
              data-overflow-start={selectorOverflow.start}
              data-overflow-end={selectorOverflow.end}
            >
              <div className={styles.selectorItems}>
                {localizedCharacters.map((item) => (
                  <Link
                    key={item.id}
                    href={getSiteLocalizedPath(
                      getCharacterPath(item.id),
                      locale,
                    )}
                    scroll={false}
                    aria-label={item.name}
                    data-character-id={item.id}
                    aria-current={selectedId === item.id ? "page" : undefined}
                    className={
                      styles.selectorLink +
                      (selectedId === item.id
                        ? " " + styles.selectorActive
                        : "")
                    }
                  >
                    <span className={styles.selectorPortrait}>
                      <Portrait
                        id={item.id}
                        name={
                          item.id === character.id ? character.name : item.name
                        }
                        sizes="80px"
                        src={
                          item.id === character.id
                            ? artwork.portrait
                            : undefined
                        }
                      />
                    </span>
                    <span>
                      {item.id === character.id ? character.name : item.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <div key={character.id + "-artwork"} className={styles.heroArtwork}>
            <Image
              src={heroPath}
              alt={character.name + " — " + copy.views.hero}
              fill
              sizes="(min-width: 1200px) 900px, (min-width: 768px) 70vw, 100vw"
              className={styles.artworkImage}
              priority
            />
          </div>

          <div
            key={character.id + "-dossier"}
            className={styles.showcaseInfo}
            aria-live="polite"
            aria-atomic="true"
          >
            <div className={styles.infoKicker}>
              {copy.eyebrow} /{" "}
              {character.identityNumber ?? copy.labels.undisclosed}
            </div>
            <h2 id="active-character-heading">{character.name}</h2>
            <p className={styles.fullName}>
              {character.id === "qi7" &&
              (locale === "zh-CN" || locale === "zh-TW")
                ? canon.entities.characters.qi7.displayName
                : dossier.fullName}
            </p>
            {character.id === "runa" && (
              <span className={styles.nameType}>{copy.labels.nameType}</span>
            )}
            {canon.entities.characters[character.id].quotes.length > 0 && (
              <blockquote>“{dossier.quote}”</blockquote>
            )}
            <p className={styles.identity}>{dossier.identity}</p>
            <p className={styles.biography}>{dossier.biography}</p>
            <button
              type="button"
              onClick={() =>
                setOriginal({
                  src: heroPath,
                  alt: character.name + " — " + copy.views.hero,
                  width: 1254,
                  height: 1254,
                })
              }
              className={styles.originalButton}
            >
              {copy.openOriginal} ↗
            </button>
          </div>
        </div>
      </section>

      <section
        className={styles.dossierSection}
        aria-labelledby="character-dossier-heading"
      >
        <figure className={`${styles.galleryPanel} ${styles.portraitPanel}`}>
          <div className={styles.galleryHeading}>
            <span>01 / {copy.views.main}</span>
            <span>{character.name}</span>
          </div>
          <div className={styles.portraitImage}>
            <Image
              src={artwork.portrait}
              alt={character.name + " — " + copy.views.main}
              fill
              sizes="(min-width: 900px) 40vw, 100vw"
              className="object-contain object-bottom"
            />
          </div>
          <figcaption className={styles.galleryFooter}>
            <span>
              {character.name} / {copy.views.main}
            </span>
            <button
              type="button"
              onClick={() =>
                setOriginal({
                  src: artwork.portrait,
                  alt: character.name + " — " + copy.views.main,
                  width:
                    imageDimensions?.portrait.width ??
                    (character.id === "hina" || character.id === "kio"
                      ? 1024
                      : 941),
                  height:
                    imageDimensions?.portrait.height ??
                    (character.id === "hina" || character.id === "kio"
                      ? 1536
                      : 1672),
                })
              }
              className={styles.galleryOriginal}
            >
              {copy.openOriginal} ↗
            </button>
          </figcaption>
        </figure>
        <div className={styles.dossierContent}>
          <div className={styles.dossierHeading}>
            <span className="meta">
              {copy.eyebrow} / {character.number}
            </span>
            <h3 id="character-dossier-heading">{character.name}</h3>
            {dossier.signature && <p>“{dossier.signature}”</p>}
          </div>
          <CharacterFacts
            character={character}
            dossier={dossier}
            copy={copy}
            locale={locale}
          />
        </div>
      </section>

      <CharacterNotes
        dossier={dossier}
        copy={copy}
        draftFields={profile.draftFields}
      />

      <section className="space-y-8">
        <div className={styles.gallery} data-character={character.id}>
          <figure className={`${styles.galleryPanel} ${styles.outfitPanel}`}>
            <div className={styles.galleryHeading}>
              <span>02 / {copy.views.outfit}</span>
              <span>{character.name}</span>
            </div>
            <div className={styles.outfitImage}>
              <Image
                src={artwork.outfits}
                alt={character.name + " — " + copy.views.outfit}
                fill
                sizes="(min-width: 900px) 60vw, 100vw"
                className="object-contain object-bottom"
              />
            </div>
            <figcaption className={styles.galleryFooter}>
              <span>
                {character.name} / {copy.views.outfit}
              </span>
              <button
                type="button"
                onClick={() =>
                  setOriginal({
                    src: artwork.outfits,
                    alt: character.name + " — " + copy.views.outfit,
                    width: imageDimensions?.outfits.width ?? 1672,
                    height: imageDimensions?.outfits.height ?? 941,
                  })
                }
                className={styles.galleryOriginal}
              >
                {copy.openOriginal} ↗
              </button>
            </figcaption>
          </figure>
          <ExpressionCarousel
            key={character.id}
            artwork={
              imageDimensions
                ? { src: artwork.expressions, ...imageDimensions.expressions }
                : undefined
            }
            character={character}
            copy={copy}
            onOpenOriginal={setOriginal}
          />
        </div>

        <div className="border-t-[3px] border-ink pt-6">
          <h3 className="text-xl">{copy.labels.relationships}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {dossier.relationships.map((relationship) => {
              const related = localizedCharacters.find(
                (item) => item.id === relationship.id,
              );
              if (!related) return null;
              return (
                <Link
                  key={relationship.id}
                  href={getSiteLocalizedPath(
                    getCharacterPath(related.id) + "#character-stage",
                    locale,
                  )}
                  className={
                    "group flex min-w-0 items-center gap-4 border-2 border-ink bg-paper p-4 text-left hover-bg-yellow hover-text-block focus-visible:outline-2 focus-visible:outline-offset-4 sm:p-5 " +
                    styles.relatedCard
                  }
                >
                  <span className="block h-16 w-16 shrink-0 rounded-full border-2 border-ink sm:h-20 sm:w-20">
                    <Portrait
                      id={related.id}
                      name={related.name}
                      sizes="80px"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-black uppercase">
                      {related.name} ↗
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed">
                      {relationship.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {(character.id === "sovia" || character.id === "qi7") && (
          <section className="border-t-[3px] border-ink pt-6">
            <h3 className="text-xl">{copy.labels.relatedLinks}</h3>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <Link
                href={getSiteLocalizedPath("/gallery/cosplay", locale)}
                className={styles.relatedLinkCard}
              >
                <span className={styles.relatedLinkImage}>
                  <Image
                    src={getCosplayPhotoPath(8)}
                    alt={`${cosplayCopy.credit}. ${cosplayCopy.photoDescriptions["08"]}`}
                    fill
                    sizes="(min-width: 900px) 240px, 100vw"
                    className="object-cover"
                  />
                </span>
                <span className={styles.relatedLinkText}>
                  <span className="meta">
                    {cosplayCopy.category} /{" "}
                    {getCharacterDisplayName("qi7", locale)}
                  </span>
                  <strong>{cosplayCopy.albumTitle}</strong>
                  <span>{cosplayCopy.teaser}</span>
                  <span className={styles.relatedLinkAction}>
                    {cosplayCopy.viewCollection} ↗
                  </span>
                </span>
              </Link>
              {character.id === "sovia" && (
                <Link
                  href={getSiteLocalizedPath("/lab/model-viewer", locale)}
                  className={styles.relatedLinkCard}
                >
                  <span
                    className={`${styles.relatedLinkImage} ${styles.modelLinkImage}`}
                  >
                    <Image
                      src="/assets/characters/sovia_hero.png"
                      alt=""
                      fill
                      sizes="(min-width: 900px) 240px, 100vw"
                      className="object-contain"
                    />
                  </span>
                  <span className={styles.relatedLinkText}>
                    <span className="meta">VRM / SOVIA</span>
                    <strong>{modelViewerCopy.title}</strong>
                    <span>{modelViewerCopy.description}</span>
                    <span className={styles.relatedLinkAction}>
                      {modelViewerCopy.open} ↗
                    </span>
                  </span>
                </Link>
              )}
            </div>
          </section>
        )}
      </section>

      <dialog
        ref={dialogRef}
        onClose={() => setOriginal(null)}
        aria-label={original?.alt}
        className="fixed inset-0 z-50 m-auto max-h-[95dvh] w-[min(96vw,1100px)] max-w-none border-2 border-ink bg-block p-3 text-relief shadow-ink backdrop:bg-black/85 sm:p-5"
      >
        <div className="mb-3 flex items-center justify-between gap-4 border-b border-ink pb-3">
          <span className="text-sm font-bold">{original?.alt}</span>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-11 min-w-11 border border-ink text-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={copy.closeOriginal}
          >
            ×
          </button>
        </div>
        {original && (
          <Image
            src={original.src}
            alt={original.alt}
            width={original.width}
            height={original.height}
            className="mx-auto max-h-[calc(95dvh-6rem)] w-auto max-w-full object-contain"
            unoptimized
          />
        )}
      </dialog>
    </div>
  );
}
