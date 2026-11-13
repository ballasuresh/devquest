export type StreamChunk = {
  choices?: Array<{ delta?: { content?: string; role?: string }; finish_reason?: string | null }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export type LineKeeperOut = {
  text: string;
  pieces: number;
  finishReason: string;
  usage: { prompt: number; completion: number; total: number } | null;
};

export function keepLine(chunks: StreamChunk[]): LineKeeperOut {
  const parts: string[] = [];
  let pieces = 0;
  let finishReason = "";
  let usage: LineKeeperOut["usage"] = null;

  for (const chunk of chunks) {
    if (chunk.usage) {
      usage = {
        prompt: chunk.usage.prompt_tokens ?? 0,
        completion: chunk.usage.completion_tokens ?? 0,
        total: chunk.usage.total_tokens ?? 0,
      };
    }
    const first = chunk.choices?.[0];
    if (!first) continue;
    const delta = first.delta?.content ?? "";
    const fr = first.finish_reason ?? "";
    if (delta) {
      parts.push(delta);
      pieces += 1;
    }
    if (fr) finishReason = fr;
  }

  return { text: parts.join(""), pieces, finishReason: finishReason || "unknown", usage };
}

/** Demo stream used in Mission 3.5's Code stage. */
export const DEMO_CHUNKS: StreamChunk[] = [
  { choices: [{ delta: { role: "assistant" }, finish_reason: null }] },
  { choices: [{ delta: { content: "Your order " }, finish_reason: null }] },
  { choices: [{ delta: { content: "is on the " }, finish_reason: null }] },
  { choices: [{ delta: { content: "way." }, finish_reason: "stop" }] },
  { usage: { prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 } },
];
