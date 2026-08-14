import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppState } from "../context/AppState";
import { useWordbook } from "../context/WordbookState";
import { countReadyToday, loadLocalSuccessCount, remainingAnon } from "../services/quota";
import { colors, space } from "../theme";

function Row({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function MeScreen() {
  const { uid, recents } = useAppState();
  const { items, dueCount } = useWordbook();
  const [stored, setStored] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void loadLocalSuccessCount(uid).then((count) => {
        if (live) setStored(count);
      });
      return () => {
        live = false;
      };
    }, [uid])
  );

  const remaining = remainingAnon(Math.max(stored, countReadyToday(recents)));

  return (
    <View style={styles.page}>
      <Text style={styles.body}>未绑定</Text>
      <Text style={styles.muted}>数据只在这台设备</Text>
      <Row label="今日剩余转换" value={remaining} />
      <Row label="词本数" value={items.length} />
      <Row label="待复习数" value={dueCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.md, gap: 10, backgroundColor: colors.bg },
  body: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 22, marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  label: { color: colors.ink, fontSize: 16 },
  value: { color: colors.ink, fontSize: 16, fontWeight: "700" }
});
