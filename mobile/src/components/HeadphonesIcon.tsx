import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/** Line headphones, drawn so dictation never falls back to a 3D emoji. */
export function HeadphonesIcon({ color = colors.ink }: { color?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.band, { borderColor: color }]} />
      <View style={[styles.cup, styles.left, { borderColor: color }]} />
      <View style={[styles.cup, styles.right, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 20, height: 20 },
  band: {
    position: "absolute",
    top: 1,
    left: 3,
    width: 14,
    height: 10,
    borderWidth: 1.6,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10
  },
  cup: {
    position: "absolute",
    bottom: 2,
    width: 5,
    height: 8,
    borderWidth: 1.6,
    borderRadius: 2
  },
  left: { left: 2 },
  right: { right: 2 }
});
