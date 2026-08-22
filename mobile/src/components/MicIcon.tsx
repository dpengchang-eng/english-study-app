import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/** Line microphone. */
export function MicIcon({ color = colors.ink }: { color?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.capsule, { borderColor: color }]} />
      <View style={[styles.arc, { borderColor: color }]} />
      <View style={[styles.stem, { backgroundColor: color }]} />
      <View style={[styles.base, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 22, height: 22, alignItems: "center" },
  capsule: {
    position: "absolute",
    top: 1,
    width: 8,
    height: 12,
    borderWidth: 1.6,
    borderRadius: 4
  },
  arc: {
    position: "absolute",
    top: 7,
    width: 14,
    height: 8,
    borderWidth: 1.6,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8
  },
  stem: {
    position: "absolute",
    top: 15,
    width: 1.6,
    height: 4
  },
  base: {
    position: "absolute",
    bottom: 1,
    width: 10,
    height: 1.6,
    borderRadius: 1
  }
});
