import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, SafeAreaView, StatusBar as RNStatusBar, StyleSheet, Text, View } from "react-native";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "./src/firebase";
import { isDue, subscribeSavedItems } from "./src/services/firestore";
import { ConvertScreen } from "./src/screens/ConvertScreen";
import { PracticeScreen } from "./src/screens/PracticeScreen";
import { ReviewScreen } from "./src/screens/ReviewScreen";
import { colors } from "./src/theme";
import type { SavedItem, TabId } from "./src/types";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "convert", label: "改写" },
  { id: "practice", label: "练习" },
  { id: "review", label: "复习" }
];

export default function App() {
  const [uid, setUid] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("convert");
  const [items, setItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
    });
    void signInAnonymously(auth).catch(() => {
      setBootError("匿名登录失败。请检查网络后重启应用。");
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!uid) return;
    return subscribeSavedItems(uid, setItems);
  }, [uid]);

  const dueCount = items.filter((item) => isDue(item)).length;

  if (!uid) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.brand}>地道</Text>
          {bootError ? <Text style={styles.error}>{bootError}</Text> : <ActivityIndicator color={colors.accent} />}
          <Text style={styles.muted}>正在用现有 Firebase 项目匿名登录…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>地道</Text>
          <Text style={styles.muted}>地道美语 · 听读练复习</Text>
        </View>
        <Text style={styles.uid}>ID {uid.slice(0, 6)}</Text>
      </View>
      <View style={styles.body}>
        {tab === "convert" && <ConvertScreen uid={uid} />}
        {tab === "practice" && <PracticeScreen items={items} />}
        {tab === "review" && <ReviewScreen uid={uid} items={items} />}
      </View>
      <View style={styles.tabs}>
        {TABS.map((item) => {
          const active = tab === item.id;
          const extra = item.id === "review" && dueCount > 0 ? ` ${dueCount}` : "";
          return (
            <Pressable key={item.id} style={[styles.tab, active && styles.tabOn]} onPress={() => setTab(item.id)}>
              <Text style={[styles.tabText, active && styles.tabTextOn]}>
                {item.label}
                {extra}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight ?? 0 : 0
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  brand: { fontSize: 28, fontWeight: "800", color: colors.ink },
  muted: { color: colors.muted, marginTop: 2 },
  uid: { color: colors.muted, fontSize: 12 },
  body: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  error: { color: colors.warn, textAlign: "center" },
  tabs: {
    flexDirection: "row",
    margin: 12,
    backgroundColor: colors.tab,
    borderRadius: 16,
    padding: 4,
    gap: 4
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  tabOn: { backgroundColor: colors.card },
  tabText: { color: colors.muted, fontWeight: "600", fontSize: 16 },
  tabTextOn: { color: colors.ink }
});
