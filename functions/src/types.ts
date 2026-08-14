export type SourceLang = "zh" | "en" | "mixed" | "unknown";
export type SourceType = "text" | "voice";
export type ConversionStatus = "ready" | "failed";

export type ConvertErrorCode =
  | "quota_exceeded"
  | "input_empty"
  | "input_too_long"
  | "input_invalid"
  | "gemini_timeout"
  | "gemini_unavailable"
  | "safety"
  | "parse_error";

export type ConvertTextInput = {
  text: string;
  sourceType: SourceType;
  sourceLangHint?: SourceLang;
  clientRequestId: string;
};

export type GeminiToken = {
  surface: string;
  lemma: string;
  pos: string;
  isWord: boolean;
};

export type GeminiSentence = {
  text: string;
  tokens: GeminiToken[];
};

export type GeminiPayload = {
  sourceLang: SourceLang;
  outputText: string;
  sentences: GeminiSentence[];
};

export type Token = {
  id: string;
  index: number;
  surface: string;
  lemma: string;
  pos: string;
  isWord: boolean;
  charStart: number;
  charEnd: number;
};

export type Sentence = {
  id: string;
  index: number;
  text: string;
  tokens: Token[];
};

export type ConvertTextOutput = {
  conversionId: string;
  status: ConversionStatus;
  sourceLang: SourceLang;
  outputText: string;
  sentences: Sentence[];
  errorCode?: ConvertErrorCode;
};

export const PROMPT_VERSION = "convert-v1";
export const MODEL = "gemini-2.0-flash";
export const MAX_TEXT_LEN = 2000;
export const ANON_DAILY_QUOTA = 20;
export const LINKED_DAILY_QUOTA = 80;
export const SEOUL_TZ = "Asia/Seoul";
