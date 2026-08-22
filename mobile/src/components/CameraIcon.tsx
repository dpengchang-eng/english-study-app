import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/** Line camera body + lens. */
export function CameraIcon({ color = colors.ink }: { color?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.bump, { backgroundColor: color }]} />
      <View style={[styles.body, { borderColor: color }]} />
      <View style={[styles.lens, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 22, height: 22 },
  bump: {
    position: "absolute",
    top: 2,
    left: 7,
    width: 6,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2
  },
  body: {
    position: "absolute",
    top: 4,
    left: 1,
    width: 20,
    height: 15,
    borderWidth: 1.6,
    borderRadius: 4
  },
  lens: {
    position: "absolute",
    top: 7,
    left: 7,
    width: 8,
    height: 8,
    borderWidth: 1.6,
    borderRadius: 4
  }
});
