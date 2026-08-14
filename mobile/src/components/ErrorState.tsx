import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ConvertErrorCode } from "../types";
import { ERROR_COPY, ERROR_GO_HOME } from "../types";
import { resolveErrorCode } from "../services/convertError";
import { colors, space } from "../theme";

export function ErrorState({
  errorCode,
  isAnonymous,
  onRetry,
  onGoHome
}: {
  errorCode?: ConvertErrorCode;
  isAnonymous: boolean;
  onRetry: () => void;
  onGoHome: () => void;
}) {
  const code = resolveErrorCode(errorCode);
  const goHome = ERROR_GO_HOME.includes(code);

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{ERROR_COPY[code]}</Text>
      {code === "quota_exceeded" && isAnonymous ? <Text style={styles.body}>绑定后每天 80 次</Text> : null}
      {goHome ? (
        <Pressable style={styles.btn} onPress={onGoHome}>
          <Text style={styles.btnText}>回首页</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.btn} onPress={onRetry}>
          <Text style={styles.btnText}>再试一次</Text>
        </Pressable>
      )}
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
