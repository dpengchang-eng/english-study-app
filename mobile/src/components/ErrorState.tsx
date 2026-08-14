import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ConvertErrorCode } from "../types";
import { ERROR_COPY } from "../types";
import { colors, space } from "../theme";

export function ErrorState({
  errorCode,
  onRetry
}: {
  errorCode?: ConvertErrorCode;
  onRetry: () => void;
}) {
  const timeout = errorCode === "gemini_timeout";
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{timeout ? "转换超时" : "转换失败"}</Text>
      <Text style={styles.body}>{errorCode ? ERROR_COPY[errorCode] : "转换失败。"}</Text>
      <Pressable style={styles.btn} onPress={onRetry}>
        <Text style={styles.btnText}>再转一次</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space.sm, alignItems: "flex-start" },
  title: { color: colors.warn, fontSize: 18, fontWeight: "700" },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  btnText: { color: "#fff", fontWeight: "700" }
});
