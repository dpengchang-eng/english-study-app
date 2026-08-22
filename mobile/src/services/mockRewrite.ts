import type { RewriteRadio, Sentence } from "../types";

const KNOWN: Record<string, { rewrite: string; reply: string }> = {
  "我想跟你约个时间喝咖啡，看看你方不方便。": {
    rewrite: "I'd like to grab coffee with you sometime — does that work for you?",
    reply: "grab coffee 比 have a coffee 更日常。"
  }
};

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function hash(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i += 1) n = (n * 31 + text.charCodeAt(i)) >>> 0;
  return n;
}

function polishEnglish(text: string): string {
  return text
    .replace(/\bI am\b/g, "I'm")
    .replace(/\bdo not\b/g, "don't")
    .replace(/\bcannot\b/g, "can't")
    .replace(/\bit is\b/g, "it's")
    .trim();
}

function chineseToEnglish(text: string): string {
  const known = KNOWN[text.trim()];
  if (known) return known.rewrite;
  const n = hash(text) % 4;
  const clipped = text.replace(/\s+/g, " ").slice(0, 80);
  const openers = [
    `Just noting this down: ${clipped}.`,
    `Here's what I wanted to say — ${clipped}.`,
    `Real talk: ${clipped}.`,
    `Quick note from today: ${clipped}.`
  ];
  return openers[n] ?? openers[0];
}

function looksChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

export function mockReply(text: string): string {
  const known = KNOWN[text.trim()];
  if (known) return known.reply;
  if (looksChinese(text)) return "这句已经改成更日常的说法，可以挖一两个词练一下。";
  return "This already sounds natural. Blank a word or two and practice.";
}

export function mockRewrite(text: string): { rewrite: string; sentences: Sentence[]; reply: string } {
  const trimmed = text.trim();
  const rewrite = looksChinese(trimmed) ? chineseToEnglish(trimmed) : polishEnglish(trimmed);
  const sentences = splitSentences(rewrite).map((line, index) => ({ id: `s${index}`, text: line }));
  return {
    rewrite,
    sentences: sentences.length > 0 ? sentences : [{ id: "s0", text: rewrite }],
    reply: mockReply(trimmed)
  };
}

export function applyRadio(
  body: string,
  radio: RewriteRadio
): { rewrite: string; sentences: Sentence[]; reply: string } {
  if (radio === 0) {
    return { rewrite: "", sentences: [], reply: "" };
  }
  const result = mockRewrite(body);
  if (radio === 1) return { ...result, reply: "" };
  return result;
}

export function titleFromBody(title: string, body: string): string {
  const trimmed = title.trim();
  if (trimmed) return trimmed;
  const first = body.trim().split(/\n/)[0] ?? "";
  return first.slice(0, 18) || "未命名";
}
