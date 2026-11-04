export type PlanReadinessInput = {
  title: string;
  artist: string;
  origin: string;
  direction: string;
  summary: string;
  status: string;
  visible: boolean;
  hasPublishedFullWork: boolean;
  hasPublicWork: boolean;
  wasCompleted: boolean;
};
export function completionNeedsWork(
  status: string,
  hasPublishedFullWork: boolean,
  wasCompleted: boolean,
) {
  return status === "COMPLETED" && !hasPublishedFullWork && !wasCompleted;
}
export function getPlanReadiness(input: PlanReadinessInput) {
  const checks: {
    key: string;
    label: string;
    level: "ready" | "warning" | "blocking";
  }[] = [
    {
      key: "title",
      label: input.title.trim()
        ? "Song title supplied"
        : "A song title is required",
      level: input.title.trim() ? "ready" : "blocking",
    },
    {
      key: "artist",
      label: input.artist.trim()
        ? "Artist supplied"
        : "Add the original artist when known",
      level: input.artist.trim() ? "ready" : "warning",
    },
    {
      key: "origin",
      label:
        input.origin.trim() && input.origin !== "Contact page"
          ? "Original work supplied"
          : "Original work / album / game is not recorded",
      level:
        input.origin.trim() && input.origin !== "Contact page"
          ? "ready"
          : "warning",
    },
    {
      key: "direction",
      label: input.direction.trim()
        ? "Private production direction recorded"
        : "Production direction is not recorded",
      level: input.direction.trim() ? "ready" : "warning",
    },
    {
      key: "summary",
      label: input.summary.trim()
        ? "Public introduction supplied"
        : "Add a public introduction; private notes are never used as a fallback",
      level: input.summary.trim() ? "ready" : "warning",
    },
  ];
  if (input.status === "COMPLETED") {
    checks.push({
      key: "completion",
      label: input.hasPublishedFullWork
        ? "A published full-match Work is linked"
        : input.wasCompleted
          ? "Historical completion retained; the matching Work is currently unavailable"
          : "Link a visible, published full-match Work before marking this plan complete",
      level: input.hasPublishedFullWork
        ? "ready"
        : input.wasCompleted
          ? "warning"
          : "blocking",
    });
    if (!input.hasPublicWork)
      checks.push({
        key: "public-work",
        label: "No playable Work link will appear on the public card",
        level: "warning",
      });
  }
  if (input.visible && input.status === "CANCELLED")
    checks.push({
      key: "cancelled",
      label:
        "Cancelled plans remain hidden, even when visibility is set to Public",
      level: "warning",
    });
  return checks;
}
