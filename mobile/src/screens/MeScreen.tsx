import { StyleSheet, Text, View } from "react-native";
import { useAppState } from "../context/AppState";
import { auth } from "../firebase";
import { ANON_DAILY_QUOTA } from "../services/quota";
import { colors, space } from "../theme";

export function MeScreen() {
  const { uid } = useAppState();
  const anonymous = !auth.currentUser || auth.currentUser.isAnonymous;
  return (
    <View style={styles.page}>
      <Text style={styles.body}>{anonymous ? "当前是匿名登录。" : "已登录。"}</Text>
      <Text style={styles.body}>每天可转换 {ANON_DAILY_QUOTA} 次（首尔时间）。</Text>
      <Text style={styles.muted}>用户 {uid.slice(0, 8)}…</Text>
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
