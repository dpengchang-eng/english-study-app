import { StyleSheet, Text, View } from "react-native";
import { colors, space } from "../theme";

export function OfflineBanner({ text }: { text: string }) {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#F3D6D2",
    borderRadius: 12,
    paddingHorizontal: space.md,
    paddingVertical: space.sm
  },
  text: { color: colors.warn, fontSize: 13 }
});
