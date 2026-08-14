import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppState } from "../context/AppState";
import { openCloze } from "../navigation/ref";
import { isDue } from "../services/srs";
import { colors, space } from "../theme";

export function ReviewScreen() {
  const { wordbook, dueCount } = useAppState();
  const dueIds = wordbook.filter((item) => isDue(item)).map((item) => item.id);

  return (
    <View style={styles.page}>
      <Text style={styles.kicker}>只复习今天到期的条目</Text>
      <View style={styles.card}>
        <Text style={styles.label}>今日待复习</Text>
        <Text style={styles.count}>{dueCount}</Text>
        <Text style={styles.hint}>未到期的词不会出现在这里。</Text>
        <Pressable
          style={[styles.primary, dueIds.length === 0 && styles.off]}
          disabled={dueIds.length === 0}
          onPress={() => openCloze(dueIds, "review")}
        >
          <Text style={styles.primaryText}>{dueIds.length === 0 ? "今天没有到期" : "开始复习"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: space.md, gap: 12 },
  kicker: { color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
    gap: 10,
    alignItems: "center"
  },
  label: { color: colors.muted, fontSize: 14 },
  count: { fontSize: 64, fontWeight: "800", color: colors.ink },
  hint: { color: colors.muted, fontSize: 13, textAlign: "center" },
  primary: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  off: { opacity: 0.4 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 }
});
