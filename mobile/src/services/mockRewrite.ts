import type { RewriteRadio, Sentence } from "../types";

const KNOWN: Record<string, { rewrite: string; reply: string }> = {
  "我想跟你约个时间喝咖啡，看看你方不方便。": {
    rewrite: "I'd like to grab coffee with you sometime — does that work for you?",
    reply: "grab coffee 比 have a coffee 更日常。"
  },
  "你好 今天去哪里？": {
    rewrite: "Hey, where are you going today?",
    reply: "Hey 比 Hello 更口语。where are you going today 很常用。"
  },
  "你好今天去哪里？": {
    rewrite: "Hey, where are you going today?",
    reply: "Hey 比 Hello 更口语。where are you going today 很常用。"
  },
  "今天事情好多，我就先检查一下语言功能好不好用。怎么开始比较好？哦，真不错。这个功能挺好的，我每天都能推进自己的学习，再看看有意思的新闻。太感谢了。把这个苹果给我，我天天卖。": {
    rewrite:
      "Hey, today I've got a ton of stuff to do, so I'm just checking one thing.\nHow can I get started the best way?\nOh, it's awesome.\nThis feature is really great, so now I can drive my journey every day and learn some interesting news.\nThank you so much.\nGive me this apple and I'll sell it every day.",
    reply: "这几句很口语。awesome 用在这里刚刚好。"
  }
};

/** Longest-first chunks so a line like 你好今天去哪里 becomes real English. */
const CHUNKS: Array<[string, string]> = [
  ["今天去哪里", "where are you going today"],
  ["今天去哪儿", "where are you going today"],
  ["今天事情好多", "I've got a ton of stuff to do today"],
  ["怎么开始比较好", "what's the best way to get started"],
  ["太感谢了", "thank you so much"],
  ["你好", "hey"],
  ["谢谢", "thanks"],
  ["早上好", "good morning"],
  ["晚上好", "good evening"],
  ["再见", "see you"],
  ["今天", "today"],
  ["明天", "tomorrow"],
  ["昨天", "yesterday"]
].sort((a, b) => b[0].length - a[0].length) as Array<[string, string]>;

function normalizeKey(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function polishEnglish(text: string): string {
  return text
    .replace(/\bI am\b/g, "I'm")
    .replace(/\bdo not\b/g, "don't")
    .replace(/\bcannot\b/g, "can't")
    .replace(/\bit is\b/g, "it's")
    .trim();
}

function finishSentence(parts: string[]): string {
  const raw = parts.join(", ").replace(/\s+,/g, ",").replace(/,\s+/g, ", ").trim();
  if (!raw) return "I wanted to say this in more natural English.";
  const ended = /[.!?]$/.test(raw) ? raw : `${raw}.`;
  return ended.charAt(0).toUpperCase() + ended.slice(1);
}

function chineseToEnglish(text: string): string {
  const key = normalizeKey(text);
  const known = KNOWN[key] ?? KNOWN[key.replace(/\s/g, "")];
  if (known) return known.rewrite;

  let rest = key.replace(/[，。！？、,.!?]/g, " ").replace(/\s+/g, "");
  const parts: string[] = [];
  while (rest.length > 0) {
    const hit = CHUNKS.find(([zh]) => rest.startsWith(zh));
    if (hit) {
      parts.push(hit[1]);
      rest = rest.slice(hit[0].length);
      continue;
    }
    rest = rest.slice(1);
  }
  return finishSentence(parts);
}

function looksChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

export function mockReply(text: string): string {
  const key = normalizeKey(text);
  const known = KNOWN[key] ?? KNOWN[key.replace(/\s/g, "")];
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
