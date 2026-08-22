import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/**
 * Material more-horiz: three circular dots in a 24×24 icon box.
 * Drawn with Views so it never falls back to tofu or leftover `···` text.
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

const SIZE = 24;
const DOT = 6;
const TOP = (SIZE - DOT) / 2;

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE
  },
  dot: {
    position: "absolute",
    top: TOP,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.ink
  },
  a: { left: 1 },
  b: { left: 9 },
  c: { left: 17 }
});
