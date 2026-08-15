import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { monthCells, seoulDayKey, shiftMonth, snapDisplayedMonth, yearMonthOf } from "../services/reviewCalendar";
import { colors, space } from "../theme";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function MonthCalendar({
  selectedDay,
  dottedDays,
  onPressDay,
  now = Date.now(),
  snapStaleMonth = false
}: {
  selectedDay: string | null;
  dottedDays: ReadonlySet<string>;
  onPressDay: (dayKey: string) => void;
  now?: number;
  snapStaleMonth?: boolean;
}) {
  const today = seoulDayKey(new Date(now));
  const start = yearMonthOf(now);
  const [{ year, month }, setMonth] = useState(start);
  useEffect(() => {
    if (!snapStaleMonth) return;
    setMonth((current) => snapDisplayedMonth(current.year, current.month, now));
  }, [now, snapStaleMonth]);
  const cells = monthCells(year, month);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="上月"
          hitSlop={8}
          onPress={() => setMonth((current) => shiftMonth(current.year, current.month, -1))}
        >
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.title}>
          {year}年{month}月
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="下月"
          hitSlop={8}
          onPress={() => setMonth((current) => shiftMonth(current.year, current.month, 1))}
        >
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((label) => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (!cell) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }
          const isToday = cell.dayKey === today;
          const isSelected = cell.dayKey === selectedDay;
          return (
            <Pressable
              key={cell.dayKey}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onPressDay(cell.dayKey)}
              style={[styles.cell, isToday && styles.today, isSelected && styles.selected]}
            >
              <Text style={[styles.day, isSelected && styles.dayOn]}>{cell.day}</Text>
              <View style={[styles.dot, dottedDays.has(cell.dayKey) ? styles.dotOn : null]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 6
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  nav: { fontSize: 28, lineHeight: 32, color: colors.accent, paddingHorizontal: 8 },
  week: { flexDirection: "row" },
  weekday: {
    flex: 1,
    textAlign: "center",
    color: colors.muted,
    fontSize: 12,
    paddingBottom: 4
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.2857%",
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
    paddingTop: 2
  },
  today: { backgroundColor: colors.accentSoft },
  selected: { borderColor: colors.accent },
  day: { fontSize: 14, color: colors.ink, fontWeight: "600" },
  dayOn: { color: colors.ink },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: "transparent" },
  dotOn: { backgroundColor: colors.accent }
});
