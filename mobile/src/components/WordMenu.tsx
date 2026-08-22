import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export type WordMenuKind = "word" | "blank";

export function WordMenu({
  visible,
  kind,
  top,
  left,
  onLookup,
  onCloze,
  onRemove
}: {
  visible: boolean;
  kind: WordMenuKind;
  top: number;
  left: number;
  onLookup: () => void;
  onCloze: () => void;
  onRemove: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={[styles.menu, { top, left }]}>
      <Pressable onPress={onLookup} style={styles.item}>
        <Text style={styles.text}>查词</Text>
      </Pressable>
      <View style={styles.div} />
      {kind === "word" ? (
        <Pressable onPress={onCloze} style={styles.item}>
          <Text style={styles.text}>挖空</Text>
        </Pressable>
      ) : (
        <Pressable onPress={onRemove} style={styles.item}>
          <Text style={styles.danger}>删除填空</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    zIndex: 30,
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4
  },
  item: { paddingHorizontal: 12, paddingVertical: 8 },
  text: { fontSize: 14, color: colors.ink, fontWeight: "600" },
  danger: { fontSize: 14, color: colors.warn, fontWeight: "700" },
  div: { width: 1, backgroundColor: colors.line }
});
