import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/** Outline pencil, drawn so the edit control never falls back to a tofu glyph. */
export function EditIcon() {
  return (
    <View style={styles.wrap}>
      <View style={styles.shaft} />
      <View style={styles.eraser} />
      <View style={styles.tip} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 18, height: 18 },
  shaft: {
    position: "absolute",
    width: 11,
    height: 3,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 1,
    top: 7.5,
    left: 3,
    transform: [{ rotate: "-45deg" }]
  },
  eraser: {
    position: "absolute",
    width: 4,
    height: 4,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.bg,
    top: 1,
    right: 1,
    transform: [{ rotate: "-45deg" }]
  },
  tip: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopWidth: 3.5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.ink,
    left: 1,
    bottom: 1,
    transform: [{ rotate: "45deg" }]
  }
});
