import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

/** Material more-horiz: three dots in a row, drawn so it never falls back to tofu. */
export function MoreIcon() {
  return (
    <View style={styles.wrap}>
      <View style={styles.dot} />
      <View style={styles.dot} />
      <View style={styles.dot} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 18,
    height: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 1
  },
  dot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.muted
  }
});
