export async function readMcpRequestJson(
  request: Request,
  maxBytes = 4 * 1024 * 1024,
): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new RangeError("Request body is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Empty body.");
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RangeError("Request body is too large.");
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } finally {
    reader.releaseLock();
  }
}
