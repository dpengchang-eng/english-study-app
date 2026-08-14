import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppState } from "../context/AppState";
import { useWordbook } from "../context/WordbookState";
import { getQuotaToday, type QuotaToday } from "../services/quota";
import { colors, space } from "../theme";

export function MeScreen() {
  const { uid } = useAppState();
  const { items, dueCount } = useWordbook();
  const [quota, setQuota] = useState<QuotaToday | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void getQuotaToday(uid).then((row) => {
        if (live) setQuota(row);
      });
      return () => {
        live = false;
      };
    }, [uid])
  );

  return (
    <View style={styles.page}>
      <Text style={styles.title}>我的</Text>
      <Text style={styles.body}>匿名使用</Text>
      {quota ? (
        <Text style={styles.body}>
          今天还能转换 {quota.remaining} 次（每天 {quota.limit} 次，首尔时间）
        </Text>
      ) : (
        <Text style={styles.muted}>正在读取今日额度…</Text>
      )}
      <Text style={styles.body}>词本 {items.length} 个</Text>
      <Text style={styles.body}>待复习 {dueCount} 个</Text>
      <Text style={styles.muted}>听句子用系统语音。Expo Go 里只能打字转换。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.md, gap: 10, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  body: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 22 }
});
