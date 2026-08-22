import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/** Line eye, drawn so hide/show never falls back to a photo emoji. */
export function EyeIcon({
  color = colors.ink,
  slashed = false
}: {
  color?: string;
  slashed?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.lid, { borderColor: color }]} />
      <View style={[styles.pupil, { backgroundColor: color }]} />
      {slashed ? <View style={[styles.slash, { backgroundColor: color }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  lid: {
    width: 16,
    height: 10,
    borderWidth: 1.6,
    borderRadius: 8
  },
  pupil: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2
  },
  slash: {
    position: "absolute",
    width: 18,
    height: 1.6,
    borderRadius: 1,
    transform: [{ rotate: "-40deg" }]
  }
});
