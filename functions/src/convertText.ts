import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { buildSentences } from "./align";
import { cleanInput } from "./clean";
import { callGeminiFlash } from "./gemini";
import { dailyLimit, nextQuota } from "./quota";
import {
  MODEL,
  PROMPT_VERSION,
  type ConvertTextOutput,
  type ConversionStatus,
  type ConvertErrorCode,
  type SourceLang
} from "./types";

const REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

type RequestRecord = {
  status: ConversionStatus | "pending";
  conversionId: string;
  response: ConvertTextOutput;
  createdAt: Timestamp;
  expireAt: Timestamp;
};

function emptyOutput(errorCode: ConvertErrorCode, sourceLang: SourceLang = "unknown"): ConvertTextOutput {
  return {
    conversionId: "",
    status: "failed",
    sourceLang,
    outputText: "",
    sentences: [],
    errorCode
  };
}

async function isLinkedAccount(uid: string): Promise<boolean> {
  const user = await getAuth().getUser(uid);
  return user.providerData.some((provider) => provider.providerId === "google.com" || provider.providerId === "apple.com");
}

export async function handleConvertText(
  request: CallableRequest<unknown>,
  apiKey: string
): Promise<ConvertTextOutput> {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const uid = request.auth.uid;
  const cleaned = cleanInput(request.data);
  if (!cleaned.ok) {
    return emptyOutput(cleaned.errorCode);
  }

  const db = getFirestore();
  const userRef = db.collection("users").doc(uid);
  const requestRef = userRef.collection("requests").doc(cleaned.clientRequestId);
  const now = new Date();
  const expireAt = Timestamp.fromMillis(now.getTime() + REQUEST_TTL_MS);
  const linked = await isLinkedAccount(uid);

  const reserved = await db.runTransaction(async (tx) => {
    const requestSnap = await tx.get(requestRef);
    if (requestSnap.exists) {
      const existing = requestSnap.data() as RequestRecord;
      if (existing.status === "ready" || existing.status === "failed") {
        return { kind: "replay" as const, response: existing.response };
      }
      throw new HttpsError("already-exists", "in_progress");
    }

    const userSnap = await tx.get(userRef);
    const quotaState = nextQuota(userSnap.get("quota") as { convertCountToday?: number; convertDayKey?: string } | undefined, now);
    const limit = dailyLimit(linked);
    if (quotaState.remainingBeforeInc >= limit) {
      return { kind: "quota" as const };
    }

    const createdAt = userSnap.get("createdAt") ?? Timestamp.fromDate(now);
    tx.set(
      userRef,
      {
        createdAt,
        updatedAt: Timestamp.fromDate(now),
        locale: userSnap.get("locale") || "zh-CN",
        timezone: "Asia/Seoul",
        quota: {
          convertCountToday: quotaState.convertCountToday + 1,
          convertDayKey: quotaState.convertDayKey
        }
      },
      { merge: true }
    );
    tx.set(requestRef, {
      status: "pending",
      conversionId: "",
      createdAt: Timestamp.fromDate(now),
      expireAt
    });
    return { kind: "go" as const };
  });

  if (reserved.kind === "replay") {
    return reserved.response;
  }
  if (reserved.kind === "quota") {
    return emptyOutput("quota_exceeded");
  }

  const persist = async (row: {
    status: ConversionStatus;
    sourceLang: SourceLang;
    outputText: string;
    sentences: ConvertTextOutput["sentences"];
    errorCode?: ConvertErrorCode;
  }): Promise<ConvertTextOutput> => {
    const conversionRef = userRef.collection("conversions").doc();
    const completedAt = Timestamp.fromDate(new Date());
    await conversionRef.set({
      clientRequestId: cleaned.clientRequestId,
      sourceType: cleaned.sourceType,
      sourceLang: row.sourceLang,
      sourceText: cleaned.text,
      status: row.status,
      errorCode: row.errorCode ?? null,
      outputText: row.outputText,
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      createdAt: Timestamp.fromDate(now),
      completedAt,
      sentences: row.sentences
    });
    const output: ConvertTextOutput = {
      conversionId: conversionRef.id,
      status: row.status,
      sourceLang: row.sourceLang,
      outputText: row.outputText,
      sentences: row.sentences,
      ...(row.errorCode ? { errorCode: row.errorCode } : {})
    };
    await requestRef.set(
      {
        status: row.status,
        conversionId: conversionRef.id,
        response: output,
        createdAt: Timestamp.fromDate(now),
        expireAt
      },
      { merge: true }
    );
    if (row.status === "ready") {
      await userRef.set(
        {
          updatedAt: completedAt,
          stats: { conversionCount: FieldValue.increment(1) }
        },
        { merge: true }
      );
    }
    return output;
  };

  const gemini = await callGeminiFlash(apiKey, cleaned.text, cleaned.sourceLangHint);
  if (!gemini.ok) {
    return persist({
      status: "failed",
      sourceLang: "unknown",
      outputText: "",
      sentences: [],
      errorCode: gemini.errorCode
    });
  }

  const sentences = buildSentences(gemini.payload.sentences);
  if (sentences.length === 0) {
    return persist({
      status: "failed",
      sourceLang: gemini.payload.sourceLang,
      outputText: "",
      sentences: [],
      errorCode: "parse_error"
    });
  }

  return persist({
    status: "ready",
    sourceLang: gemini.payload.sourceLang,
    outputText: gemini.payload.outputText,
    sentences
  });
}
