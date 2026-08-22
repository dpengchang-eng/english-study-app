import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/** Line gift/box for 记忆盲盒. Never the cardboard emoji. */
export function BoxIcon({ color = colors.ink }: { color?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.body, { borderColor: color }]} />
      <View style={[styles.lid, { borderColor: color }]} />
      <View style={[styles.ribbonV, { backgroundColor: color }]} />
      <View style={[styles.ribbonH, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 22, height: 22 },
  lid: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 18,
    height: 6,
    borderWidth: 1.6,
    borderRadius: 2
  },
  body: {
    position: "absolute",
    top: 7,
    left: 3,
    width: 16,
    height: 13,
    borderWidth: 1.6,
    borderRadius: 2
  },
  ribbonV: {
    position: "absolute",
    top: 2,
    left: 10,
    width: 1.6,
    height: 18
  },
  ribbonH: {
    position: "absolute",
    top: 6,
    left: 2,
    width: 18,
    height: 1.6
  }
});
