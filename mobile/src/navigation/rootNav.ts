import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const rootNav = createNavigationContainerRef<RootStackParamList>();

export function openLookup(params: RootStackParamList["Lookup"]): void {
  if (rootNav.isReady()) rootNav.navigate("Lookup", params);
}

export function openCloze(): void {
  if (rootNav.isReady()) rootNav.navigate("Cloze");
}
