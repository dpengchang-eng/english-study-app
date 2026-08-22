import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAppState } from "../context/AppState";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";

function pickIds(ids: string[], count: number): string[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === undefined || b === undefined) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return copy.slice(0, Math.max(1, count));
}

export function MysteryBoxScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "MysteryBox">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cardsInRange } = useAppState();
  const [ids] = useState(() => pickIds(cardsInRange(route.params.range).map((card) => card.id), route.params.count));

  useEffect(() => {
    navigation.replace("RecallSession", { kind: "mystery", cardIds: ids });
  }, [ids, navigation]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}
