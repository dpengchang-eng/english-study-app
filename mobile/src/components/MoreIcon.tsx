import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/**
 * Material more-horiz: three circular dots, large enough to read as an icon
 * (not leftover `···` text). Drawn with Views so it never falls back to tofu.
 */
export function MoreIcon() {
  return (
    <View style={styles.wrap}>
      <View style={[styles.dot, styles.a]} />
      <View style={[styles.dot, styles.b]} />
      <View style={[styles.dot, styles.c]} />
    </View>
  );
}

const SIZE = 28;
const DOT = 8;
const TOP = (SIZE - DOT) / 2;

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    position: "relative"
  },
  dot: {
    position: "absolute",
    top: TOP,
    width: DOT,
    height: DOT,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.ink
  },
  a: { left: 0 },
  b: { left: 10 },
  c: { left: 20 }
});
