import { StyleSheet, Text, View } from "react-native";
import { colors, space } from "../theme";

export function OfflineBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>现在离线，不能转换。文字可以先留在输入框。</Text>
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
