export type MusicSearchEmbeddingTextInput = {
  artists?: string[] | null;
  introText?: string | null;
  musicStyle?: string | null;
  musicType?: string | null;
  productionNotes?: string | null;
  series?: string | null;
  shortDescription?: string | null;
  sourceIp?: string | null;
  sourceTitle?: string | null;
  title: string;
  workType?: string | null;
};

export function getMusicSearchEmbeddingText(
  input: MusicSearchEmbeddingTextInput,
) {
  return [
    `Sovia title: ${input.title}`,
    `Source title: ${input.sourceTitle ?? ""}`,
    `Artists: ${input.artists?.join(", ") ?? ""}`,
    `Source IP: ${input.sourceIp ?? ""}`,
    `Series: ${input.series ?? ""}`,
    `Work type: ${input.workType ?? ""}`,
    `Music type: ${input.musicType ?? ""}`,
    `Music style: ${input.musicStyle ?? ""}`,
    `Short description: ${input.shortDescription ?? ""}`,
    `Introduction: ${input.introText ?? ""}`,
    `Production notes: ${input.productionNotes ?? ""}`,
  ].join("\n");
}

export function getMusicSearchCosineSimilarity(
  left: number[],
  right: number[] | undefined,
) {
  if (!right || left.length !== right.length) return 0;

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }

  if (!leftMagnitude || !rightMagnitude) return 0;
  return Math.max(0, dotProduct / Math.sqrt(leftMagnitude * rightMagnitude));
}
