import OpenAI from "openai";
import { z } from "zod";
import {
  getDefaultAdminPromptForTask,
  getEnabledAdminPromptByKey,
  TODO_PROPOSAL_ANALYSIS_PROMPT_TASK,
} from "./admin-prompts";

const MAX_SOURCE_TEXT_CHARS = 40_000;

const todoProposalSchema = z.object({
  proposals: z
    .array(
      z.object({
        from: z.string(),
        notes: z.string(),
        sourceArtists: z.string(),
        sourceUrl: z.string(),
        title: z.string(),
      }),
    )
    .min(1)
    .max(20),
});

export type AnalyzedTodoProposals = z.infer<typeof todoProposalSchema>;

export async function analyzeTodoProposals({
  promptKey,
  sourceText,
}: {
  promptKey?: string | null;
  sourceText: string;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const normalizedSourceText = sourceText.trim();
  if (!normalizedSourceText) throw new Error("Source text is required.");
  if (normalizedSourceText.length > MAX_SOURCE_TEXT_CHARS) {
    throw new Error(
      `Source text must be ${MAX_SOURCE_TEXT_CHARS.toLocaleString("en-US")} characters or fewer.`,
    );
  }

  const prompt = promptKey
    ? await getEnabledAdminPromptByKey(
        promptKey,
        TODO_PROPOSAL_ANALYSIS_PROMPT_TASK,
      )
    : await getDefaultAdminPromptForTask(TODO_PROPOSAL_ANALYSIS_PROMPT_TASK);
  if (!prompt) {
    throw new Error(
      promptKey
        ? "Selected prompt is disabled, missing, or belongs to a different task."
        : `Create an enabled prompt for task "${TODO_PROPOSAL_ANALYSIS_PROMPT_TASK}" first.`,
    );
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    input: [
      { content: prompt.content, role: "developer" },
      {
        content: JSON.stringify({ sourceText: normalizedSourceText }),
        role: "user",
      },
    ],
    max_output_tokens: 4_000,
    model: prompt.model,
    prompt_cache_key: `sovia:${TODO_PROPOSAL_ANALYSIS_PROMPT_TASK}`,
    ...(prompt.model.startsWith("gpt-5")
      ? { reasoning: { effort: "low" as const } }
      : {}),
    text: {
      format: {
        name: "todo_proposal_analysis",
        schema: {
          additionalProperties: false,
          properties: {
            proposals: {
              items: {
                additionalProperties: false,
                properties: {
                  from: { type: "string" },
                  notes: { type: "string" },
                  sourceArtists: { type: "string" },
                  sourceUrl: { type: "string" },
                  title: { type: "string" },
                },
                required: [
                  "title",
                  "from",
                  "sourceArtists",
                  "sourceUrl",
                  "notes",
                ],
                type: "object",
              },
              maxItems: 20,
              minItems: 1,
              type: "array",
            },
          },
          required: ["proposals"],
          type: "object",
        },
        strict: true,
        type: "json_schema",
      },
    },
  });

  const result = parseTodoProposals(response.output_text);
  const usage = response.usage;
  if (usage) {
    console.info("OpenAI response usage", {
      cachedInputTokens: usage.input_tokens_details?.cached_tokens ?? 0,
      inputTokens: usage.input_tokens,
      model: prompt.model,
      outputTokens: usage.output_tokens,
      proposalCount: result.proposals.length,
      reasoningTokens: usage.output_tokens_details?.reasoning_tokens ?? 0,
      task: TODO_PROPOSAL_ANALYSIS_PROMPT_TASK,
    });
  }

  return result;
}

function parseTodoProposals(value: string): AnalyzedTodoProposals {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("OpenAI returned invalid proposal JSON.");
  }

  const result = todoProposalSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("OpenAI returned an invalid proposal structure.");
  }

  const proposals = result.data.proposals
    .map((proposal) => ({
      from: proposal.from.trim(),
      notes: proposal.notes.trim(),
      sourceArtists: proposal.sourceArtists.trim(),
      sourceUrl: proposal.sourceUrl.trim(),
      title: proposal.title.trim(),
    }))
    .filter((proposal) => proposal.title);
  if (!proposals.length) {
    throw new Error("OpenAI did not identify any Todo proposals.");
  }

  return { proposals };
}
