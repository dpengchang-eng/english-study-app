import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function openCloze(itemIds: string[], mode: RootStackParamList["Cloze"]["mode"]): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate("Cloze", { itemIds, mode });
  }
}
