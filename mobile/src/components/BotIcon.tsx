import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/** Line robot head for AI 助手. Never the photo emoji. */
export function BotIcon({ color = colors.ink, size = 22 }: { color?: string; size?: number }) {
  const scale = size / 22;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View style={[styles.antenna, { backgroundColor: color, transform: [{ scale }] }]} />
      <View style={[styles.head, { borderColor: color, transform: [{ scale }] }]} />
      <View style={[styles.eye, styles.leftEye, { backgroundColor: color, transform: [{ scale }] }]} />
      <View style={[styles.eye, styles.rightEye, { backgroundColor: color, transform: [{ scale }] }]} />
      <View style={[styles.mouth, { backgroundColor: color, transform: [{ scale }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  antenna: {
    position: "absolute",
    top: 0,
    width: 1.6,
    height: 4,
    borderRadius: 1
  },
  head: {
    position: "absolute",
    top: 3,
    width: 16,
    height: 16,
    borderWidth: 1.6,
    borderRadius: 4
  },
  eye: {
    position: "absolute",
    top: 8,
    width: 2.4,
    height: 2.4,
    borderRadius: 1.2
  },
  leftEye: { left: 6 },
  rightEye: { right: 6 },
  mouth: {
    position: "absolute",
    top: 13,
    width: 6,
    height: 1.6,
    borderRadius: 1
  }
});
