import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, space } from "../theme";
import type { MysteryRange } from "../types";

const RANGES: Array<{ id: MysteryRange; label: string }> = [
  { id: "week", label: "本周" },
  { id: "month", label: "本月" },
  { id: "quarter", label: "本季度" },
  { id: "year", label: "本年" },
  { id: "all", label: "全部" }
];

export function MysteryBoxModal({
  visible,
  onClose,
  onStart
}: {
  visible: boolean;
  onClose: () => void;
  onStart: (range: MysteryRange, count: number) => void;
}) {
  const [range, setRange] = useState<MysteryRange>("quarter");
  const [count, setCount] = useState(5);
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.mask}>
        <View style={styles.card}>
          <Text style={styles.title}>记忆盲盒</Text>
          <Text style={styles.label}>时间范围</Text>
          <View style={styles.chips}>
            {RANGES.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.chip, range === item.id && styles.chipOn]}
                onPress={() => setRange(item.id)}
              >
                <Text style={[styles.chipText, range === item.id && styles.chipTextOn]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>卡片数量 {count}</Text>
          <View style={styles.step}>
            <Pressable onPress={() => setCount((n) => Math.max(1, n - 1))} style={styles.stepBtn}>
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.count}>{count}</Text>
            <Pressable onPress={() => setCount((n) => Math.min(10, n + 1))} style={styles.stepBtn}>
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
          <Pressable style={styles.start} onPress={() => onStart(range, count)}>
            <Text style={styles.startText}>开始回忆</Text>
          </Pressable>
          <Pressable onPress={onClose}>
            <Text style={styles.cancel}>取消</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 22 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: space.md, gap: 12 },
  title: { fontSize: 18, fontWeight: "800", color: colors.ink },
  label: { fontSize: 13, color: colors.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.ink, fontSize: 13 },
  chipTextOn: { color: "#fff" },
  step: { flexDirection: "row", alignItems: "center", gap: 16 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 20, color: colors.ink },
  count: { fontSize: 18, fontWeight: "800" },
  start: { backgroundColor: colors.ink, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  startText: { color: "#fff", fontWeight: "700" },
  cancel: { textAlign: "center", color: colors.muted, paddingVertical: 4 }
});
