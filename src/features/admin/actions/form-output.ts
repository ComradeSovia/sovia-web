import type { AdminActionFormOutputTarget } from "./types";

export type AdminActionFormOutput = {
  description?: string;
  label: string;
  name: string;
  operation?: "append";
  value: string;
};

export function getAdminActionFormOutput({
  input,
  output,
  target,
}: {
  input?: Record<string, unknown>;
  output: unknown;
  target: AdminActionFormOutputTarget;
}): AdminActionFormOutput[] {
  if (!output || typeof output !== "object" || Array.isArray(output)) return [];
  const value = output as Record<string, unknown>;

  switch (target) {
    case "description":
      return pickOutputStrings(value, [
        ["shortDescription", "Short description"],
        ["introText", "Intro text"],
        ["productionNotes", "Production notes"],
      ]);
    case "related":
      return getRelatedOutput(value);
    case "bilibili":
      return getPlatformOutput(value, "BiliBili", "bilibili");
    case "vk":
      return getPlatformOutput(value, "VK", "vk");
    case "pixiv":
      return [
        ...getPlatformOutput(value, "Pixiv", "pixiv"),
        ...(Array.isArray(value.tags)
          ? toOutput(
              "pixivTags",
              "Tags",
              value.tags.filter(isString).join(", "),
            )
          : []),
      ];
    case "subtitles":
      return getSubtitleOutput(value);
    case "youtube":
      return getYoutubeOutput(value, input);
    case "youtubeBatch":
      return getYoutubeBatchOutput(value);
  }
}

function pickOutputStrings(
  output: Record<string, unknown>,
  keys: readonly [string, string][],
) {
  return keys.flatMap(([name, label]) =>
    typeof output[name] === "string"
      ? [{ label, name, value: output[name] }]
      : [],
  );
}

function getRelatedOutput(output: Record<string, unknown>) {
  if (!Array.isArray(output.candidates)) return [];
  return output.candidates.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const value = candidate as {
      path?: unknown;
      reason?: unknown;
      title?: unknown;
      uid?: unknown;
    };
    if (!isString(value.uid) || !value.uid.trim()) return [];
    const title =
      (isString(value.title) && value.title.trim()) ||
      (isString(value.path) && value.path.trim());
    return [
      {
        description: isString(value.reason) ? value.reason : undefined,
        label: title || `CID ${value.uid}`,
        name: "relatedWorkUids",
        operation: "append" as const,
        value: value.uid,
      },
    ];
  });
}

function getPlatformOutput(
  output: Record<string, unknown>,
  label: string,
  platform: "bilibili" | "pixiv" | "vk",
) {
  return [
    ...toOutput(`${platform}Title`, `${label} title`, output.title),
    ...toOutput(
      `${platform}Description`,
      `${label} description`,
      output.description,
    ),
  ];
}

function getSubtitleOutput(output: Record<string, unknown>) {
  if (!Array.isArray(output.localizations)) return [];
  return output.localizations.flatMap((localization) => {
    if (!localization || typeof localization !== "object") return [];
    const value = localization as { locale?: unknown; srt?: unknown };
    return typeof value.locale === "string" &&
      typeof value.srt === "string" &&
      value.srt.trim()
      ? [
          {
            label: `SRT subtitles (${value.locale})`,
            name: `subtitleTracks.${value.locale}`,
            value: value.srt,
          },
        ]
      : [];
  });
}

function getYoutubeOutput(
  output: Record<string, unknown>,
  input?: Record<string, unknown>,
) {
  const locale = input?.locale;
  if (typeof locale !== "string" || !locale) return [];
  return [
    ...toOutput(
      `youtubeLocalization.${locale}.title`,
      `YouTube title (${locale})`,
      output.title,
    ),
    ...toOutput(
      `youtubeLocalization.${locale}.description`,
      `YouTube description (${locale})`,
      output.description,
    ),
  ];
}

function getYoutubeBatchOutput(output: Record<string, unknown>) {
  if (!Array.isArray(output.localizations)) return [];
  return output.localizations.flatMap((localization) => {
    if (!localization || typeof localization !== "object") return [];
    const value = localization as {
      description?: unknown;
      locale?: unknown;
      title?: unknown;
    };
    if (typeof value.locale !== "string" || !value.locale) return [];
    return [
      ...toOutput(
        `youtubeLocalization.${value.locale}.title`,
        `YouTube title (${value.locale})`,
        value.title,
      ),
      ...toOutput(
        `youtubeLocalization.${value.locale}.description`,
        `YouTube description (${value.locale})`,
        value.description,
      ),
    ];
  });
}

function toOutput(name: string, label: string, value: unknown) {
  return typeof value === "string" ? [{ label, name, value }] : [];
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
