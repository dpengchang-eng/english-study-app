import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, space } from "../theme";
import type { LanguageSettings } from "../types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.chev}>▾</Text>
      </View>
    </View>
  );
}

export function LanguageSettingsModal({
  visible,
  value,
  onCancel,
  onSave
}: {
  visible: boolean;
  value: LanguageSettings;
  onCancel: () => void;
  onSave: (next: LanguageSettings) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.mask}>
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>语言设置</Text>
            <Pressable onPress={onCancel} hitSlop={8}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <Row label="App UI 语言" value="简体中文" />
          <Row label="学习语言" value="英语" />
          <Row label="表达难度" value="进阶" />
          <Row label="语音音色" value="Andrew (English US)" />
          <Text style={styles.adv}>语音输入高级设置</Text>
          <Pressable
            style={styles.checkRow}
            onPress={() => setDraft((prev) => ({ ...prev, multilingualStt: !prev.multilingualStt }))}
          >
            <View style={styles.check}>{draft.multilingualStt ? <Text style={styles.tick}>✓</Text> : null}</View>
            <Text style={styles.checkText}>多语言识别</Text>
          </Pressable>
          <View style={styles.actions}>
            <Pressable style={styles.cancel} onPress={onCancel}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable style={styles.save} onPress={() => onSave(draft)}>
              <Text style={styles.saveText}>保存</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 22 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: space.md, gap: 10 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "800", color: colors.ink },
  close: { fontSize: 18, color: colors.muted },
  row: { gap: 6 },
  label: { fontSize: 13, color: colors.ink },
  box: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  value: { color: colors.ink, fontSize: 14 },
  chev: { color: colors.muted },
  adv: { marginTop: 6, fontSize: 13, color: colors.ink },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 10
  },
  check: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center"
  },
  tick: { fontSize: 12, fontWeight: "800" },
  checkText: { fontSize: 14, color: colors.ink },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancel: { flex: 1, borderWidth: 1, borderColor: colors.ink, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  cancelText: { fontWeight: "700", color: colors.ink },
  save: { flex: 1, backgroundColor: colors.ink, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  saveText: { fontWeight: "700", color: "#fff" }
});
