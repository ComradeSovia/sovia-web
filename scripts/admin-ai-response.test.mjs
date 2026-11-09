import assert from "node:assert/strict";
import { test } from "node:test";
import { createAdminAiResponse } from "../src/features/admin/data/ai-response.ts";

const completed = {
  status: "completed",
  output: [],
  output_text: '{"candidates":[]}',
};
const truncated = {
  status: "incomplete",
  incomplete_details: { reason: "max_output_tokens" },
  output_text: '{"candidates":',
};

function mockClient(...responses) {
  const calls = [];
  return {
    calls,
    responses: {
      async create(parameters) {
        calls.push(parameters);
        assert.ok(responses.length, "unexpected extra API call");
        const response = responses.shift();
        if (response instanceof Error) throw response;
        return response;
      },
    },
  };
}

test("completed responses pass through without retry", async () => {
  const client = mockClient(completed);
  assert.equal(await createAdminAiResponse(client, {}), completed);
  assert.equal(client.calls.length, 1);
});

test("truncated JSON gets one larger-budget retry preserving request options", async () => {
  const client = mockClient(truncated, completed);
  const parameters = {
    model: "example",
    max_output_tokens: 5200,
    input: "test",
  };
  assert.equal(await createAdminAiResponse(client, parameters), completed);
  assert.deepEqual(client.calls[1], {
    ...parameters,
    max_output_tokens: 10400,
  });
});

test("repeated truncation reports token exhaustion instead of invalid JSON", async () => {
  const client = mockClient(truncated, truncated);
  await assert.rejects(
    createAdminAiResponse(client, { max_output_tokens: 20000 }),
    /output token limit/,
  );
  assert.equal(client.calls.length, 2);
  assert.equal(client.calls[1].max_output_tokens, 32000);
});

test("retry cap prevents further requests", async () => {
  const client = mockClient(truncated);
  await assert.rejects(
    createAdminAiResponse(client, { max_output_tokens: 32000 }),
    /output token limit/,
  );
  assert.equal(client.calls.length, 1);
});

test("content filtering, failed responses, refusals and empty text are distinct", async () => {
  for (const [response, message] of [
    [
      { ...truncated, incomplete_details: { reason: "content_filter" } },
      /content_filter/,
    ],
    [{ ...completed, status: "failed" }, /did not complete/],
    [
      {
        ...completed,
        output: [{ type: "message", content: [{ type: "refusal" }] }],
      },
      /declined/,
    ],
    [{ ...completed, output_text: " " }, /without any text/],
  ]) {
    const client = mockClient(response);
    await assert.rejects(createAdminAiResponse(client, {}), message);
    assert.equal(client.calls.length, 1);
  }
});

test("API failures are preserved without additional generation attempts", async () => {
  const error = new Error("rate limited");
  const client = mockClient(error);
  await assert.rejects(createAdminAiResponse(client, {}), error);
  assert.equal(client.calls.length, 1);
});
