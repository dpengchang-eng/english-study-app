export type SourceLang = "zh" | "en" | "mixed" | "unknown";
export type SourceType = "text" | "voice";
export type ConversionStatus = "loading" | "ready" | "failed";

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
  lemma: string;
  surface: string;
  isWord: boolean;
  charStart?: number;
  charEnd?: number;
};

export type Sentence = {
  id: string;
  text: string;
  tokens?: Token[];
};

export type AudioStatus = "ready" | "pending" | "unavailable";

export type SrsBox = 0 | 1 | 2 | 3;

export type WordbookItem = {
  id: string;
  phrase: string;
  ipa: string;
  senses: string[];
  sentenceContext: string;
  conversionId: string;
  blankStart: number;
  blankEnd: number;
  createdAt: number;
  dueAt: number;
  box: SrsBox;
  intervalDays: 0 | 1 | 3 | 7;
  lastResult: "again" | "1" | "3" | "7" | null;
  reviewCount: number;
  syncState: "synced" | "pending" | "error";
};

export type PracticeCard = {
  wordbookItemId: string;
  sentenceText: string;
  blankSpan: { start: number; end: number };
  hintGloss: string;
};

export type SubmitPracticeResult = {
  correct: boolean;
  expected: string;
  dueAt: number;
  box: SrsBox;
};

export type Conversion = {
  id: string;
  createdAt: number;
  /** Last convert attempt. 30s timeout uses this; chat order stays on createdAt. */
  attemptedAt?: number;
  sourceText: string;
  sentences: Sentence[];
  status: ConversionStatus;
  errorCode?: ConvertErrorCode;
  clientRequestId: string;
  sourceType: SourceType;
  sourceLang?: SourceLang;
  outputText?: string;
  syncState?: "synced" | "pending" | "error";
};

export const INPUT_CHAR_CAP = 500;
export const SERVER_TEXT_MAX = 2000;
export const SENTENCE_CAP = 15;
export const RECORD_MAX_MS = 30_000;
export const CONVERT_WAIT_MS = 30_000;
export const RECENT_CAP = 20;

export function convertAttemptedAt(item: { createdAt: number; attemptedAt?: number }): number {
  return item.attemptedAt ?? item.createdAt;
}

export function convertWaitLeftMs(item: { createdAt: number; attemptedAt?: number }, now = Date.now()): number {
  return Math.max(0, CONVERT_WAIT_MS - (now - convertAttemptedAt(item)));
}

export const ERROR_COPY: Record<ConvertErrorCode, string> = {
  quota_exceeded: "今天的转换次数用完了",
  input_empty: "先输入一句话",
  input_too_long: "这段太长了，缩短一点",
  input_invalid: "这段没法转，换个说法",
  gemini_timeout: "网有点慢，再试一次",
  gemini_unavailable: "这会儿转不了，稍后再试",
  safety: "这段内容转不了，换一句",
  parse_error: "这次没转成，再试一次"
};

export const ERROR_GO_HOME: ConvertErrorCode[] = [
  "quota_exceeded",
  "input_empty",
  "input_too_long",
  "input_invalid",
  "safety"
];
