import { StyleSheet, Text, View } from "react-native";
import { ANON_DAILY_QUOTA } from "../services/quota";
import { colors, space } from "../theme";

/** v1.1 placeholder. No Google / Apple bind this cut. */
export function MeScreen() {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>我的</Text>
      <Text style={styles.body}>这一版先匿名使用。</Text>
      <Text style={styles.body}>Google / Apple 账号绑定下一版再做。</Text>
      <Text style={styles.muted}>每天可转换 {ANON_DAILY_QUOTA} 次（首尔时间）。</Text>
      <Text style={styles.muted}>在 Expo Go 里用打字转换。听句子用系统语音，不上传音频。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.md, gap: 10, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  body: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 22 }
});
