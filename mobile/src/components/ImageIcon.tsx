import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/** Line picture frame for the gallery button. */
export function ImageIcon({ color = colors.ink }: { color?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.frame, { borderColor: color }]} />
      <View style={[styles.sun, { borderColor: color }]} />
      <View style={[styles.hill, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 22, height: 22 },
  frame: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 18,
    height: 18,
    borderWidth: 1.6,
    borderRadius: 3
  },
  sun: {
    position: "absolute",
    top: 5,
    left: 6,
    width: 4,
    height: 4,
    borderWidth: 1.4,
    borderRadius: 2
  },
  hill: {
    position: "absolute",
    left: 4,
    bottom: 4,
    width: 10,
    height: 10,
    borderWidth: 1.6,
    borderTopWidth: 0,
    borderRightWidth: 0,
    transform: [{ rotate: "45deg" }]
  }
});
