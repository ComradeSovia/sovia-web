import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import Image from "next/image";
import Link from "next/link";
import type { HomeCopy } from "../i18n/copy";
import styles from "./about-pages.module.css";

function PathLink({
  href,
  eyebrow,
  title,
  description,
  action,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <Link href={href} className={styles.pathLink}>
      <span className={styles.pathEyebrow}>{eyebrow}</span>
      <strong>{title}</strong>
      <span className={styles.pathDescription}>{description}</span>
      <span className={styles.pathAction}>{action} ↗</span>
    </Link>
  );
}

export function AboutProjectPage({
  copy,
  locale,
}: {
  copy: HomeCopy["about"];
  locale: SiteLocale;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.projectHero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p className={styles.heroLead}>{copy.lead}</p>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <Image
            src="/assets/about/sovia.png"
            alt=""
            fill
            sizes="(min-width: 900px) 45vw, 100vw"
            className="object-cover object-top"
            priority
          />
        </div>
      </header>

      <article className={styles.article}>
        <section
          className={styles.storySection}
          aria-labelledby="about-world-heading"
        >
          <div className={styles.sectionHeading}>
            <span>01 / {copy.worldTitle}</span>
            <h2 id="about-world-heading">{copy.worldTitle}</h2>
          </div>
          <div className={styles.prose}>
            {copy.worldParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section
          className={styles.storySection}
          aria-labelledby="about-direction-heading"
        >
          <div className={styles.sectionHeading}>
            <span>02 / {copy.directionTitle}</span>
            <h2 id="about-direction-heading">{copy.directionTitle}</h2>
          </div>
          <div className={styles.prose}>
            {copy.directionParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      </article>

      <aside className={styles.distinction}>
        <span className={styles.eyebrow}>{copy.distinctionTitle}</span>
        <p>{copy.distinction}</p>
      </aside>

      <nav className={styles.paths} aria-label={copy.distinctionTitle}>
        <PathLink
          href={getSiteLocalizedPath("/creator", locale)}
          eyebrow="02"
          title={copy.creatorLinkTitle}
          description={copy.creatorLinkText}
          action={copy.creatorLinkAction}
        />
        <PathLink
          href={getSiteLocalizedPath("/characters/sovia", locale)}
          eyebrow="03"
          title={copy.characterLinkTitle}
          description={copy.characterLinkText}
          action={copy.characterLinkAction}
        />
      </nav>
    </div>
  );
}

export function CreatorPage({
  copy,
  locale,
}: {
  copy: HomeCopy["creator"];
  locale: SiteLocale;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.creatorHero}>
        <div className={styles.creatorHeroText}>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p className={styles.heroLead}>{copy.lead}</p>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <Image
            src="/assets/about/creator.png"
            alt=""
            fill
            sizes="(min-width: 900px) 45vw, 100vw"
            className="object-cover object-top"
            priority
          />
        </div>
      </header>

      <article className={styles.creatorBody}>
        <div className={styles.creatorFacts}>
          <div>
            <span>{copy.roleLabel}</span>
            <strong>{copy.roleValue}</strong>
          </div>
          <div>
            <span>{copy.locationLabel}</span>
            <strong>{copy.locationValue}</strong>
          </div>
        </div>
        <section
          className={styles.creatorStory}
          aria-labelledby="creator-story-heading"
        >
          <h2 id="creator-story-heading">{copy.storyTitle}</h2>
          <div className={styles.prose}>
            {copy.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      </article>

      <aside className={styles.distinction}>
        <span className={styles.eyebrow}>{copy.eyebrow}</span>
        <p>{copy.distinction}</p>
      </aside>

      <nav className={styles.creatorPaths} aria-label={copy.title}>
        <Link
          className={styles.pathLink}
          href={getSiteLocalizedPath("/about", locale)}
        >
          <span className={styles.pathEyebrow}>01</span>
          <strong>{copy.projectAction}</strong>
          <span className={styles.pathAction}>↗</span>
        </Link>
        <Link
          className={styles.pathLink}
          href={getSiteLocalizedPath("/characters/sovia", locale)}
        >
          <span className={styles.pathEyebrow}>03</span>
          <strong>{copy.characterAction}</strong>
          <span className={styles.pathAction}>↗</span>
        </Link>
      </nav>
    </div>
  );
}
