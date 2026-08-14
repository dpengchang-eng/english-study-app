import type { Timestamp } from "firebase/firestore";

export type SourceLang = "zh" | "en" | "mixed";

export type WordToken = {
  word: string;
  definition: string;
  zh: string;
};

export type Sentence = {
  text: string;
  words: WordToken[];
};

export type ConversionResult = {
  sourceText: string;
  sourceLang: SourceLang;
  rewrittenText: string;
  sentences: Sentence[];
};

export type ConversionDoc = ConversionResult & {
  id: string;
  createdAt: Timestamp;
};

export type ReviewInterval = 0 | 1 | 3 | 7;
export type ReviewResult = "again" | "1" | "3" | "7";

export type SavedItem = {
  id: string;
  phrase: string;
  definition: string;
  sentenceContext: string;
  conversionId: string;
  createdAt: Timestamp;
  dueAt: Timestamp;
  intervalDays: ReviewInterval;
  lastResult: ReviewResult | null;
  reviewCount: number;
};

export type TabId = "convert" | "practice" | "review";
