"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./world-origin-page.module.css";

type Origin = {
  type: string;
  symbol: string;
  name: string;
  description: string;
  characters: { name: string; href: string; portrait: string }[];
};

export function WorldOriginMap({
  title,
  examplesLabel,
  origins,
}: {
  title: string;
  examplesLabel: string;
  origins: Origin[];
}) {
  const [selected, setSelected] = useState(origins[0].type);

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.slice(1);
      setSelected(
        origins.find((origin) => origin.type === hash)?.type ?? origins[0].type,
      );
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, [origins]);

  const active =
    origins.find((origin) => origin.type === selected) ?? origins[0];
  const activeIndex = origins.indexOf(active);

  return (
    <section aria-labelledby="origin-map-heading" className={styles.explorer}>
      <div className={styles.mapHeader}>
        <h2 id="origin-map-heading">{title}</h2>
        <span aria-hidden="true">01 — 05 / {active.symbol}</span>
      </div>
      <div className={styles.explorerBody}>
        <div className={styles.map}>
          <div className={styles.stage} aria-hidden="true">
            <div className={styles.grid} />
            <div className={styles.orbit} />
            <div className={`${styles.orbit} ${styles.orbitTwo}`} />
            <div className={`${styles.orbit} ${styles.orbitThree}`} />
            <div className={styles.core} />
          </div>
          <fieldset className={styles.points} aria-label={title}>
            {origins.map((origin, index) => (
              <button
                key={origin.type}
                type="button"
                className={`${styles.point} ${styles[`point${index}`]}`}
                aria-pressed={origin.type === active.type}
                aria-controls="origin-description"
                onClick={() => {
                  setSelected(origin.type);
                  window.history.replaceState(
                    window.history.state,
                    "",
                    `#${origin.type}`,
                  );
                }}
              >
                <span className={styles.globe}>
                  <span className={styles.meridian} aria-hidden="true" />
                  <span className={styles.equator} aria-hidden="true" />
                  <span className={styles.symbol}>{origin.symbol}</span>
                </span>
                <span className={styles.pointLabel}>
                  {origin.name}
                  <span aria-hidden="true"> ↗</span>
                </span>
              </button>
            ))}
          </fieldset>
          <span className={styles.mapIndex} aria-hidden="true">
            {String(activeIndex + 1).padStart(2, "0")} / 05
          </span>
        </div>
        <div
          id="origin-description"
          className={styles.description}
          aria-live="polite"
          aria-atomic="true"
        >
          <div key={active.type} className={styles.detail}>
            <div className={styles.detailTop} aria-hidden="true">
              <span>{String(activeIndex + 1).padStart(2, "0")}</span>
              <span className={styles.detailSymbol}>{active.symbol}</span>
            </div>
            <h3>{active.name}</h3>
            <p>{active.description}</p>
            {active.characters.length > 0 && (
              <div className={styles.characters}>
                <h4>{examplesLabel}</h4>
                <ul>
                  {active.characters.map((character) => (
                    <li key={character.href}>
                      <Link href={character.href}>
                        <span className={styles.avatar}>
                          <Image
                            src={character.portrait}
                            alt=""
                            fill
                            sizes="64px"
                            className={styles.avatarImage}
                          />
                        </span>
                        <span className={styles.characterName}>
                          {character.name}
                          <span aria-hidden="true"> ↗</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
