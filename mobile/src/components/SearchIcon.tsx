import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/** Line magnifying glass. Never the photo emoji. */
export function SearchIcon({ color = colors.ink }: { color?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.lens, { borderColor: color }]} />
      <View style={[styles.handle, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 22, height: 22 },
  lens: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 12,
    height: 12,
    borderWidth: 1.7,
    borderRadius: 6
  },
  handle: {
    position: "absolute",
    width: 7,
    height: 1.8,
    borderRadius: 1,
    right: 2,
    bottom: 4,
    transform: [{ rotate: "45deg" }]
  }
});
