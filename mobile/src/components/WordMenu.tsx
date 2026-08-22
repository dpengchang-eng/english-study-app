import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export type WordMenuKind = "word" | "blank";

const MENU_WIDTH = 132;

/** Keep the floating menu just above the touched word and inside the screen. */
export function menuPosition(x: number, y: number): { top: number; left: number } {
  const screen = Dimensions.get("window");
  const left = Math.min(Math.max(8, x - MENU_WIDTH / 2), Math.max(8, screen.width - MENU_WIDTH - 8));
  return { top: Math.max(8, y - 96), left };
}

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
    width: MENU_WIDTH,
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#F6E4E0",
    borderRadius: 16,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4
  },
  item: { paddingHorizontal: 10, paddingVertical: 6 },
  text: { fontSize: 14, color: colors.ink },
  danger: { fontSize: 14, color: colors.warn, fontWeight: "600" }
});
