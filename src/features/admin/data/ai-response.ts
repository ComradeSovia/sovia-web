import type OpenAI from "openai";

const MAX_RETRY_OUTPUT_TOKENS = 32_000;

export async function createAdminAiResponse(
  client: OpenAI,
  parameters: OpenAI.Responses.ResponseCreateParamsNonStreaming,
) {
  let response = await client.responses.create(parameters);
  const limit = parameters.max_output_tokens;

  // Structured Outputs can still be truncated, including by reasoning tokens.
  // Retry only that condition, once, with a bounded larger budget.
  if (
    response.status === "incomplete" &&
    response.incomplete_details?.reason === "max_output_tokens" &&
    typeof limit === "number" &&
    limit < MAX_RETRY_OUTPUT_TOKENS
  ) {
    const retryLimit = Math.min(
      MAX_RETRY_OUTPUT_TOKENS,
      Math.max(limit * 2, limit + 4_000),
    );
    console.info("Retrying truncated admin AI response", {
      model: parameters.model,
      responseId: response.id,
      maxOutputTokens: limit,
      retryMaxOutputTokens: retryLimit,
    });
    response = await client.responses.create({
      ...parameters,
      max_output_tokens: retryLimit,
    });
  }

  if (response.status === "incomplete") {
    throw new Error(
      response.incomplete_details?.reason === "max_output_tokens"
        ? "AI generation reached its output token limit, including reasoning tokens. Try a smaller request or shorter generation instructions."
        : `AI generation was incomplete (${response.incomplete_details?.reason ?? "unknown reason"}). Please retry.`,
    );
  }
  if (response.status !== "completed") {
    throw new Error(
      `AI generation did not complete (${response.status ?? "unknown status"}). Please retry.`,
    );
  }
  for (const item of response.output) {
    if (
      item.type === "message" &&
      item.content.some((part) => part.type === "refusal")
    ) {
      throw new Error(
        "The model declined this generation request. Review the source content and generation instructions.",
      );
    }
  }
  if (!response.output_text.trim()) {
    throw new Error("AI generation completed without any text. Please retry.");
  }

  return response;
}
