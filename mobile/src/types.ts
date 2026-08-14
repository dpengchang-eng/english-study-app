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

export const INPUT_CHAR_CAP = 500;
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
