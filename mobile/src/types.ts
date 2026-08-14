import type { Timestamp } from "firebase/firestore";

export type SourceLang = "zh" | "en" | "mixed";
export type AudioStatus = "ready" | "pending" | "unavailable";
export type PlayUiState = "pending" | "ready" | "playing" | "unavailable";
export type ConversionStatus = "loading" | "ready" | "error";
export type SyncState = "synced" | "pending" | "error";
export type ReviewInterval = 0 | 1 | 3 | 7;
export type ReviewResult = "again" | "1" | "3" | "7";
export type QuizSize = 5 | 10 | 15;
export type SpeechRatePreset = "slow" | "normal" | "fast";
export type WordbookFilter = "all" | "due" | "mastered";
export type ClozeMode = "practice" | "review";

export type Token = {
  text: string;
  start: number;
  end: number;
  selectable: boolean;
};

export type Sentence = {
  text: string;
  tokens: Token[];
  audioStatus: AudioStatus;
};

export type Conversion = {
  id: string;
  firestoreId?: string;
  sourceText: string;
  sourceLang: SourceLang;
  rewrittenText: string;
  sentences: Sentence[];
  status: ConversionStatus;
  errorMessage?: string;
  createdAt: Timestamp | null;
};

export type LookupResult = {
  phrase: string;
  ipa: string;
  senses: string[];
  sentence: string;
  failed: boolean;
};

export type WordbookItem = {
  id: string;
  phrase: string;
  ipa: string;
  senses: string[];
  sentenceContext: string;
  conversionId: string;
  blankSpan: { start: number; end: number };
  createdAt: Timestamp;
  dueAt: Timestamp;
  intervalDays: ReviewInterval;
  lastResult: ReviewResult | null;
  reviewCount: number;
  syncState: SyncState;
};

export type PracticeCard = {
  itemId: string;
  sentence: string;
  blankSpan: { start: number; end: number };
  answer: string;
};

export type AppSettings = {
  quizSize: QuizSize;
  speechRate: SpeechRatePreset;
  cloudVoice: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  quizSize: 10,
  speechRate: "normal",
  cloudVoice: true
};

export const INPUT_CHAR_CAP = 500;
export const RECORD_MAX_MS = 30_000;
