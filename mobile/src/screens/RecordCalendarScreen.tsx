import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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

export function RecordCalendarScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { dayCounts, monthStats, cardsOnDay } = useAppState();
  const now = new Date();
  const [mode, setMode] = useState<"month" | "year">("month");
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const stats = monthStats(year, month);
  const cells = useMemo(() => monthCells(year, month), [month, year]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.title}>记录日历</Text>
        <View style={styles.spacer} />
      </View>
      <View style={styles.seg}>
        <Pressable style={[styles.segBtn, mode === "month" && styles.segOn]} onPress={() => setMode("month")}>
          <Text style={styles.segText}>月</Text>
        </Pressable>
        <Pressable style={[styles.segBtn, mode === "year" && styles.segOn]} onPress={() => setMode("year")}>
          <Text style={styles.segText}>年</Text>
        </Pressable>
      </View>
      <View style={styles.monthRow}>
        <Pressable onPress={() => (mode === "year" ? setYear((y) => y - 1) : month === 0 ? (setYear((y) => y - 1), setMonth(11)) : setMonth((m) => m - 1))}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{mode === "year" ? String(year) : formatMonthTitle(year, month)}</Text>
        <Pressable onPress={() => (mode === "year" ? setYear((y) => y + 1) : month === 11 ? (setYear((y) => y + 1), setMonth(0)) : setMonth((m) => m + 1))}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>
      {mode === "month" ? (
        <>
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
          <View style={styles.grid}>
            {cells.map((cell, index) => {
              const count = cell.key ? (dayCounts[cell.key] ?? 0) : 0;
              return (
                <Pressable
                  key={`${cell.key ?? "e"}-${index}`}
                  style={[styles.cell, { backgroundColor: cell.day ? heat(count) : "transparent" }]}
                  disabled={!cell.key || count === 0}
                  onPress={() => {
                    if (!cell.key) return;
                    const ids = cardsOnDay(cell.key).map((card) => card.id);
                    if (ids.length === 0) return;
                    navigation.navigate("RecallSession", { kind: "day", cardIds: ids, dateKey: cell.key });
                  }}
                >
                  <Text style={styles.cellText}>{cell.day ?? ""}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.yearGrid}>
          {Array.from({ length: 12 }, (_, i) => {
            const s = monthStats(year, i);
            return (
              <Pressable
                key={i}
                style={styles.yearCell}
                onPress={() => {
                  setMonth(i);
                  setMode("month");
                }}
              >
                <Text style={styles.yearLabel}>{i + 1}月</Text>
                <Text style={styles.yearSub}>{s.days} 天</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.md, paddingVertical: 8 },
  close: { fontSize: 18, width: 28, color: colors.ink },
  title: { flex: 1, textAlign: "center", fontWeight: "800", fontSize: 16 },
  spacer: { width: 28 },
  seg: { flexDirection: "row", alignSelf: "center", backgroundColor: colors.hair, borderRadius: 16, padding: 3, gap: 2 },
  segBtn: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 14 },
  segOn: { backgroundColor: colors.card },
  segText: { fontWeight: "700", color: colors.ink },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingTop: 18 },
  monthTitle: { fontSize: 22, fontWeight: "800", color: colors.ink },
  nav: { fontSize: 24, color: colors.ink, paddingHorizontal: 8 },
  stats: { textAlign: "center", color: colors.muted, marginTop: 8, marginBottom: 16 },
  week: { flexDirection: "row", paddingHorizontal: space.md },
  weekDay: { flex: 1, textAlign: "center", color: colors.muted, fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: space.md, marginTop: 8 },
  cell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 6, marginBottom: 4 },
  cellText: { fontSize: 11, color: colors.ink },
  yearGrid: { flexDirection: "row", flexWrap: "wrap", padding: space.md, gap: 10 },
  yearCell: { width: "30%", backgroundColor: colors.accentSoft, borderRadius: 10, padding: 12 },
  yearLabel: { fontWeight: "800", color: colors.ink },
  yearSub: { color: colors.muted, marginTop: 4, fontSize: 12 }
});
