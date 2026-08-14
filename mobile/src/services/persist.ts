import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import type { SourceLang, SourceType } from "../types";
import type { StoredSentence } from "./align";

export async function persistConversion(
  uid: string,
  row: {
    clientRequestId: string;
    sourceType: SourceType;
    sourceLang: SourceLang;
    sourceText: string;
    outputText: string;
    sentences: StoredSentence[];
  }
): Promise<string | undefined> {
  try {
    const ref = await addDoc(collection(db, "users", uid, "conversions"), {
      clientRequestId: row.clientRequestId,
      sourceType: row.sourceType,
      sourceLang: row.sourceLang,
      sourceText: row.sourceText,
      status: "ready",
      errorCode: null,
      outputText: row.outputText,
      model: "gemini-2.0-flash",
      promptVersion: "convert-v1",
      createdAt: Timestamp.now(),
      completedAt: Timestamp.now(),
      sentences: row.sentences
    });
    return ref.id;
  } catch {
    return undefined;
  }
}
