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
  input_empty: "请先输入内容。",
  input_too_long: "文字太长。",
  input_invalid: "输入无效。",
  gemini_timeout: "模型超时，请再试。",
  gemini_unavailable: "模型暂时不可用，请稍后再试。",
  safety: "内容被安全策略拦截。",
  parse_error: "结果解析失败，请再试。"
};
