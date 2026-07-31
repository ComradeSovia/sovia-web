export function getAdminActionFormContext(
  context:
    | "subtitle-translation"
    | "youtube-captions"
    | "youtube-sync"
    | undefined,
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (context === "subtitle-translation") {
    return getSubtitleTranslationFormContext();
  }
  if (context === "youtube-captions") {
    return getYoutubeCaptionFormContext(input);
  }
  if (context !== "youtube-sync") return {};

  const form = Array.from(document.forms).find((candidate) =>
    Boolean(candidate.elements.namedItem("youtubePrimaryLocale")),
  );
  if (!form) return {};

  const primaryLocale = getFormValue(form, "youtubePrimaryLocale");
  if (!primaryLocale) return {};

  const locales = Array.isArray(input.locales)
    ? input.locales.filter(
        (locale): locale is string => typeof locale === "string",
      )
    : [];

  return {
    description: getFormValue(
      form,
      `youtubeLocalization.${primaryLocale}.description`,
    ),
    localizations: Object.fromEntries(
      locales.map((locale) => [
        locale,
        {
          description: getFormValue(
            form,
            `youtubeLocalization.${locale}.description`,
          ),
          title: getFormValue(form, `youtubeLocalization.${locale}.title`),
        },
      ]),
    ),
    primaryLocale,
    title: getFormValue(form, `youtubeLocalization.${primaryLocale}.title`),
  };
}

function getSubtitleTranslationFormContext() {
  const form = Array.from(document.forms).find((candidate) =>
    Boolean(candidate.elements.namedItem("subtitlePrimaryLocale")),
  );
  if (!form) return {};

  return {
    subtitleTracks: Object.fromEntries(
      Array.from(form.elements).flatMap((element) => {
        if (
          !(
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
          )
        ) {
          return [];
        }
        const match = /^subtitleTracks\.([^.]*)$/.exec(element.name);
        return match?.[1] && element.value.trim()
          ? [[match[1], element.value] as const]
          : [];
      }),
    ),
  };
}

function getYoutubeCaptionFormContext(input: Record<string, unknown>) {
  const form = Array.from(document.forms).find((candidate) =>
    Boolean(candidate.elements.namedItem("subtitlePrimaryLocale")),
  );
  if (!form) return {};

  const locales = Array.isArray(input.locales)
    ? input.locales.filter(
        (locale): locale is string => typeof locale === "string",
      )
    : [];
  return {
    tracks: Object.fromEntries(
      locales.map((locale) => [
        locale,
        getFormValue(form, `subtitleTracks.${locale}`),
      ]),
    ),
  };
}

function getFormValue(form: HTMLFormElement, name: string) {
  const control = form.elements.namedItem(name);
  if (
    control instanceof HTMLInputElement ||
    control instanceof HTMLTextAreaElement ||
    control instanceof HTMLSelectElement
  ) {
    return control.value;
  }
  return "";
}
