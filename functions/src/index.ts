import { initializeApp } from "firebase-admin/app";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { handleConvertText } from "./convertText";

initializeApp();

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const enforceAppCheck = process.env.FUNCTIONS_EMULATOR !== "true";

export const convertText = onCall(
  {
    region: "asia-northeast3",
    secrets: [geminiApiKey],
    enforceAppCheck,
    consumeAppCheckToken: false,
    timeoutSeconds: 60,
    memory: "256MiB"
  },
  async (request) => {
    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "GEMINI_API_KEY is not set.");
    }
    return handleConvertText(request, apiKey);
  }
);

export const expireConvertRequests = onSchedule(
  {
    region: "asia-northeast3",
    schedule: "every 24 hours",
    timeZone: "Asia/Seoul"
  },
  async () => {
    const db = getFirestore();
    const cutoff = Timestamp.now();
    const snap = await db.collectionGroup("requests").where("expireAt", "<=", cutoff).limit(400).get();
    const batch = db.batch();
    snap.docs.forEach((row) => batch.delete(row.ref));
    if (!snap.empty) await batch.commit();
  }
);
