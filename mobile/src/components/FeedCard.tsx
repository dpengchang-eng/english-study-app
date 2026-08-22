import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatFeedStamp } from "../services/dates";
import { colors, space } from "../theme";
import type { JournalCard } from "../types";

export function FeedCard({
  card,
  selected,
  selecting,
  onPress,
  onOverflow
}: {
  card: JournalCard;
  selected?: boolean;
  selecting?: boolean;
  onPress: () => void;
  onOverflow: () => void;
}) {
  return (
    <Pressable style={[styles.card, selected && styles.selected]} onPress={onPress}>
      <Text style={styles.title} numberOfLines={1}>
        {card.title}
      </Text>
      <Text style={styles.preview} numberOfLines={2}>
        {card.rewrite || card.body}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.stamp}>{formatFeedStamp(card.createdAt)}</Text>
        {selecting ? (
          <Text style={styles.check}>{selected ? "●" : "○"}</Text>
        ) : (
          <Pressable onPress={onOverflow} hitSlop={10}>
            <Text style={styles.more}>···</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    gap: 6
  },
  selected: { backgroundColor: "#F7F7F7" },
  title: { fontSize: 16, fontWeight: "800", color: colors.ink },
  preview: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  stamp: { fontSize: 12, color: colors.dim },
  more: { color: colors.muted, fontSize: 16, letterSpacing: 1 },
  check: { color: colors.ink, fontSize: 16 }
});
