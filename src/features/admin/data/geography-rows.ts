// Preserve every source row when an estimated city label is not a unique identity.
// Ambiguous labels are period-scoped, preventing invented cross-period city matches.
export function preserveGeographyRows<T extends { location: string }>(
  rows: T[],
  start: string,
  end: string,
): T[] {
  const counts = new Map<string, number>();
  for (const row of rows)
    counts.set(row.location, (counts.get(row.location) ?? 0) + 1);
  return rows.map((row, index) =>
    (counts.get(row.location) ?? 0) > 1
      ? {
          ...row,
          location: `${row.location} [ambiguous ${start}/${end} row ${index + 1}]`,
        }
      : row,
  );
}
