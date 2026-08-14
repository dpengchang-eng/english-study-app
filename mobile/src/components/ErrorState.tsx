import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ConvertErrorCode } from "../types";
import { ERROR_COPY } from "../types";
import { colors, space } from "../theme";

const TITLES: Record<ConvertErrorCode, string> = {
  quota_exceeded: "今天的转换次数用完了",
  input_empty: "请先输入内容",
  input_too_long: "文字太长",
  input_invalid: "输入无效",
  gemini_timeout: "转换超时",
  gemini_unavailable: "模型暂时不可用",
  safety: "内容被安全策略拦截",
  parse_error: "结果解析失败"
};

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
  if (errorCode === "quota_exceeded") {
    return (
      <View style={styles.box}>
        <Text style={styles.title}>今天的转换次数用完了</Text>
        {isAnonymous ? <Text style={styles.body}>绑定后每天 80 次</Text> : null}
        <Pressable style={styles.btn} onPress={onGoHome}>
          <Text style={styles.btnText}>回首页</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{errorCode ? TITLES[errorCode] : "转换失败"}</Text>
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
