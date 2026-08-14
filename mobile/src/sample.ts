import { Timestamp } from "firebase/firestore";
import type { Conversion } from "./types";

export const SAMPLE_INPUT = "我想跟你约个时间喝咖啡，看看你方不方便。";

const text = "I'd like to grab coffee with you sometime — does that work for you?";

export const SAMPLE_CONVERSION: Conversion = {
  id: "sample",
  sourceText: SAMPLE_INPUT,
  sourceLang: "zh",
  rewrittenText: text,
  status: "ready",
  createdAt: Timestamp.now(),
  sentences: [
    {
      text,
      audioStatus: "pending",
      tokens: [
        { text: "I'd", start: 0, end: 3, selectable: true },
        { text: "like", start: 4, end: 8, selectable: true },
        { text: "to", start: 9, end: 11, selectable: true },
        { text: "grab", start: 12, end: 16, selectable: true },
        { text: "coffee", start: 17, end: 23, selectable: true },
        { text: "with", start: 24, end: 28, selectable: true },
        { text: "you", start: 29, end: 32, selectable: true },
        { text: "sometime", start: 33, end: 41, selectable: true },
        { text: "—", start: 42, end: 43, selectable: false },
        { text: "does", start: 44, end: 48, selectable: true },
        { text: "that", start: 49, end: 53, selectable: true },
        { text: "work", start: 54, end: 58, selectable: true },
        { text: "for", start: 59, end: 62, selectable: true },
        { text: "you", start: 63, end: 66, selectable: true },
        { text: "?", start: 66, end: 67, selectable: false }
      ]
    }
  ]
};
