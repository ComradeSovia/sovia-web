"use client";

import Image from "next/image";
import { useSoviaTestI18n } from "../i18n/use-sovia-test-i18n";
import { SoviaCode } from "./sovia-code.component";
import { SoviaTestLanguageSwitcher } from "./sovia-test-language-switcher.component";

export function SoviaTestTypesComponent() {
  const { copy, locale, locales, setLocale } = useSoviaTestI18n();
  const entries = Object.entries(copy.types);

  return (
    <section className="sovia-test-ui space-y-10">
      <SoviaTestLanguageSwitcher
        copy={copy}
        locale={locale}
        locales={locales}
        onLocaleChange={setLocale}
      />
      <Image
        alt={copy.typesPage.title}
        className="w-full border-[3px] border-ink bg-paper object-cover shadow-[8px_8px_0_rgb(var(--red))]"
        height={3764}
        priority
        sizes="100vw"
        src="/img/sovia-test/all_types.jpg"
        width={6688}
      />
      <div className="manifesto grid gap-8 md:grid-cols-[16rem_1fr]">
        <div className="space-y-4">
          <div className="inline-block bg-block px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-relief">
            {copy.typesPage.detailLabel}
          </div>
          <div className="bg-block p-5 text-5xl font-black leading-none text-relief">
            {entries.length}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="meta">{copy.typesPage.subtitle}</div>
            <h1 className="sovia-types-title mt-3">{copy.typesPage.title}</h1>
          </div>
          <p className="text-base font-medium leading-relaxed">
            {copy.typesPage.intro}
          </p>
          <a className="btn-primary" href="/test">
            {copy.typesPage.startTestLabel}
          </a>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {entries.map(([code, archetype]) => {
          return (
            <a
              className="card flex min-h-72 flex-col gap-5"
              href={`/test/types/${code.toLowerCase()}`}
              key={code}
            >
              <Image
                alt={`${code} ${archetype.title}`}
                className="relative z-10 aspect-square w-full border-[3px] border-ink bg-paper object-cover shadow-[6px_6px_0_rgb(var(--red))]"
                height={1254}
                sizes="(min-width: 768px) 50vw, 100vw"
                src={`/img/sovia-test/code/${code.toLowerCase()}.jpg`}
                width={1254}
              />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="meta">{copy.typesPage.codeLabel}</div>
                <div className="border-[3px] border-ink bg-paper px-3 py-2 text-xl font-black leading-none text-ink shadow-[4px_4px_0_rgb(var(--shadow))]">
                  <SoviaCode code={code} />
                </div>
              </div>

              <div className="relative z-10 space-y-3">
                <h2 className="text-[clamp(2rem,4vw,2.75rem)]">
                  {archetype.title}
                </h2>
                <p>{archetype.description}</p>
              </div>

              <div className="relative z-10 mt-auto space-y-2">
                <div className="meta">{copy.certificate.unitLabel}</div>
                <p>{archetype.unit}</p>
              </div>

              <div className="btn-outline relative z-10 w-fit">
                {copy.typesPage.detailActionLabel}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
