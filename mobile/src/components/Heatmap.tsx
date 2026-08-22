import { StyleSheet, Text, View } from "react-native";
import { dateKey } from "../services/dates";
import { colors } from "../theme";

function heatColor(count: number): string {
  if (count <= 0) return colors.heat0;
  if (count === 1) return colors.heat1;
  if (count === 2) return colors.heat2;
  if (count === 3) return colors.heat3;
  return colors.heat4;
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
  return (
    <View style={styles.row}>
      {months.map((month) => (
        <View key={month} style={styles.month}>
          <Text style={styles.label}>{["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month]}</Text>
          <View style={styles.grid}>
            {Array.from({ length: new Date(Date.UTC(year, month + 1, 0)).getUTCDate() }, (_, i) => {
              const day = i + 1;
              const key = dateKey(Date.UTC(year, month, day));
              return <View key={key} style={[styles.cell, { backgroundColor: heatColor(dayCounts[key] ?? 0) }]} />;
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  month: { flex: 1, gap: 4 },
  label: { fontSize: 10, color: colors.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  cell: { width: 7, height: 7, borderRadius: 1 }
});
