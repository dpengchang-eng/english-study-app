import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ClozeCard } from "../components/ClozeCard";
import { isDue, markReview } from "../services/firestore";
import { colors, space } from "../theme";
import type { ReviewResult, SavedItem } from "../types";

type Props = {
  uid: string;
  items: SavedItem[];
};

export function ReviewScreen({ uid, items }: Props) {
  const due = useMemo(() => items.filter((item) => isDue(item)), [items]);
  const [cursor, setCursor] = useState(0);
  const current = due[Math.min(cursor, Math.max(due.length - 1, 0))] ?? null;

  useEffect(() => {
    if (cursor >= due.length) setCursor(0);
  }, [cursor, due.length]);

  const schedule = async (result: ReviewResult): Promise<void> => {
    if (!current) return;
    await markReview(uid, current, result);
    setCursor((prev) => (due.length <= 1 ? 0 : prev % Math.max(due.length - 1, 1)));
  };

  if (!current) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>复习</Text>
        <Text style={styles.hint}>今天没有到期的词。去练习页多做几题，或再保存几个新词。</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={styles.title}>复习</Text>
      <Text style={styles.hint}>待复习 {due.length} 个 · 答完后选间隔</Text>
      <ClozeCard item={current} showSchedule onSchedule={(result) => void schedule(result)} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.md, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink },
  hint: { color: colors.muted, fontSize: 14 }
});
