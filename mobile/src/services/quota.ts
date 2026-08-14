import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

export const ANON_DAILY_QUOTA = 20;
export const SEOUL_TZ = "Asia/Seoul";

export function seoulDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

type QuotaState = { convertCountToday: number; convertDayKey: string };

const localKey = (uid: string): string => `didao-quota-v1:${uid}`;

function normalize(raw: Partial<QuotaState> | undefined, now: Date): QuotaState {
  const dayKey = seoulDayKey(now);
  const sameDay = raw?.convertDayKey === dayKey;
  return {
    convertCountToday: sameDay ? Number(raw?.convertCountToday ?? 0) : 0,
    convertDayKey: dayKey
  };
}

async function loadLocal(uid: string, now: Date): Promise<QuotaState> {
  try {
    const raw = await AsyncStorage.getItem(localKey(uid));
    return normalize(raw ? (JSON.parse(raw) as QuotaState) : undefined, now);
  } catch {
    return normalize(undefined, now);
  }
}

async function loadRemote(uid: string, now: Date): Promise<QuotaState> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const quota = snap.get("quota") as QuotaState | undefined;
    return normalize(quota, now);
  } catch {
    return normalize(undefined, now);
  }
}

async function currentQuota(uid: string, now = new Date()): Promise<QuotaState> {
  const [local, remote] = await Promise.all([loadLocal(uid, now), loadRemote(uid, now)]);
  return {
    convertCountToday: Math.max(local.convertCountToday, remote.convertCountToday),
    convertDayKey: seoulDayKey(now)
  };
}

export function remainingAnon(used: number): number {
  return Math.max(0, ANON_DAILY_QUOTA - Math.max(0, used));
}

/** Local successful converts today. No remote query. */
export async function loadLocalSuccessCount(uid: string): Promise<number> {
  const local = await loadLocal(uid, new Date());
  return local.convertCountToday;
}

export function countReadyToday(recents: Array<{ id: string; status: string; createdAt: number }>): number {
  const day = seoulDayKey();
  return recents.filter(
    (item) =>
      item.status === "ready" &&
      !item.id.startsWith("sample-") &&
      seoulDayKey(new Date(item.createdAt)) === day
  ).length;
}

export async function checkQuota(uid: string): Promise<"ok" | "quota_exceeded"> {
  const state = await currentQuota(uid);
  return state.convertCountToday >= ANON_DAILY_QUOTA ? "quota_exceeded" : "ok";
}

export async function incrementQuota(uid: string): Promise<void> {
  const now = new Date();
  const state = await currentQuota(uid, now);
  const next: QuotaState = {
    convertCountToday: state.convertCountToday + 1,
    convertDayKey: seoulDayKey(now)
  };
  await AsyncStorage.setItem(localKey(uid), JSON.stringify(next));
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        quota: next,
        updatedAt: Timestamp.now(),
        locale: "zh-CN",
        timezone: SEOUL_TZ
      },
      { merge: true }
    );
  } catch {
    // local counter still applies
  }
}
