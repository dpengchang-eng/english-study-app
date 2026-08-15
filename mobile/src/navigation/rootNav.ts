import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const rootNav = createNavigationContainerRef<RootStackParamList>();

type PendingNav =
  | { screen: "Lookup"; params: RootStackParamList["Lookup"] }
  | { screen: "Cloze"; params: RootStackParamList["Cloze"] };

let pending: PendingNav | null = null;

export function flushRootNav(): void {
  if (!pending || !rootNav.isReady()) return;
  const next = pending;
  pending = null;
  if (next.screen === "Lookup") {
    rootNav.navigate("Lookup", next.params);
    return;
  }
  rootNav.navigate("Cloze", next.params);
}

export function openLookup(params: RootStackParamList["Lookup"]): void {
  if (rootNav.isReady()) {
    rootNav.navigate("Lookup", params);
    return;
  }
  pending = { screen: "Lookup", params };
}

export function openCloze(itemIds: string[]): void {
  const params = { itemIds };
  if (rootNav.isReady()) {
    rootNav.navigate("Cloze", params);
    return;
  }
  pending = { screen: "Cloze", params };
}
