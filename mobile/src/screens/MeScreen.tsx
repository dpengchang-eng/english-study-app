import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LanguageSettingsModal } from "../components/LanguageSettingsModal";
import { useAppState } from "../context/AppState";
import type { RootStackParamList } from "../navigation/types";
import { colors, space } from "../theme";

export function MeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, settings, saveSettings, signOut } = useAppState();
  const [lang, setLang] = useState(false);
  const [about, setAbout] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>我的</Text>
        <View style={styles.spacer} />
      </View>
      <View style={styles.card}>
        <View style={styles.avatar} />
        <View>
          <View style={styles.idRow}>
            <Text style={styles.uid}>{user.id}</Text>
            {user.isPro ? (
              <View style={styles.pro}>
                <Text style={styles.proText}>PRO</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.hint}>本地演示账号</Text>
        </View>
      </View>
      <Pressable style={styles.row} onPress={() => setLang(true)}>
        <Text style={styles.rowText}>语言设置</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => setAbout((open) => !open)}>
        <Text style={styles.rowText}>关于</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      {about ? <Text style={styles.about}>地道是生活记录，不是课程、翻译器或单词表。先记下此刻，再练地道英语。</Text> : null}
      <Pressable
        style={styles.row}
        onPress={() => {
          signOut();
          navigation.reset({ index: 0, routes: [{ name: "Home" }] });
        }}
      >
        <Text style={styles.out}>退出</Text>
      </Pressable>
      <LanguageSettingsModal visible={lang} value={settings} onCancel={() => setLang(false)} onSave={(next) => { saveSettings(next); setLang(false); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.page },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.md, paddingVertical: 8, backgroundColor: colors.bg },
  back: { fontSize: 24, width: 28, color: colors.ink },
  title: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800" },
  spacer: { width: 28 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.bg, padding: space.md, marginTop: 8 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.hair },
  idRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  uid: { fontSize: 18, fontWeight: "800", color: colors.ink },
  pro: { backgroundColor: colors.pro, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  proText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  hint: { color: colors.muted, marginTop: 4, fontSize: 12 },
  row: { backgroundColor: colors.bg, marginTop: 8, padding: space.md, flexDirection: "row", justifyContent: "space-between" },
  rowText: { fontSize: 16, color: colors.ink },
  chev: { color: colors.muted },
  about: { paddingHorizontal: space.md, paddingVertical: 8, color: colors.muted, lineHeight: 20 },
  out: { color: colors.warn, fontSize: 16, fontWeight: "700" }
});
