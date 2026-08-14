import { ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyHint } from "../components/EmptyHint";
import { useWordbook } from "../context/WordbookState";
import { colors, space } from "../theme";

export function WordbookScreen() {
  const { items } = useWordbook();
  return (
    <ScrollView contentContainerStyle={styles.page}>
      {items.length === 0 ? <EmptyHint text="点结果里的单词，或长按选短语，就能存进来。" /> : null}
      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.phrase}>{item.phrase}</Text>
          {item.ipa ? <Text style={styles.ipa}>{item.ipa}</Text> : null}
          <Text style={styles.sense}>{item.senses.join(" · ") || "暂无释义"}</Text>
          <Text style={styles.ctx} numberOfLines={2}>
            {item.sentenceContext}
          </Text>
        </View>
      ))}
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
  phrase: { fontSize: 18, fontWeight: "700", color: colors.ink },
  ipa: { color: colors.muted },
  sense: { color: colors.ink, fontSize: 15 },
  ctx: { color: colors.muted, fontSize: 13 }
});
