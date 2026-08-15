import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { EmptyHint } from "../components/EmptyHint";
import { MonthCalendar } from "../components/MonthCalendar";
import { useWordbook } from "../context/WordbookState";
import type { TabParamList } from "../navigation/types";
import { dottedDayKeys, dueLabel, itemsOnCalendarDay } from "../services/reviewCalendar";
import { colors, space } from "../theme";
import type { WordbookItem } from "../types";

export function WordbookScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { items, deletePhrase } = useWordbook();
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
    }, [])
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const dots = useMemo(() => dottedDayKeys(items, now), [items, now]);
  const visible = selectedDay ? itemsOnCalendarDay(items, selectedDay, now) : items;

  const toggleDay = (dayKey: string): void => {
    setSelectedDay((current) => (current === dayKey ? null : dayKey));
  };

  if (items.length === 0) {
    return (
      <View style={styles.page}>
        <EmptyHint text="转换一句，点词或划短语再存" />
        <Pressable style={styles.btn} onPress={() => navigation.navigate("ConvertTab")}>
          <Text style={styles.btnText}>去转换</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <MonthCalendar selectedDay={selectedDay} dottedDays={dots} onPressDay={toggleDay} now={now} />
      {visible.map((item) => (
        <Swipeable
          key={item.id}
          overshootRight={false}
          renderRightActions={() => (
            <Pressable style={styles.swipe} onPress={() => void deletePhrase(item.id)}>
              <Text style={styles.swipeText}>删除</Text>
            </Pressable>
          )}
        >
          <WordRow item={item} now={now} />
        </Swipeable>
      ))}
    </ScrollView>
  );
}

function WordRow({ item, now }: { item: WordbookItem; now: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.phrase}>{item.phrase}</Text>
      {item.ipa ? <Text style={styles.ipa}>{item.ipa}</Text> : null}
      <Text style={styles.sense}>{item.senses.join(" · ") || "暂无释义"}</Text>
      <Text style={styles.ctx} numberOfLines={2}>
        {item.sentenceContext}
      </Text>
      <Text style={styles.due}>{dueLabel(item.dueAt, now)}</Text>
      {item.syncState !== "synced" ? <Text style={styles.sync}>未同步到云</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.md, gap: 12, backgroundColor: colors.bg },
  list: { padding: space.md, paddingBottom: 40, gap: 12, backgroundColor: colors.bg },
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
  ctx: { color: colors.muted, fontSize: 13 },
  due: { color: colors.muted, fontSize: 12, marginTop: 2 },
  sync: { color: colors.warn, fontSize: 13, marginTop: 2 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  swipe: {
    backgroundColor: colors.warn,
    justifyContent: "center",
    alignItems: "center",
    width: 84,
    marginBottom: 0,
    borderRadius: 14
  },
  swipeText: { color: "#fff", fontWeight: "700" }
});
