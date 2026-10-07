import { getRoutes } from "@sovia/shared";
import type { SharedCopy } from "@sovia/shared/i18n/copy";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { ArrowDown, ArrowUpRight, Play } from "lucide-react";
import Link from "next/link";
import type { HomeCopy } from "../i18n/copy";
import { ConstructivistArt } from "./constructivist-art";

export function HomeHero({
  copy,
  sharedCopy,
  locale,
}: {
  copy: HomeCopy;
  sharedCopy: SharedCopy;
  locale: SiteLocale;
}) {
  const routes = getRoutes(sharedCopy, locale);
  const channels = [routes.Youtube, routes.VKVideo, routes.Bilibili];

  return (
    <div className="home-hero">
      <div className="hero-stage">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span aria-hidden="true" />
            {copy.hero.eyebrow}
          </div>
          <h1 className="hero-title">
            <span>{copy.hero.titleLineOne}</span>
            <span>
              {copy.hero.titleLineTwo}
              <i aria-hidden="true">✳</i>
            </span>
          </h1>
          <p className="hero-statement">{copy.hero.statement}</p>
          <div className="hero-actions">
            <Link href={routes.Sound.href} className="btn-primary">
              {routes.Sound.label}
              <ArrowUpRight aria-hidden="true" size={18} />
            </Link>
            <a
              href={routes.Youtube.href}
              className="hero-watch"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>
                <Play aria-hidden="true" size={15} />
              </span>
              {routes.Youtube.label}
            </a>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-halo" />
          <div className="art-coordinate">S / 01 — 55.75° N</div>
          <ConstructivistArt
            variant="monument"
            className="constructivist-sculpture"
          />
          <div className="art-caption">
            <span>СОВИЯ</span>
            <span>● / △ / □</span>
          </div>
          <div className="art-edition">01 / ∞</div>
        </div>
      </div>
      <div className="hero-bottom">
        <a className="hero-explore" href="#archive">
          <ArrowDown aria-hidden="true" size={16} />
          {copy.sovietAnime.linksTitle}
        </a>
        <div className="hero-channels">
          <span className="hero-channel-label">{copy.hero.unitLabel}</span>
          {channels.map((channel) => (
            <a
              key={channel.href}
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {channel.label}
              <ArrowUpRight aria-hidden="true" size={13} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
