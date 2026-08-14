import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyHint } from "../components/EmptyHint";
import { useWordbook } from "../context/WordbookState";
import { colors, space } from "../theme";
import type { WordbookItem } from "../types";

function statusBits(item: WordbookItem, now: number): string[] {
  const bits: string[] = [];
  if (item.dueAt <= now) bits.push("待复习");
  if (item.syncState === "pending") bits.push("待同步");
  if (item.syncState === "error") bits.push("未同步");
  return bits;
}

export function WordbookScreen() {
  const { items, deletePhrase } = useWordbook();
  const now = Date.now();

  const remove = (item: WordbookItem): void => {
    Alert.alert("删除这个词？", item.phrase, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: () => void deletePhrase(item.id) }
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>词本</Text>
      {items.length === 0 ? <EmptyHint text="转换后点单词，再存进词本。" /> : null}
      {items.map((item) => {
        const bits = statusBits(item, now);
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.phrase}>{item.phrase}</Text>
              <Pressable onPress={() => remove(item)} hitSlop={8}>
                <Text style={styles.delete}>删除</Text>
              </Pressable>
            </View>
            {item.ipa ? <Text style={styles.ipa}>{item.ipa}</Text> : null}
            <Text style={styles.sense}>{item.senses.join(" · ") || "暂无释义"}</Text>
            <Text style={styles.ctx} numberOfLines={2}>
              {item.sentenceContext}
            </Text>
            {bits.length ? <Text style={styles.meta}>{bits.join(" · ")}</Text> : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.md, paddingBottom: 40, gap: 12, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: space.md,
    gap: 4
  },
  top: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  phrase: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.ink },
  delete: { color: colors.warn, fontSize: 14, fontWeight: "600" },
  ipa: { color: colors.muted },
  sense: { color: colors.ink, fontSize: 15 },
  ctx: { color: colors.muted, fontSize: 13 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 }
});
