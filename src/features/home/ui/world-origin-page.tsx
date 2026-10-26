import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import { getCharacterPath } from "@sovia/shared/seo/character-path";
import Link from "next/link";
import canon from "../../../../data/canon/sovia.json";
import { getCharacterDisplayName } from "../data/character-names";
import type { HomeCopy } from "../i18n/copy";
import { WorldOriginMap } from "./world-origin-map";
import styles from "./world-origin-page.module.css";

const types = canon.worldPolarizationTypes as Array<{
  type: keyof HomeCopy["characters"]["worldTypeNames"];
  symbol: string;
}>;
const characterIds = Object.keys(canon.entities.characters) as Array<
  keyof typeof canon.entities.characters
>;

export function WorldOriginPage({
  copy,
  charactersCopy,
  locale,
}: {
  copy: HomeCopy["worldOrigin"];
  charactersCopy: HomeCopy["characters"];
  locale: SiteLocale;
}) {
  return (
    <div className="space-y-10 sm:space-y-14">
      <header className="max-w-3xl space-y-4 border-b-[3px] border-ink pb-8">
        <span className="meta">{copy.eyebrow}</span>
        <h1 className="text-4xl font-black sm:text-5xl">{copy.title}</h1>
        <p className="text-base leading-relaxed sm:text-lg">{copy.lead}</p>
        <Link
          href={getSiteLocalizedPath("/characters", locale)}
          className="inline-block text-sm font-bold underline underline-offset-4"
        >
          {copy.charactersLink} ↗
        </Link>
      </header>

      <WorldOriginMap
        title={copy.mapTitle}
        examplesLabel={copy.examplesLabel}
        origins={types.map((item, index) => ({
          ...item,
          name: charactersCopy.worldTypeNames[item.type],
          description: charactersCopy.worldTypes[index],
          characters: characterIds
            .filter(
              (id) =>
                canon.entities.characters[id].worldPolarizationType ===
                item.type,
            )
            .map((id) => ({
              name: getCharacterDisplayName(id, locale),
              portrait: canon.entities.characters[id].images.portrait,
              href: getSiteLocalizedPath(getCharacterPath(id), locale),
            })),
        }))}
      />
      <section
        className={styles.readingPanel}
        aria-labelledby="polarization-reading-heading"
      >
        <h2 id="polarization-reading-heading">{copy.reading.title}</h2>
        <p className={styles.readingIntroduction}>
          {copy.reading.introduction}
        </p>
        <dl className={styles.readingEndpoints}>
          {copy.reading.endpoints.map((endpoint) => (
            <div key={endpoint.value}>
              <dt>{endpoint.value}</dt>
              <dd>{endpoint.label}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.readingNote}>{copy.reading.note}</p>
      </section>
    </div>
  );
}
