import { Pressable, StyleSheet, Text, View } from "react-native";
import { EyeIcon } from "./EyeIcon";
import { HeadphonesIcon } from "./HeadphonesIcon";
import { colors } from "../theme";

export type PracticeMode = "read" | "fill" | "select" | "dictation";

export function PracticeToolbar({
  mode,
  fillEnabled,
  showingOriginal,
  hidden,
  onToggleOriginal,
  onDictation,
  onToggleHidden,
  onFill,
  onSelect,
  onPlayAll
}: {
  mode: PracticeMode;
  fillEnabled: boolean;
  showingOriginal: boolean;
  hidden: boolean;
  onToggleOriginal: () => void;
  onDictation: () => void;
  onToggleHidden: () => void;
  onFill: () => void;
  onSelect: () => void;
  onPlayAll: () => void;
}) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={onToggleOriginal} hitSlop={8} style={styles.iconBtn}>
        <Text style={[styles.icon, showingOriginal && styles.on]}>⇄</Text>
      </Pressable>
      <Pressable onPress={onDictation} hitSlop={8} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="听写">
        <HeadphonesIcon color={mode === "dictation" ? colors.ink : colors.muted} />
      </Pressable>
      <Pressable onPress={onToggleHidden} hitSlop={8} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="显示">
        <EyeIcon slashed={hidden} color={colors.ink} />
      </Pressable>
      <Pressable onPress={onFill} disabled={!fillEnabled && mode !== "fill"} hitSlop={4}>
        <View style={[styles.pill, mode === "fill" && styles.pillOn, !fillEnabled && mode !== "fill" && styles.pillOff]}>
          <Text style={[styles.pillText, mode === "fill" && styles.pillTextOn]}>填</Text>
        </View>
      </Pressable>
      <Pressable onPress={onSelect} hitSlop={4}>
        <View style={[styles.pill, mode === "select" && styles.pillOn]}>
          <Text style={[styles.pillText, mode === "select" && styles.pillTextOn]}>选</Text>
        </View>
      </Pressable>
      <Pressable onPress={onPlayAll} hitSlop={8} style={styles.iconBtn}>
        <Text style={styles.play}>▶</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.card
  },
  iconBtn: { width: 36, alignItems: "center" },
  icon: { fontSize: 18, color: colors.ink },
  on: { opacity: 1 },
  play: { fontSize: 20, color: colors.ink },
  pill: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  pillOn: { backgroundColor: colors.ink },
  pillOff: { opacity: 0.35 },
  pillText: { fontSize: 16, fontWeight: "700", color: colors.ink },
  pillTextOn: { color: "#fff" }
});
