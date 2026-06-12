"use client";

import { getDefaultSoviaTestCopy } from "../i18n/copy";
import { useSoviaTestI18n } from "../i18n/use-sovia-test-i18n";
import type { AxisKey } from "../types";
import { SoviaTestLanguageSwitcher } from "./sovia-test-language-switcher.component";

const defaultCopy = getDefaultSoviaTestCopy();

const AXIS_ORDER: AxisKey[] = [
  "structure",
  "action",
  "influence",
  "understanding",
  "relation",
];

type SoviaTestTypeComponentProps = {
  type: string;
};

function formatText(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

export function SoviaTestTypeComponent({ type }: SoviaTestTypeComponentProps) {
  const { copy, locale, locales, setLocale } = useSoviaTestI18n();
  const code = type.toUpperCase();
  const archetype = copy.types[code] ?? defaultCopy.types[code];
  const essay = copy.typeEssays[code] ?? defaultCopy.typeEssays[code];

  if (!archetype) {
    return null;
  }

  return (
    <section className="sovia-test-ui space-y-8">
      <SoviaTestLanguageSwitcher
        copy={copy}
        locale={locale}
        locales={locales}
        onLocaleChange={setLocale}
      />
      <div className="manifesto grid gap-8 md:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="inline-block bg-block px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-relief">
            {copy.certificate.codeLabel}
          </div>
          <div className="sovia-type-code bg-block p-4 font-black leading-none text-relief [overflow-wrap:normal] [word-break:normal]">
            {formatText(copy.certificate.codeFormat, {
              code,
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="meta">{copy.typesPage.detailLabel}</div>
            <h1 className="sovia-type-title mt-3">{archetype.title}</h1>
          </div>
          <p className="text-base font-medium leading-relaxed">
            {archetype.description}
          </p>
          <div className="flex flex-wrap gap-5">
            <a className="btn-primary" href="/test">
              {copy.typesPage.startTestLabel}
            </a>
            <a className="btn-outline" href="/test/types">
              {copy.actions.types}
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card space-y-4">
          <div className="meta">{copy.certificate.systemLabel}</div>
          <p>{copy.system.name}</p>

          <div className="meta">{copy.certificate.codeLabel}</div>
          <div className="text-4xl font-black text-ink">
            {formatText(copy.certificate.codeFormat, {
              code,
            })}
          </div>

          <div className="meta">{copy.certificate.titleLabel}</div>
          <p>{archetype.title}</p>

          <div className="meta">{copy.certificate.unitLabel}</div>
          <p>{archetype.unit}</p>
        </div>

        <div className="card space-y-4">
          <div className="meta">{copy.certificate.archiveCommentLabel}</div>
          <p>{archetype.archiveComment}</p>

          <div className="meta">{copy.certificate.soviaCommentLabel}</div>
          <p>{archetype.soviaComment}</p>

          <div className="meta">{copy.certificate.authorityLabel}</div>
          <p>{copy.certificate.authority}</p>
        </div>
      </div>

      {essay && (
        <div className="card space-y-5 bg-[rgb(var(--paper))]/90">
          <div>
            <div className="meta">{copy.details.title}</div>
            <h2 className="mt-2 text-[clamp(1.75rem,4vw,2.5rem)]">
              {archetype.title}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <section className="space-y-2 border-[2px] border-ink bg-paper p-4">
              <div className="meta">{copy.details.personalityLabel}</div>
              <p className="text-sm leading-relaxed">{essay.personality}</p>
            </section>

            <section className="space-y-2 border-[2px] border-ink bg-paper p-4">
              <div className="meta">{copy.details.workLabel}</div>
              <p className="text-sm leading-relaxed">{essay.work}</p>
            </section>

            <section className="space-y-2 border-[2px] border-ink bg-paper p-4">
              <div className="meta">{copy.details.socialLabel}</div>
              <p className="text-sm leading-relaxed">{essay.social}</p>
            </section>
          </div>
        </div>
      )}

      <div className="card space-y-5">
        <div className="meta">{copy.certificate.axisLabel}</div>
        <div className="grid gap-4 md:grid-cols-5">
          {AXIS_ORDER.map((axis, index) => {
            const letter = code[index];
            const letterCopy = letter
              ? (copy.axes[axis].letters[letter] ??
                defaultCopy.axes[axis].letters[letter])
              : null;

            if (!letterCopy) {
              return null;
            }

            return (
              <div className="border-[3px] border-ink bg-paper p-4" key={axis}>
                <div className="meta break-words">{copy.axes[axis].label}</div>
                <div className="mt-2 text-3xl font-black text-ink">
                  {letter}
                </div>
                <div className="font-black leading-tight text-red">
                  {letterCopy.zhName}
                </div>
                <p className="mt-2 text-sm">{letterCopy.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
