"use client";

import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import canon from "../../../../data/canon/sovia.json";
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
}: {
  id: CharacterId;
  name: string;
  sizes: string;
}) {
  return (
    <span className="relative block h-full w-full overflow-hidden rounded-full bg-block theme-grid">
      <Image
        src={"/assets/characters/" + id + "_main.png"}
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
}: {
  character: (typeof characters)[number];
  dossier: Dossier;
  copy: CharacterCopy;
}) {
  const labels = copy.labels;
  const type =
    polarizationTypes.find(
      (item) => item.type === character.polarizationType,
    ) ?? polarizationTypes[0];
  const typeDescription = copy.worldTypes[polarizationTypes.indexOf(type)];

  return (
    <dl className="grid grid-cols-2 gap-x-4 sm:gap-x-8">
      <Fact label={labels.identityNumber} value={character.identityNumber} />
      <Fact label={labels.fullName} value={dossier.fullName} />
      <div className="col-span-2 min-w-0 border-t border-ink py-3">
        <dt className="meta text-xs">{labels.worldPolarizationRate}</dt>
        <dd className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-lg font-black">{character.polarization}</span>
          <span className="bg-red px-2 py-1 text-xs font-black text-relief">
            {type.symbol}
          </span>
          <span className="text-sm font-bold">
            {copy.worldTypeNames[type.type]}
          </span>
        </dd>
        <p className="mt-2 text-sm leading-relaxed">{typeDescription}</p>
        <details className="mt-3 text-sm">
          <summary className="w-fit cursor-pointer font-bold underline underline-offset-4">
            {labels.worldTypes}
          </summary>
          <div className="mt-3 border-t border-ink pt-4">
            <div className={styles.worldCoordinate}>
              {polarizationTypes.map((item, index) => (
                <div
                  key={item.type}
                  className={`${styles.worldPoint} ${styles[`worldPoint${index}`]}`}
                  data-active={item.type === character.polarizationType}
                >
                  <span className={styles.worldSymbol}>{item.symbol}</span>
                  <span className={styles.worldPointName}>
                    {copy.worldTypeNames[item.type]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {polarizationTypes.map((item, index) => (
                <div
                  key={item.type}
                  className="min-w-0 text-xs leading-relaxed"
                >
                  <span className="font-black">
                    {item.symbol} / {copy.worldTypeNames[item.type]}
                  </span>
                  <p className="mt-1">{copy.worldTypes[index]}</p>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>
      <Fact label={labels.gender} value={dossier.gender} />
      <Fact label={labels.age} value={character.age ?? labels.unknown} />
      <Fact label={labels.languages} value={dossier.languages} />
      <Fact label={labels.nationality} value={dossier.nationality} />
      <Fact label={labels.residence} value={dossier.residence} />
      <Fact label={labels.species} value={dossier.species} />
    </dl>
  );
}

function ExpressionCarousel({
  character,
  copy,
  onOpenOriginal,
}: {
  character: (typeof characters)[number];
  copy: CharacterCopy;
  onOpenOriginal: (image: OriginalImage) => void;
}) {
  const [active, setActive] = useState(0);
  const imagePath = "/assets/characters/" + character.id + "_emote.png";
  const imageAlt = character.name + " — " + copy.views.emote;
  const showExpression = (index: number) => setActive((index + 6) % 6);

  return (
    <figure className={`${styles.galleryPanel} ${styles.expressionPanel}`}>
      <div className={styles.galleryHeading}>
        <span>02 / {copy.views.emote}</span>
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
              width: 1672,
              height: 941,
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
  locale,
  selectedId,
}: {
  copy: CharacterCopy;
  locale: SiteLocale;
  selectedId: CharacterId;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [original, setOriginal] = useState<OriginalImage | null>(null);
  const character =
    characters.find((item) => item.id === selectedId) ?? characters[0];
  const dossier = copy.dossiers[character.id];
  const heroPath = "/assets/characters/" + character.id + "_hero.png";

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
              <span className="meta">{copy.eyebrow} / 01—03</span>
              <h1>{copy.title}</h1>
            </div>
            <span className={styles.showcaseIndex}>
              {character.number} / 03
            </span>
          </header>

          <nav aria-label={copy.eyebrow} className={styles.selector}>
            {characters.map((item) => (
              <Link
                key={item.id}
                href={getSiteLocalizedPath("/characters/" + item.id, locale)}
                scroll={false}
                aria-label={item.name}
                aria-current={selectedId === item.id ? "page" : undefined}
                className={
                  styles.selectorLink +
                  (selectedId === item.id ? " " + styles.selectorActive : "")
                }
              >
                <span className={styles.selectorPortrait}>
                  <Portrait id={item.id} name={item.name} sizes="80px" />
                </span>
                <span>{item.name}</span>
              </Link>
            ))}
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
              {copy.eyebrow} / {character.identityNumber}
            </div>
            <h2 id="active-character-heading">{character.name}</h2>
            <p className={styles.fullName}>{dossier.fullName}</p>
            {character.id === "runa" && (
              <span className={styles.nameType}>{copy.labels.nameType}</span>
            )}
            <blockquote>“{dossier.quote}”</blockquote>
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

      <div className={styles.dossierSection}>
        <div className={styles.dossierHeading}>
          <span className="meta">
            {copy.eyebrow} / {character.number}
          </span>
          <h3>{character.name}</h3>
          {dossier.signature && <p>“{dossier.signature}”</p>}
        </div>
        <CharacterFacts character={character} dossier={dossier} copy={copy} />
      </div>

      <section className="space-y-8">
        <div className={styles.gallery}>
          <figure className={`${styles.galleryPanel} ${styles.portraitPanel}`}>
            <div className={styles.galleryHeading}>
              <span>01 / {copy.views.main}</span>
              <span>{character.name}</span>
            </div>
            <div className={styles.portraitImage}>
              <Image
                src={"/assets/characters/" + character.id + "_main.png"}
                alt={character.name + " — " + copy.views.main}
                fill
                sizes="(min-width: 900px) 45vw, 100vw"
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
                    src: "/assets/characters/" + character.id + "_main.png",
                    alt: character.name + " — " + copy.views.main,
                    width: 941,
                    height: 1672,
                  })
                }
                className={styles.galleryOriginal}
              >
                {copy.openOriginal} ↗
              </button>
            </figcaption>
          </figure>
          <div className={styles.gallerySide}>
            <ExpressionCarousel
              key={character.id}
              character={character}
              copy={copy}
              onOpenOriginal={setOriginal}
            />
            <figure className={`${styles.galleryPanel} ${styles.outfitPanel}`}>
              <div className={styles.galleryHeading}>
                <span>03 / {copy.views.outfit}</span>
                <span>{character.name}</span>
              </div>
              <div className={styles.outfitImage}>
                <Image
                  src={"/assets/characters/" + character.id + "_outfit.png"}
                  alt={character.name + " — " + copy.views.outfit}
                  fill
                  sizes="(min-width: 900px) 55vw, 100vw"
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
                      src: "/assets/characters/" + character.id + "_outfit.png",
                      alt: character.name + " — " + copy.views.outfit,
                      width: 1672,
                      height: 941,
                    })
                  }
                  className={styles.galleryOriginal}
                >
                  {copy.openOriginal} ↗
                </button>
              </figcaption>
            </figure>
          </div>
        </div>

        <div className="border-t-[3px] border-ink pt-6">
          <h3 className="text-xl">{copy.labels.relationships}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {dossier.relationships.map((relationship) => {
              const related = characters.find(
                (item) => item.id === relationship.id,
              );
              if (!related) return null;
              return (
                <Link
                  key={relationship.id}
                  href={getSiteLocalizedPath(
                    "/characters/" + related.id + "#character-stage",
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
