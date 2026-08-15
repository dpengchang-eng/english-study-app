import AsyncStorage from "@react-native-async-storage/async-storage";
import { RECENT_CAP, type Conversion } from "../types";
import { ensureTappableTokens } from "./align";

const keyFor = (uid: string): string => `didao-recents-v1:${uid}`;

export async function loadRecents(uid: string): Promise<Conversion[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversion[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.id && item.sourceText)
      .slice(0, RECENT_CAP)
      .map((item) =>
        item.status !== "ready"
          ? item
          : {
              ...item,
              sentences: (item.sentences ?? []).map((sentence) => ({
                ...sentence,
                tokens: ensureTappableTokens(sentence)
              }))
            }
      );
  } catch {
    return [];
  }
}

export async function saveRecents(uid: string, items: Conversion[]): Promise<void> {
  const persisted = items.filter((item) => item.status !== "loading").slice(0, RECENT_CAP);
  await AsyncStorage.setItem(keyFor(uid), JSON.stringify(persisted));
}

export function mergeRecent(list: Conversion[], item: Conversion): Conversion[] {
  return [item, ...list.filter((row) => row.id !== item.id)].slice(0, RECENT_CAP);
}

/**
 * Apply a convert result onto local history.
 * Late ready can replace failed. Ready is never downgraded. Stale retries are ignored.
 */
export function applyConvertResult(list: Conversion[], incoming: Conversion): Conversion[] {
  const current = list.find((item) => item.id === incoming.id);
  if (!current) return mergeRecent(list, incoming);
  if (current.clientRequestId !== incoming.clientRequestId) return list;
  if (current.status === "ready") return list;
  return mergeRecent(list, {
    ...incoming,
    createdAt: current.createdAt
  });
}

/** Patch cloud sync on a ready row. Ignores a stale retry. */
export function applyConversionSync(
  list: Conversion[],
  id: string,
  clientRequestId: string,
  syncState: "synced" | "error"
): Conversion[] {
  const current = list.find((item) => item.id === id);
  if (!current || current.clientRequestId !== clientRequestId) return list;
  if (current.status !== "ready") return list;
  if (current.syncState === syncState) return list;
  return mergeRecent(list, { ...current, syncState });
}

/** Cloud rows plus local recents. Do not drop a local loading/ready row or downgrade ready. */
export function mergeRemoteRecents(local: Conversion[], remote: Conversion[]): Conversion[] {
  const byId = new Map<string, Conversion>();
  for (const item of remote) byId.set(item.id, item);
  for (const item of local) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    if (item.status === "loading") {
      byId.set(item.id, item);
      continue;
    }
    if (item.status === "ready") {
      byId.set(item.id, { ...item, syncState: "synced" });
      continue;
    }
    if (existing.status === "ready") continue;
    byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, RECENT_CAP);
}
