import { getRoutes, WORLD_ORIGIN_PATH } from "@sovia/shared/constants/routes";
import { getSharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { getSiteLocalizedPath } from "@sovia/shared/i18n/site-routing";
import Link from "next/link";
import { getHomeCopy } from "../i18n/copy";
import type { OpenCultureCopy } from "../i18n/open-culture/copy";
import styles from "./open-culture-page.module.css";

export function OpenCulturePage({
  copy,
  locale,
}: {
  copy: OpenCultureCopy;
  locale: SiteLocale;
}) {
  const routes = getRoutes(getSharedCopy(locale), locale);
  const homeCopy = getHomeCopy(locale);
  const relatedLinks = [
    routes.Creator,
    {
      label: homeCopy.characters.title,
      href: getSiteLocalizedPath("/characters", locale),
    },
    {
      label: homeCopy.worldOrigin.title,
      href: getSiteLocalizedPath(WORLD_ORIGIN_PATH, locale),
    },
    routes.Contact,
  ];

  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className={styles.lead}>{copy.lead}</p>
        <p className={styles.version}>{copy.status}</p>
        <nav className={styles.navigation} aria-label={copy.title}>
          <Link href="#letter">{copy.letterTitle} ↓</Link>
          <Link href="#principles">{copy.principlesTitle} ↓</Link>
          <Link href={routes.Usage.href}>{copy.usageAction} ↗</Link>
        </nav>
      </header>

      <aside className={styles.notice}>{copy.notice}</aside>

      <section
        id="letter"
        className={styles.letter}
        aria-labelledby="letter-heading"
      >
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>01</span>
          <h2 id="letter-heading">{copy.letterTitle}</h2>
          <p>{copy.letterLabel}</p>
        </div>
        <blockquote className={styles.letterBody}>
          {copy.letter.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <footer>{copy.signature}</footer>
        </blockquote>
      </section>

      <section
        id="principles"
        className={styles.principles}
        aria-labelledby="principles-heading"
      >
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>02</span>
          <h2 id="principles-heading">{copy.principlesTitle}</h2>
        </div>
        <ol className={styles.principleList}>
          {copy.principles.map((principle, index) => (
            <li id={principle.id} key={principle.id}>
              <span className={styles.number} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{principle.title}</h3>
                <p>{principle.text}</p>
                {principle.id === "people" && (
                  <Link
                    href={`${routes.Usage.href}#cosplay`}
                    className="mt-3 inline-block text-sm font-bold underline underline-offset-4"
                  >
                    {copy.usageAction} ↗
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <details id="discussion" className={styles.discussion}>
        <summary>{copy.discussion.title}</summary>
        <div className={styles.discussionBody}>
          <p>{copy.discussion.intro}</p>
          <dl>
            {copy.discussion.items.map((item) => (
              <div key={item.title}>
                <dt>{item.title}</dt>
                <dd>{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </details>

      <section className={styles.usage} aria-labelledby="usage-heading">
        <span className={styles.eyebrow}>03</span>
        <h2 id="usage-heading">{copy.usageTitle}</h2>
        <p>{copy.usageText}</p>
        <div className={styles.actions}>
          <Link href={routes.Usage.href} className="btn-primary">
            {copy.usageAction} ↗
          </Link>
          <Link href={routes.About.href} className="btn-outline">
            {copy.aboutAction} ↗
          </Link>
        </div>
        <nav className={styles.navigation} aria-label={copy.eyebrow}>
          {relatedLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label} ↗
            </Link>
          ))}
        </nav>
      </section>
    </article>
  );
}
