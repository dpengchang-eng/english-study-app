import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.bubble}>
        <Text style={styles.mark}>i</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 88, left: 24, right: 24, alignItems: "center", zIndex: 40 },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    maxWidth: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  mark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#3B82F6",
    color: "#fff",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    overflow: "hidden"
  },
  text: { flex: 1, color: colors.ink, fontSize: 13 }
});
