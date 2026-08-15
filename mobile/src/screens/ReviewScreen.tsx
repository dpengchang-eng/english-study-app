import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyHint } from "../components/EmptyHint";
import { MonthCalendar } from "../components/MonthCalendar";
import { useWordbook } from "../context/WordbookState";
import { openCloze } from "../navigation/rootNav";
import type { TabParamList } from "../navigation/types";
import { dottedDayKeys, itemsOnCalendarDay, seoulDayKey, snapSelectedDayToToday, todayReviewCount } from "../services/reviewCalendar";
import { colors, space } from "../theme";
import type { WordbookItem } from "../types";

export function ReviewScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { items } = useWordbook();
  const [now, setNow] = useState(() => Date.now());
  const [selectedDay, setSelectedDay] = useState(() => seoulDayKey(new Date()));
  useFocusEffect(
    useCallback(() => {
      const nextNow = Date.now();
      setNow(nextNow);
      setSelectedDay((current) => snapSelectedDayToToday(current, nextNow));
    }, [])
  );
  const dots = useMemo(() => dottedDayKeys(items, now), [items, now]);
  const dayItems = useMemo(() => itemsOnCalendarDay(items, selectedDay, now), [items, now, selectedDay]);
  const todayCount = todayReviewCount(items, now);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(dayItems.map((item) => item.id)));
  const dayIds = dayItems.map((item) => item.id).join("\0");

  useEffect(() => {
    setChecked(new Set(dayIds ? dayIds.split("\0") : []));
  }, [dayIds, selectedDay]);

  const checkedItems = dayItems.filter((item) => checked.has(item.id));

  const startCloze = (): void => {
    if (!checkedItems.length) return;
    openCloze(checkedItems.map((item) => item.id));
  };

  const toggle = (id: string): void => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <MonthCalendar selectedDay={selectedDay} dottedDays={dots} onPressDay={setSelectedDay} now={now} snapStaleMonth />
      {items.length === 0 ? (
        <>
          <EmptyHint text="先存词" />
          <Pressable style={styles.btn} onPress={() => navigation.navigate("ConvertTab")}>
            <Text style={styles.btnText}>去转换</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.count}>待复习 {todayCount}</Text>
          {dayItems.length === 0 ? (
            <EmptyHint text="这天没有要复习的" />
          ) : (
            <>
              {dayItems.map((item) => (
                <ReviewRow key={item.id} item={item} checked={checked.has(item.id)} onToggle={() => toggle(item.id)} />
              ))}
              {checkedItems.length > 0 ? (
                <Pressable style={styles.btn} onPress={startCloze}>
                  <Text style={styles.btnText}>开始填空</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function ReviewRow({ item, checked, onToggle }: { item: WordbookItem; checked: boolean; onToggle: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Text style={styles.check}>✓</Text> : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.phrase}>{item.phrase}</Text>
        <Text style={styles.sense}>{item.senses.join(" · ") || "暂无释义"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.md, paddingBottom: 40, gap: 12, backgroundColor: colors.bg },
  count: { fontSize: 22, fontWeight: "800", color: colors.ink },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: space.md
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card
  },
  boxOn: { backgroundColor: colors.accent },
  check: { color: "#fff", fontSize: 14, fontWeight: "800", lineHeight: 16 },
  body: { flex: 1, gap: 2 },
  phrase: { fontSize: 17, fontWeight: "700", color: colors.ink },
  sense: { color: colors.muted, fontSize: 14 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 }
});
