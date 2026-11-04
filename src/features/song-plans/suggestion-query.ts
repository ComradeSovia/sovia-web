export function songSuggestionQuery(value: string) {
  const query = value
    .normalize("NFKC")
    .replace(/[%_\\]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 200);
  return (query.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 2 ? query : "";
}
export function suggestionArtist(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return null;
  return (
    value
      .map((item) =>
        typeof item === "string"
          ? item
          : item &&
              typeof item === "object" &&
              "name" in item &&
              typeof item.name === "string"
            ? item.name
            : "",
      )
      .filter(Boolean)
      .join(", ") || null
  );
}
