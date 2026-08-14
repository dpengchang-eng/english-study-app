import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import type { ConvertErrorCode, SourceLang, SourceType } from "../types";
import type { StoredSentence } from "./align";

const PROMPT_VERSION = "convert-v1";
const MODEL = "gemini-flash-lite-latest";

export async function persistConversion(
  uid: string,
  row: {
    clientRequestId: string;
    sourceType: SourceType;
    sourceLang: SourceLang;
    sourceText: string;
    outputText: string;
    sentences: StoredSentence[];
    status: "ready" | "failed";
    errorCode?: ConvertErrorCode | null;
  }
): Promise<string | undefined> {
  try {
    const ref = await addDoc(collection(db, "users", uid, "conversions"), {
      clientRequestId: row.clientRequestId,
      sourceType: row.sourceType,
      sourceLang: row.sourceLang,
      sourceText: row.sourceText,
      status: row.status,
      errorCode: row.errorCode ?? null,
      outputText: row.outputText,
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      createdAt: Timestamp.now(),
      completedAt: Timestamp.now(),
      sentences: row.sentences
    });
    return ref.id;
  } catch {
    return undefined;
  }
}
