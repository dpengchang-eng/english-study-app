import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, space } from "../theme";
import type { Difficulty, LanguageSettings, LearnLang, UiLang, VoiceName } from "../types";

const UI_LANGS: Array<{ id: UiLang; label: string }> = [
  { id: "zh-Hans", label: "简体中文" },
  { id: "en", label: "英语" }
];

const LEARN_LANGS: Array<{ id: LearnLang; label: string }> = [{ id: "en", label: "英语" }];

const DIFFICULTIES: Array<{ id: Difficulty; label: string }> = [
  { id: "beginner", label: "初级" },
  { id: "intermediate", label: "中级" },
  { id: "advanced", label: "进阶" }
];

const VOICES: Array<{ id: VoiceName; label: string }> = [{ id: "Andrew (English US)", label: "Andrew (English US)" }];

function labelOf<T extends string>(list: Array<{ id: T; label: string }>, id: T): string {
  return list.find((item) => item.id === id)?.label ?? id;
}

function Picker<T extends string>({
  label,
  value,
  options,
  open,
  onOpen,
  onPick
}: {
  label: string;
  value: T;
  options: Array<{ id: T; label: string }>;
  open: boolean;
  onOpen: () => void;
  onPick: (id: T) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.box} onPress={onOpen} accessibilityRole="button" accessibilityLabel={label}>
        <Text style={styles.value}>{labelOf(options, value)}</Text>
        <Text style={styles.chev}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      {open
        ? options.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.option, item.id === value && styles.optionOn]}
              onPress={() => onPick(item.id)}
            >
              <Text style={styles.optionText}>{item.label}</Text>
              {item.id === value ? <Text style={styles.mark}>✓</Text> : null}
            </Pressable>
          ))
        : null}
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
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setDraft(value);
      setOpen(null);
    }
  }, [visible, value]);

  const toggle = (key: string): void => {
    setOpen((current) => (current === key ? null : key));
  };

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
          <Picker
            label="App UI 语言"
            value={draft.uiLang}
            options={UI_LANGS}
            open={open === "ui"}
            onOpen={() => toggle("ui")}
            onPick={(id) => {
              setDraft((prev) => ({ ...prev, uiLang: id }));
              setOpen(null);
            }}
          />
          <Picker
            label="学习语言"
            value={draft.learnLang}
            options={LEARN_LANGS}
            open={open === "learn"}
            onOpen={() => toggle("learn")}
            onPick={(id) => {
              setDraft((prev) => ({ ...prev, learnLang: id }));
              setOpen(null);
            }}
          />
          <Picker
            label="表达难度"
            value={draft.difficulty}
            options={DIFFICULTIES}
            open={open === "diff"}
            onOpen={() => toggle("diff")}
            onPick={(id) => {
              setDraft((prev) => ({ ...prev, difficulty: id }));
              setOpen(null);
            }}
          />
          <Picker
            label="语音音色"
            value={draft.voice}
            options={VOICES}
            open={open === "voice"}
            onOpen={() => toggle("voice")}
            onPick={(id) => {
              setDraft((prev) => ({ ...prev, voice: id }));
              setOpen(null);
            }}
          />
          <Text style={styles.adv}>语音输入高级设置</Text>
          <Pressable
            style={styles.checkRow}
            onPress={() => setDraft((prev) => ({ ...prev, multilingualStt: !prev.multilingualStt }))}
          >
            <View style={[styles.check, draft.multilingualStt && styles.checkOn]}>
              {draft.multilingualStt ? <Text style={styles.tick}>✓</Text> : null}
            </View>
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
  option: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  optionOn: { backgroundColor: colors.accentSoft },
  optionText: { color: colors.ink, fontSize: 14 },
  mark: { color: colors.ink, fontWeight: "800" },
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
    borderColor: colors.dim,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center"
  },
  checkOn: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  tick: { fontSize: 12, fontWeight: "800", color: "#fff" },
  checkText: { fontSize: 14, color: colors.ink },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancel: { flex: 1, borderWidth: 1, borderColor: colors.ink, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  cancelText: { fontWeight: "700", color: colors.ink },
  save: { flex: 1, backgroundColor: colors.ink, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  saveText: { fontWeight: "700", color: "#fff" }
});
