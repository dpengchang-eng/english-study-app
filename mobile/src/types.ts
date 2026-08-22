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

export type Sentence = {
  id: string;
  text: string;
};

export type Conversion = {
  id: string;
  createdAt: number;
  sourceText: string;
  sentences: Sentence[];
  status: ConversionStatus;
  errorCode?: ConvertErrorCode;
  clientRequestId: string;
  sourceType: SourceType;
  sourceLang?: SourceLang;
  outputText?: string;
};

export const INPUT_CHAR_CAP = 5000;
export const SERVER_TEXT_MAX = 2000;
export const SENTENCE_CAP = 15;
export const RECORD_MAX_MS = 30_000;
export const CONVERT_WAIT_MS = 30_000;
export const RECENT_CAP = 20;

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

export const UNCATEGORIZED_ID = "uncategorized";
export const DEMO_USER_ID = "OIO-377YEQ";

/** 0 original-only, 1 rewrite, 2 rewrite + short reply. Official radio copy was truncated. */
export type RewriteRadio = 0 | 1 | 2;

export type Blank = {
  id: string;
  sentenceId: string;
  start: number;
  end: number;
  answer: string;
};

export type JournalCard = {
  id: string;
  collectionId: string;
  title: string;
  body: string;
  rewrite: string;
  sentences: Sentence[];
  reply: string;
  images: string[];
  blanks: Blank[];
  createdAt: number;
  rewriteRadio: RewriteRadio;
};

export type Collection = {
  id: string;
  name: string;
};

export type SortOrder = "newest" | "oldest";

export type LanguageSettings = {
  uiLang: "zh-Hans";
  learnLang: "en";
  difficulty: "advanced";
  voice: "Andrew (English US)";
  multilingualStt: boolean;
};

export type ChatReplyMode = "rewrite" | "rewrite_translate" | "rewrite_reply";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  translation?: string;
  reply?: string;
  createdAt: number;
};

export type MysteryRange = "week" | "month" | "quarter" | "year" | "all";

export type RecallKind = "today" | "yesterday" | "day" | "mystery" | "keyword" | "last";

export type RecallSession = {
  kind: RecallKind;
  cardIds: string[];
  index: number;
  dateKey?: string;
  query?: string;
};

export type DemoUser = {
  id: string;
  isPro: boolean;
};

export type WordToken = {
  surface: string;
  isWord: boolean;
  start: number;
  end: number;
};
