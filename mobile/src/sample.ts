import { Timestamp } from "firebase/firestore";
import type { Conversion } from "./types";
import { toUiToken } from "./services/tokens";

export const SAMPLE_INPUT = "我想跟你约个时间喝咖啡，看看你方不方便。";

const text = "I'd like to grab coffee with you sometime — does that work for you?";

const rawTokens = [
  { surface: "I'd", charStart: 0, charEnd: 3, isWord: true },
  { surface: "like", charStart: 4, charEnd: 8, isWord: true },
  { surface: "to", charStart: 9, charEnd: 11, isWord: true },
  { surface: "grab", charStart: 12, charEnd: 16, isWord: true },
  { surface: "coffee", charStart: 17, charEnd: 23, isWord: true },
  { surface: "with", charStart: 24, charEnd: 28, isWord: true },
  { surface: "you", charStart: 29, charEnd: 32, isWord: true },
  { surface: "sometime", charStart: 33, charEnd: 41, isWord: true },
  { surface: "—", charStart: 42, charEnd: 43, isWord: false },
  { surface: "does", charStart: 44, charEnd: 48, isWord: true },
  { surface: "that", charStart: 49, charEnd: 53, isWord: true },
  { surface: "work", charStart: 54, charEnd: 58, isWord: true },
  { surface: "for", charStart: 59, charEnd: 62, isWord: true },
  { surface: "you", charStart: 63, charEnd: 66, isWord: true },
  { surface: "?", charStart: 66, charEnd: 67, isWord: false }
];

export const SAMPLE_CONVERSION: Conversion = {
  id: "sample",
  clientRequestId: "sample",
  sourceType: "text",
  sourceText: SAMPLE_INPUT,
  sourceLang: "zh",
  outputText: text,
  rewrittenText: text,
  status: "ready",
  createdAt: Timestamp.now(),
  sentences: [
    {
      id: "s0",
      index: 0,
      text,
      tokens: rawTokens.map((token, index) => toUiToken({ ...token, id: `s0_t${index}`, index }, index))
    }
  ]
};
