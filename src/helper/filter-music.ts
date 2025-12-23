import type { MusicWork } from "@/definitions/data-type/music";

export function filterMusic(list: MusicWork[], query: string): MusicWork[] {
  if (!query.trim()) return list;

  const terms = query.toLowerCase().split(/\s+/);

  return list.filter((m) =>
    terms.every((t = "") =>
      [m.title, m.original, m.series, m.vid, m.u2bId]
        .filter(Boolean)
        .some((field) =>
          String(field ?? "")
            .toLowerCase()
            .includes(t.toLowerCase())
        )
    )
  );
}
