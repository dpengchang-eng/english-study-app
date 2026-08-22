import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/** Material-style visibility icon. Outline only, never a photo emoji. */
export function EyeIcon({
  color = colors.ink,
  slashed = false
}: {
  color?: string;
  slashed?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.almond, { borderColor: color }]} />
      <View style={[styles.iris, { borderColor: color }]} />
      {slashed ? <View style={[styles.slash, { backgroundColor: color }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  almond: {
    width: 14,
    height: 14,
    borderWidth: 1.8,
    borderRadius: 7,
    transform: [{ scaleX: 1.35 }, { scaleY: 0.7 }]
  },
  iris: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.8
  },
  slash: {
    position: "absolute",
    width: 20,
    height: 1.8,
    borderRadius: 1,
    transform: [{ rotate: "-40deg" }]
  }
});
