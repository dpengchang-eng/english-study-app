import type { ConvertErrorCode } from "../types";

const ERROR_CODES: ConvertErrorCode[] = [
  "quota_exceeded",
  "input_empty",
  "input_too_long",
  "input_invalid",
  "gemini_timeout",
  "gemini_unavailable",
  "safety",
  "parse_error"
];

export function asConvertErrorCode(value: unknown): ConvertErrorCode | undefined {
  return typeof value === "string" && ERROR_CODES.includes(value as ConvertErrorCode)
    ? (value as ConvertErrorCode)
    : undefined;
}

export function resolveErrorCode(value: unknown): ConvertErrorCode {
  return asConvertErrorCode(value) ?? "parse_error";
}

function detailsFromError(error: object): unknown {
  if ("details" in error) return (error as { details: unknown }).details;
  if ("customData" in error) {
    const custom = (error as { customData?: { details?: unknown } }).customData;
    return custom?.details;
  }
  return undefined;
}

function errorCodeFromDetails(details: unknown): ConvertErrorCode | undefined {
  if (typeof details === "string") return resolveErrorCode(details);
  if (!details || typeof details !== "object") return undefined;
  const row = details as Record<string, unknown>;
  if (row.errorCode != null) return resolveErrorCode(row.errorCode);
  return asConvertErrorCode(row.code);
}

/** Branch on errorCode. Unknown codes become parse_error. Do not infer from Firebase codes. */
export function errorCodeFromHttpsError(error: unknown): ConvertErrorCode | undefined {
  if (!error || typeof error !== "object") return undefined;
  return errorCodeFromDetails(detailsFromError(error));
}

export function errorCodeFromPayload(payload: { errorCode?: unknown; status?: unknown }): ConvertErrorCode | undefined {
  if (payload.errorCode == null) return undefined;
  return resolveErrorCode(payload.errorCode);
}
