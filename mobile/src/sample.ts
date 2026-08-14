import type { Conversion } from "./types";

export const SAMPLE_INPUT = "我想跟你约个时间喝咖啡，看看你方不方便。";

const text = "I'd like to grab coffee with you sometime — does that work for you?";

export function makeSampleConversion(): Conversion {
  const id = `sample-${Date.now()}`;
  return {
    id,
    clientRequestId: id,
    sourceType: "text",
    sourceText: SAMPLE_INPUT,
    sourceLang: "zh",
    outputText: text,
    status: "ready",
    createdAt: Date.now(),
    sentences: [{ id: "s0", text }]
  };
}
