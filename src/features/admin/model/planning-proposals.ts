import { z } from "zod";

export const MAX_PLANNING_SOURCE = 40_000;
export const proposalFields = {
  title: z.string().trim().min(1).max(300),
  from: z.string().trim().max(500),
  sourceArtists: z.string().trim().max(1000),
  sourceUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((value) => {
      if (!value) return true;
      try {
        return ["http:", "https:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }, "Reference must be an http(s) URL"),
  requestedChanges: z.string().trim().max(800),
  notes: z.string().trim().max(2000),
  publicSummary: z.string().trim().max(2000),
  missingInfo: z.string().trim().max(800),
};
export const generatedProposalSchema = z.object({
  ...proposalFields,
  evidenceQuotes: z.array(z.string().min(1).max(2000)).min(1).max(5),
});
export const generatedProposalsSchema = z.object({
  proposals: z.array(generatedProposalSchema).max(20),
});
export const reviewedProposalSchema = z.object({
  ...proposalFields,
  key: z.string().min(1).max(100),
  evidenceQuotes: z.array(z.string().min(1).max(2000)).min(1).max(5),
  decision: z.enum(["create", "merge", "same", "skip"]),
  target: z.string().max(300),
  allowDuplicate: z.boolean(),
});
export const reviewedProposalsSchema = z.array(reviewedProposalSchema).max(20);
export type PlanningProposal = z.infer<typeof reviewedProposalSchema>;
export const planningPreviewSchema = z.object({
  sourceText: z.string().min(1).max(MAX_PLANNING_SOURCE),
  sourceName: z.string().trim().min(1).max(200),
  sourceUrl: proposalFields.sourceUrl,
  requestId: z.string().max(300).nullable(),
  requestVersion: z.iso.datetime().nullable(),
  model: z.string().max(100),
  promptKey: z.string().max(200),
  proposals: reviewedProposalsSchema,
});
export type PlanningPreview = z.infer<typeof planningPreviewSchema>;

export function normalizeSongKey(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, "");
}
export function sourceEvidence(source: string, quotes: string[]) {
  return quotes.map((quote) => {
    const start = source.indexOf(quote);
    if (start < 0)
      throw new Error(
        "A source quote could not be verified against the original text. Generate again or correct the quote.",
      );
    return { quote, start, end: start + quote.length };
  });
}
export function validateProposalSources(
  source: string,
  proposals: PlanningProposal[],
  requireSourceUrls = true,
) {
  if (new Set(proposals.map((p) => p.key)).size !== proposals.length)
    throw new Error("Proposal keys must be unique.");
  for (const proposal of proposals) {
    sourceEvidence(source, proposal.evidenceQuotes);
    if (
      requireSourceUrls &&
      proposal.sourceUrl &&
      !source.includes(proposal.sourceUrl)
    )
      throw new Error(
        "A song reference URL is absent from the original source. Leave it empty rather than inventing a link.",
      );
  }
}
export function proposalNotes(proposal: PlanningProposal) {
  return [
    proposal.requestedChanges
      ? `Audience request:\n${proposal.requestedChanges}`
      : "",
    proposal.notes ? `Production direction:\n${proposal.notes}` : "",
    proposal.missingInfo ? `Needs confirmation:\n${proposal.missingInfo}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
export function requestSourceText(request: {
  title: string;
  artist: string | null;
  origin: string | null;
  sourceUrl: string | null;
  ideas: string | null;
}) {
  return `Song title: ${request.title}\nArtist: ${request.artist ?? ""}\nOriginal work: ${request.origin ?? ""}\nReference URL: ${request.sourceUrl ?? ""}\nAdaptation request:\n${request.ideas ?? ""}`;
}
