import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { SEOUL_TZ, dailyLimit, seoulDayKey } from "./quotaLimits";

export { ANON_DAILY_QUOTA, LINKED_DAILY_QUOTA, SEOUL_TZ, dailyLimit, remainingAnon, remainingToday, seoulDayKey } from "./quotaLimits";

type QuotaState = { convertCountToday: number; convertDayKey: string };

const localKey = (uid: string): string => `didao-quota-v1:${uid}`;

export function isLinkedAccount(user = auth.currentUser): boolean {
  return Boolean(user && !user.isAnonymous);
}

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

const REMOTE_QUOTA_MS = 2_000;

export async function raceWithTimeout<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function currentQuota(uid: string, now = new Date()): Promise<QuotaState> {
  const local = await loadLocal(uid, now);
  const remote = await raceWithTimeout(loadRemote(uid, now), REMOTE_QUOTA_MS, local);
  return {
    convertCountToday: Math.max(local.convertCountToday, remote.convertCountToday),
    convertDayKey: seoulDayKey(now)
  };
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
  const local = await loadLocal(uid, new Date());
  return local.convertCountToday >= dailyLimit(isLinkedAccount()) ? "quota_exceeded" : "ok";
}

export async function incrementQuota(uid: string): Promise<void> {
  const now = new Date();
  const state = await currentQuota(uid, now);
  const next: QuotaState = {
    convertCountToday: state.convertCountToday + 1,
    convertDayKey: seoulDayKey(now)
  };
  await AsyncStorage.setItem(localKey(uid), JSON.stringify(next));
  void setDoc(
    doc(db, "users", uid),
    {
      quota: next,
      updatedAt: Timestamp.now(),
      locale: "zh-CN",
      timezone: SEOUL_TZ
    },
    { merge: true }
  ).catch(() => {
    // local counter still applies
  });
}
