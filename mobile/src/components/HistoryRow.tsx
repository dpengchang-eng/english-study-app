import { Pressable, StyleSheet, Text } from "react-native";
import { resolveErrorCode } from "../services/convertError";
import type { Conversion } from "../types";
import { ERROR_COPY } from "../types";
import { colors, space } from "../theme";

export function HistoryRow({ item, onPress }: { item: Conversion; onPress: () => void }) {
  const preview =
    item.status === "loading"
      ? "转换中…"
      : item.status === "failed"
        ? ERROR_COPY[resolveErrorCode(item.errorCode)]
        : item.sentences.map((sentence) => sentence.text).join(" ") || item.outputText || "—";

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.source} numberOfLines={1}>
        {item.sourceText}
      </Text>
      <Text style={styles.preview} numberOfLines={2}>
        {preview}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: space.md,
    gap: 4
  },
  source: { color: colors.muted, fontSize: 13 },
  preview: { color: colors.ink, fontSize: 15 }
});
