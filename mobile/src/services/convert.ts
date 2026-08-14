import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { ERROR_COPY, type ConvertErrorCode, type Conversion, type SourceLang, type SourceType } from "../types";
import { toUiToken } from "./tokens";

export type ConvertCallInput = {
  text: string;
  sourceType: SourceType;
  sourceLangHint?: SourceLang;
  clientRequestId: string;
};

type ConvertCallOutput = {
  conversionId: string;
  status: "ready" | "failed";
  sourceLang: SourceLang;
  outputText: string;
  sentences: Array<{
    id: string;
    index: number;
    text: string;
    tokens: Array<{
      id: string;
      index: number;
      surface: string;
      lemma: string;
      pos: string;
      isWord: boolean;
      charStart: number;
      charEnd: number;
    }>;
  }>;
  errorCode?: ConvertErrorCode;
};

const callable = httpsCallable<ConvertCallInput, ConvertCallOutput>(functions, "convertText");

export function mapConvertOutput(
  output: ConvertCallOutput,
  base: Pick<Conversion, "id" | "clientRequestId" | "sourceType" | "sourceText" | "createdAt">
): Conversion {
  const sentences = (output.sentences ?? []).map((sentence, index) => ({
    id: sentence.id || `s${index}`,
    index: sentence.index ?? index,
    text: sentence.text,
    tokens: (sentence.tokens ?? []).map((token, tokenIndex) => toUiToken(token, tokenIndex))
  }));
  return {
    ...base,
    firestoreId: output.conversionId || undefined,
    sourceLang: output.sourceLang ?? "unknown",
    outputText: output.outputText ?? "",
    rewrittenText: output.outputText ?? "",
    sentences,
    status: output.status === "ready" ? "ready" : "failed",
    errorCode: output.errorCode,
    errorMessage: output.errorCode ? ERROR_COPY[output.errorCode] : undefined
  };
}

export async function convertText(input: ConvertCallInput): Promise<ConvertCallOutput> {
  try {
    const result = await callable(input);
    return result.data;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
    if (code.includes("unauthenticated")) {
      return { conversionId: "", status: "failed", sourceLang: "unknown", outputText: "", sentences: [], errorCode: "input_invalid" };
    }
    if (code.includes("failed-precondition") || code.includes("app-check")) {
      return { conversionId: "", status: "failed", sourceLang: "unknown", outputText: "", sentences: [], errorCode: "gemini_unavailable" };
    }
    return { conversionId: "", status: "failed", sourceLang: "unknown", outputText: "", sentences: [], errorCode: "gemini_unavailable" };
  }
}
