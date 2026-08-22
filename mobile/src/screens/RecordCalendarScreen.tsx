import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppState } from "../context/AppState";
import type { RootStackParamList } from "../navigation/types";
import { formatMonthTitle, monthCells } from "../services/dates";
import { colors, space } from "../theme";

const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

function heat(count: number): string {
  if (count <= 0) return colors.heat0;
  if (count === 1) return colors.heat1;
  if (count === 2) return colors.heat2;
  if (count === 3) return colors.heat3;
  return colors.heat4;
}

function chunkWeeks<T>(cells: T[]): T[][] {
  const weeks: T[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function RecordCalendarScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { dayCounts, monthStats, cardsOnDay } = useAppState();
  const now = new Date();
  const [mode, setMode] = useState<"month" | "year">("month");
  const year = now.getUTCFullYear();
  const [month, setMonth] = useState(now.getUTCMonth());
  const stats = monthStats(year, month);
  const weeks = useMemo(() => chunkWeeks(monthCells(year, month)), [month, year]);

  const openDay = (key: string): void => {
    const ids = cardsOnDay(key).map((card) => card.id);
    if (ids.length === 0) return;
    navigation.navigate("RecallSession", { kind: "day", cardIds: ids, dateKey: key });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.title}>记录日历</Text>
        <View style={styles.spacer} />
      </View>
      <View style={styles.seg}>
        <Pressable style={[styles.segBtn, mode === "month" && styles.segOn]} onPress={() => setMode("month")}>
          <Text style={[styles.segText, mode !== "month" && styles.segTextOff]}>月</Text>
        </Pressable>
        <Pressable style={[styles.segBtn, mode === "year" && styles.segOn]} onPress={() => setMode("year")}>
          <Text style={[styles.segText, mode !== "year" && styles.segTextOff]}>年</Text>
        </Pressable>
      </View>
      {mode === "month" ? (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.monthTitle}>{formatMonthTitle(year, month)}</Text>
          <Text style={styles.stats}>
            {stats.cards} 张卡片 · {stats.words} 字 · 本月记录 {stats.days} 天
          </Text>
          <View style={styles.week}>
            {WEEK.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekDay}>
                {day}
              </Text>
            ))}
          </View>
          {weeks.map((cells, weekIndex) => (
            <View key={`w${weekIndex}`} style={styles.weekRow}>
              {cells.map((cell, dayIndex) => {
                const count = cell.key ? (dayCounts[cell.key] ?? 0) : 0;
                return (
                  <View key={`${cell.key ?? "e"}-${dayIndex}`} style={styles.dayCol}>
                    <Text style={styles.dayNum}>{cell.day ?? ""}</Text>
                    <Pressable
                      style={[styles.cell, !cell.day && styles.cellEmpty, cell.day ? { backgroundColor: heat(count) } : null]}
                      disabled={!cell.key || count === 0}
                      onPress={() => cell.key && openDay(cell.key)}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.monthTitle}>{year}</Text>
          <View style={styles.yearGrid}>
            {Array.from({ length: 12 }, (_, index) => {
              const monthStat = monthStats(year, index);
              return (
                <Pressable
                  key={index}
                  style={styles.yearCell}
                  onPress={() => {
                    setMonth(index);
                    setMode("month");
                  }}
                >
                  <Text style={styles.yearLabel}>{index + 1}月</Text>
                  <Text style={styles.yearSub}>{monthStat.days} 天</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.md, paddingVertical: 8 },
  close: { fontSize: 18, width: 28, color: colors.ink },
  title: { flex: 1, textAlign: "center", fontWeight: "800", fontSize: 16, color: colors.ink },
  spacer: { width: 28 },
  seg: { flexDirection: "row", alignSelf: "stretch", marginHorizontal: space.lg, backgroundColor: colors.hair, borderRadius: 10, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  segOn: { backgroundColor: colors.card },
  segText: { fontWeight: "700", color: colors.ink },
  segTextOff: { color: colors.muted, fontWeight: "600" },
  body: { paddingHorizontal: space.md, paddingBottom: 40 },
  monthTitle: { fontSize: 22, fontWeight: "800", color: colors.ink, marginTop: 22 },
  stats: { color: colors.muted, marginTop: 6, marginBottom: 18, fontSize: 13 },
  week: { flexDirection: "row" },
  weekDay: { flex: 1, textAlign: "center", color: colors.muted, fontSize: 12 },
  weekRow: { flexDirection: "row", marginTop: 8 },
  dayCol: { flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 2 },
  dayNum: { fontSize: 11, color: colors.muted },
  cell: { width: "100%", height: 30, borderRadius: 6 },
  cellEmpty: { backgroundColor: "transparent" },
  yearGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  yearCell: { width: "30%", backgroundColor: colors.accentSoft, borderRadius: 10, padding: 12 },
  yearLabel: { fontWeight: "800", color: colors.ink },
  yearSub: { color: colors.muted, marginTop: 4, fontSize: 12 }
});
