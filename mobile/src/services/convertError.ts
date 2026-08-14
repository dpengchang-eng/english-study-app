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

function detailsFromError(error: object): unknown {
  if ("details" in error) return (error as { details: unknown }).details;
  if ("customData" in error) {
    const custom = (error as { customData?: { details?: unknown } }).customData;
    return custom?.details;
  }
  return undefined;
}

function errorCodeFromDetails(details: unknown): ConvertErrorCode | undefined {
  if (typeof details === "string") return asConvertErrorCode(details);
  if (!details || typeof details !== "object") return undefined;
  const row = details as Record<string, unknown>;
  return asConvertErrorCode(row.errorCode) ?? asConvertErrorCode(row.code);
}

/** Branch on errorCode. Do not treat functions/resource-exhausted as quota by itself. */
export function errorCodeFromHttpsError(error: unknown): ConvertErrorCode | undefined {
  if (!error || typeof error !== "object") return undefined;
  return errorCodeFromDetails(detailsFromError(error));
}

export function errorCodeFromPayload(payload: { errorCode?: unknown; status?: unknown }): ConvertErrorCode | undefined {
  return asConvertErrorCode(payload.errorCode);
}
