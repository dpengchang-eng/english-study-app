import type { Timestamp } from "firebase/firestore";

export type SourceLang = "zh" | "en" | "mixed" | "unknown";
export type SourceType = "text" | "voice";
export type AudioStatus = "ready" | "pending" | "unavailable";
export type PlayUiState = "pending" | "ready" | "playing" | "unavailable";
export type ConversionStatus = "loading" | "ready" | "failed";
export type SyncState = "synced" | "pending" | "error";
export type ReviewInterval = 0 | 1 | 3 | 7;
export type ReviewResult = "again" | "1" | "3" | "7";
export type QuizSize = 5 | 10 | 15;
export type SpeechRatePreset = "slow" | "normal" | "fast";
export type WordbookFilter = "all" | "due" | "mastered";
export type ClozeMode = "practice" | "review";

export type ConvertErrorCode =
  | "quota_exceeded"
  | "input_empty"
  | "input_too_long"
  | "input_invalid"
  | "gemini_timeout"
  | "gemini_unavailable"
  | "safety"
  | "parse_error";

export type Token = {
  id: string;
  index: number;
  surface: string;
  lemma: string;
  pos: string;
  isWord: boolean;
  charStart: number;
  charEnd: number;
  text: string;
  start: number;
  end: number;
  selectable: boolean;
};

export type Sentence = {
  id: string;
  index: number;
  text: string;
  tokens: Token[];
  /** Local UI only. Never written to Firestore. */
  audioStatus?: AudioStatus;
};

export type Conversion = {
  id: string;
  firestoreId?: string;
  clientRequestId: string;
  sourceType: SourceType;
  sourceText: string;
  sourceLang: SourceLang;
  outputText: string;
  rewrittenText: string;
  sentences: Sentence[];
  status: ConversionStatus;
  errorCode?: ConvertErrorCode;
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

export const ERROR_COPY: Record<ConvertErrorCode, string> = {
  quota_exceeded: "今日转换次数已用完。绑定账号后额度会提高。",
  input_empty: "请先输入内容。",
  input_too_long: "文字太长。",
  input_invalid: "输入无效。",
  gemini_timeout: "模型超时，请再试。",
  gemini_unavailable: "模型暂时不可用，请稍后再试。",
  safety: "内容被安全策略拦截。",
  parse_error: "结果解析失败，请再试。"
};
