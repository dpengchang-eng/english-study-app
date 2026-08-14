import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { FlatList } from "react-native-gesture-handler";
import { useAppState } from "../context/AppState";
import { openCloze } from "../navigation/ref";
import { deleteWordbookItem } from "../services/firestore";
import { isDue, isMastered } from "../services/srs";
import { colors, space } from "../theme";
import type { WordbookFilter, WordbookItem } from "../types";

export function WordbookScreen() {
  const { uid, wordbook, openLookup } = useAppState();
  const [filter, setFilter] = useState<WordbookFilter>("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    if (filter === "due") return wordbook.filter((item) => isDue(item));
    if (filter === "mastered") return wordbook.filter((item) => isMastered(item));
    return wordbook;
  }, [filter, wordbook]);

  const dueIds = wordbook.filter((item) => isDue(item)).map((item) => item.id);
  const selectedIds = rows.filter((item) => picked.has(item.id)).map((item) => item.id);

  return (
    <View style={styles.flex}>
      <View style={styles.filters}>
        {([
          ["all", "全部"],
          ["due", "到期"],
          ["mastered", "已掌握"]
        ] as const).map(([id, label]) => (
          <Pressable key={id} style={[styles.chip, filter === id && styles.chipOn]} onPress={() => setFilter(id)}>
            <Text style={styles.chipText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>词本是空的。到转换结果里点词加入。</Text>}
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={() => (
              <Pressable style={styles.delete} onPress={() => void deleteWordbookItem(uid, item.id)}>
                <Text style={styles.deleteText}>删除</Text>
              </Pressable>
            )}
          >
            <Pressable
              style={styles.row}
              onPress={() =>
                openLookup({
                  phrase: item.phrase,
                  sentence: item.sentenceContext,
                  conversionId: item.conversionId
                })
              }
            >
              <Pressable
                style={styles.check}
                onPress={() =>
                  setPicked((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  })
                }
              >
                <Text style={styles.checkText}>{picked.has(item.id) ? "✓" : "○"}</Text>
              </Pressable>
              <View style={styles.meta}>
                <Text style={styles.phrase}>{item.phrase}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {item.ipa ? `${item.ipa} · ` : ""}
                  {item.senses[0] || item.sentenceContext}
                  {item.syncState !== "synced" ? ` · ${item.syncState === "pending" ? "同步中" : "未同步"}` : ""}
                </Text>
              </View>
              <Text style={styles.badge}>{badge(item)}</Text>
            </Pressable>
          </Swipeable>
        )}
      />
      <View style={styles.bar}>
        <Pressable
          style={[styles.barBtn, dueIds.length === 0 && styles.barOff]}
          disabled={dueIds.length === 0}
          onPress={() => openCloze(dueIds, "practice")}
        >
          <Text style={styles.barText}>练习到期</Text>
        </Pressable>
        <Pressable
          style={[styles.barBtn, selectedIds.length === 0 && styles.barOff]}
          disabled={selectedIds.length === 0}
          onPress={() => openCloze(selectedIds, "practice")}
        >
          <Text style={styles.barText}>练习已选</Text>
        </Pressable>
      </View>
    </View>
  );
}

function badge(item: WordbookItem): string {
  if (isMastered(item)) return "已掌握";
  if (isDue(item)) return "到期";
  return `${item.intervalDays || 0}天`;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  filters: { flexDirection: "row", gap: 8, padding: space.md, paddingBottom: 0 },
  chip: { backgroundColor: colors.chip, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.chipOn },
  chipText: { color: colors.ink, fontWeight: "600" },
  list: { padding: space.md, paddingBottom: 90, gap: 8 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 40 },
  row: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  check: { width: 28, alignItems: "center" },
  checkText: { color: colors.accent, fontSize: 18, fontWeight: "700" },
  meta: { flex: 1, gap: 2 },
  phrase: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  sub: { color: colors.muted, fontSize: 13 },
  badge: { color: colors.muted, fontSize: 12 },
  delete: { backgroundColor: colors.warn, justifyContent: "center", paddingHorizontal: 18, marginLeft: 8, borderRadius: 14 },
  deleteText: { color: "#fff", fontWeight: "700" },
  bar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    gap: 8
  },
  barBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  barOff: { opacity: 0.4 },
  barText: { color: "#fff", fontWeight: "700" }
});
