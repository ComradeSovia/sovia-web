import { createHash } from "node:crypto";

export function videoCatalogKey(
  works: { u2bId?: string | null; publishedDate?: string | null }[],
  throughDate?: string,
) {
  const ids = works
    .filter(
      (work) =>
        !throughDate ||
        !work.publishedDate ||
        work.publishedDate <= throughDate,
    )
    .flatMap((work) => (work.u2bId ? [work.u2bId] : []));
  return {
    key: createHash("sha256")
      .update([...new Set(ids)].sort().join(","))
      .digest("hex"),
    duplicateVideoIds: ids.length !== new Set(ids).size,
  };
}
