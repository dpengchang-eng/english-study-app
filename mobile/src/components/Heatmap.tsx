import { StyleSheet, Text, View } from "react-native";
import { dateKey } from "../services/dates";
import { colors } from "../theme";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function heatColor(count: number): string {
  if (count <= 0) return colors.heat0;
  if (count === 1) return colors.heat1;
  if (count === 2) return colors.heat2;
  if (count === 3) return colors.heat3;
  return colors.heat4;
}

/** Sunday-first week columns, like the Android drawer contribution grid. */
function weekColumns(year: number, months: number[]): string[][] {
  const first = months[0] ?? 0;
  const last = months[months.length - 1] ?? first;
  const start = new Date(Date.UTC(year, first, 1));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(Date.UTC(year, last + 1, 0));
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const columns: string[][] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const column: string[] = [];
    for (let day = 0; day < 7; day += 1) {
      column.push(dateKey(cursor.getTime()));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    columns.push(column);
  }
  return columns;
}

export function DrawerHeatmap({
  dayCounts,
  year,
  months
}: {
  dayCounts: Record<string, number>;
  year: number;
  months: number[];
}) {
  const columns = weekColumns(year, months);
  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {columns.map((column) => (
          <View key={column[0]} style={styles.column}>
            {column.map((key) => (
              <View key={key} style={[styles.cell, { backgroundColor: heatColor(dayCounts[key] ?? 0) }]} />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {months.map((month) => (
          <Text key={month} style={styles.label}>
            {MONTH_LABELS[month]}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  grid: { flexDirection: "row", gap: 3 },
  column: { flex: 1, gap: 3 },
  cell: { width: "100%", aspectRatio: 1, borderRadius: 2 },
  labels: { flexDirection: "row" },
  label: { flex: 1, textAlign: "center", fontSize: 10, color: colors.muted }
});
