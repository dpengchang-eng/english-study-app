import AsyncStorage from "@react-native-async-storage/async-storage";
import { RECENT_CAP, type Conversion } from "../types";

const keyFor = (uid: string): string => `didao-recents-v1:${uid}`;

export async function loadRecents(uid: string): Promise<Conversion[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversion[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.id && item.sourceText).slice(0, RECENT_CAP);
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
