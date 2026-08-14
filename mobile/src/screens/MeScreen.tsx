import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { auth } from "../firebase";
import { useAppState } from "../context/AppState";
import {
  accountLabel,
  bindApple,
  bindGoogleIdToken,
  googleClientConfigured,
  isBound,
  useGoogleAuthRequest
} from "../services/account";
import { colors, space } from "../theme";
import type { QuizSize, SpeechRatePreset } from "../types";

export function MeScreen() {
  const { settings, setSettings } = useAppState();
  const user = auth.currentUser;
  const [message, setMessage] = useState<string | null>(null);
  const [request, , promptAsync] = useGoogleAuthRequest();

  const bindAppleAccount = async (): Promise<void> => {
    try {
      await bindApple();
      setMessage("已绑定 Apple。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "绑定失败。");
    }
  };

  const bindGoogleAccount = async (): Promise<void> => {
    if (!googleClientConfigured()) {
      setMessage("还没配置 EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID，绑定以后再开。");
      return;
    }
    try {
      const result = await promptAsync();
      const idToken = result.type === "success" ? result.params.id_token : null;
      if (!idToken) {
        setMessage("没有拿到 Google 登录凭证。");
        return;
      }
      await bindGoogleIdToken(String(idToken));
      setMessage("已绑定 Google。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "绑定失败。");
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.label}>账号</Text>
        <Text style={styles.value}>{accountLabel(user)}</Text>
        <Text style={styles.hint}>启动时已匿名登录。绑定后才能换设备同步。</Text>
        {!isBound(user) && (
          <View style={styles.row}>
            <Pressable style={styles.btn} onPress={() => void bindAppleAccount()}>
              <Text style={styles.btnText}>绑定 Apple</Text>
            </Pressable>
            <Pressable style={[styles.btn, !request && styles.off]} onPress={() => void bindGoogleAccount()}>
              <Text style={styles.btnText}>绑定 Google</Text>
            </Pressable>
          </View>
        )}
        {message && <Text style={styles.msg}>{message}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>填空题量</Text>
        <View style={styles.row}>
          {([5, 10, 15] as QuizSize[]).map((size) => (
            <Pressable
              key={size}
              style={[styles.chip, settings.quizSize === size && styles.chipOn]}
              onPress={() => setSettings({ ...settings, quizSize: size })}
            >
              <Text style={styles.chipText}>{size} 题</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>语速</Text>
        <View style={styles.row}>
          {([
            ["slow", "慢"],
            ["normal", "正常"],
            ["fast", "快"]
          ] as const).map(([id, label]: readonly [SpeechRatePreset, string]) => (
            <Pressable
              key={id}
              style={[styles.chip, settings.speechRate === id && styles.chipOn]}
              onPress={() => setSettings({ ...settings, speechRate: id })}
            >
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>云端美音</Text>
        <Text style={styles.hint}>打开后优先用 Cloud TTS，失败再走本机语音。</Text>
        <Pressable
          style={[styles.chip, settings.cloudVoice && styles.chipOn]}
          onPress={() => setSettings({ ...settings, cloudVoice: !settings.cloudVoice })}
        >
          <Text style={styles.chipText}>{settings.cloudVoice ? "已开" : "已关"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: space.md, gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8
  },
  label: { color: colors.muted, fontSize: 13 },
  value: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  hint: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  btnText: { color: "#fff", fontWeight: "700" },
  chip: { backgroundColor: colors.chip, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.chipOn },
  chipText: { color: colors.ink, fontWeight: "600" },
  off: { opacity: 0.4 },
  msg: { color: colors.accent, fontSize: 13 }
});
