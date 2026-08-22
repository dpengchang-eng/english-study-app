import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/** Two offset outlines, drawn so the glyph never falls back to tofu on any device. */
export function CopyIcon() {
  return (
    <View style={styles.wrap}>
      <View style={styles.back} />
      <View style={styles.front} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 16, height: 16 },
  back: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: colors.dim,
    borderRadius: 2
  },
  front: {
    position: "absolute",
    left: 4,
    top: 4,
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 2,
    backgroundColor: colors.card
  }
});
