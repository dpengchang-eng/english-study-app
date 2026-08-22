import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/** Line calendar page. Never the JUL 17 photo emoji. */
export function CalendarIcon({ color = colors.ink }: { color?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, styles.leftRing, { backgroundColor: color }]} />
      <View style={[styles.ring, styles.rightRing, { backgroundColor: color }]} />
      <View style={[styles.body, { borderColor: color }]} />
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={[styles.cell, { backgroundColor: color, left: 5, top: 11 }]} />
      <View style={[styles.cell, { backgroundColor: color, left: 10, top: 11 }]} />
      <View style={[styles.cell, { backgroundColor: color, left: 15, top: 11 }]} />
      <View style={[styles.cell, { backgroundColor: color, left: 5, top: 16 }]} />
      <View style={[styles.cell, { backgroundColor: color, left: 10, top: 16 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 22, height: 22 },
  body: {
    position: "absolute",
    top: 3,
    left: 2,
    width: 18,
    height: 17,
    borderWidth: 1.6,
    borderRadius: 3
  },
  bar: {
    position: "absolute",
    top: 3,
    left: 2,
    width: 18,
    height: 4
  },
  ring: {
    position: "absolute",
    top: 0,
    width: 1.6,
    height: 5,
    borderRadius: 1
  },
  leftRing: { left: 7 },
  rightRing: { right: 7 },
  cell: {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: 0.5
  }
});
