import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ClozeCard } from "../components/ClozeCard";
import { colors, space } from "../theme";
import type { SavedItem } from "../types";

type Props = {
  items: SavedItem[];
};

export function PracticeScreen({ items }: Props) {
  const [index, setIndex] = useState(0);
  const current = items[index] ?? null;
  const label = useMemo(() => (items.length === 0 ? "还没有保存的词" : `已保存 ${items.length} 个`), [items.length]);

  if (!current) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>填空练习</Text>
        <Text style={styles.hint}>{label}。先到「改写」页点一个单词并保存。</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={styles.title}>填空练习</Text>
      <Text style={styles.hint}>
        {index + 1} / {items.length} · 用刚保存的词做填空
      </Text>
      <ClozeCard
        item={current}
        showSchedule={false}
        onNext={() => setIndex((prev) => (prev + 1) % items.length)}
      />
      <Pressable style={styles.skip} onPress={() => setIndex((prev) => (prev + 1) % items.length)}>
        <Text style={styles.skipText}>跳过</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.md, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink },
  hint: { color: colors.muted, fontSize: 14 },
  skip: { alignSelf: "flex-start", paddingVertical: 8 },
  skipText: { color: colors.accent, fontWeight: "600" }
});
