export function assertStableContentId(
  contentId: string,
  currentContentId?: string,
) {
  if (currentContentId && currentContentId !== contentId) {
    throw new Error("Content ID cannot be changed after creation.");
  }
}

// Omitted fields keep their current value; explicit null/empty values clear it.
export function definedFields<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}
