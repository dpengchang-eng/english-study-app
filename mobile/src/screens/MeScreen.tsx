import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthState";
import { useAppState } from "../context/AppState";
import { useWordbook } from "../context/WordbookState";
import { useGoogleBind } from "../hooks/useGoogleBind";
import { countReadyToday, loadLocalSuccessCount, remainingToday } from "../services/quota";
import { colors, space } from "../theme";

function Row({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function MeScreen() {
  const { uid, isAnonymous, email } = useAuth();
  const { online, recents } = useAppState();
  const { items, dueCount } = useWordbook();
  const [stored, setStored] = useState(0);
  const { busy, error, bindGoogle } = useGoogleBind();
  const bindDisabled = !online || busy;

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void loadLocalSuccessCount(uid).then((count) => {
        if (live) setStored(count);
      });
      return () => {
        live = false;
      };
    }, [uid])
  );

  const remaining = remainingToday(Math.max(stored, countReadyToday(recents)), !isAnonymous);

  return (
    <View style={styles.page}>
      {isAnonymous ? (
        <>
          <Text style={styles.body}>未绑定</Text>
          <Text style={styles.muted}>数据只在这台设备</Text>
        </>
      ) : (
        <>
          {email ? <Text style={styles.body}>{email}</Text> : null}
          <Text style={styles.muted}>数据在云端</Text>
        </>
      )}
      <Row label="今日剩余转换" value={remaining} />
      <Row label="词本数" value={items.length} />
      <Row label="待复习数" value={dueCount} />
      {isAnonymous ? (
        <Pressable
          style={[styles.btn, bindDisabled ? styles.btnOff : null]}
          onPress={() => void bindGoogle()}
          disabled={bindDisabled}
        >
          <Text style={styles.btnText}>绑定 Google</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.md, gap: 10, backgroundColor: colors.bg },
  body: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 22, marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  label: { color: colors.ink, fontSize: 16 },
  value: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  btnOff: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: colors.warn, fontSize: 14, lineHeight: 22 }
});
