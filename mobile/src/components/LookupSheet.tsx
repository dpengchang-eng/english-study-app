import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { lookupWord } from "../data/lookup";
import { colors, space } from "../theme";

export function LookupSheet({
  word,
  onClose
}: {
  word: string | null;
  onClose: () => void;
}) {
  if (!word) return null;
  const info = lookupWord(word);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.mask} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.word}>{info.word}</Text>
          {info.ipa ? <Text style={styles.ipa}>{info.ipa}</Text> : null}
          {info.senses.map((sense) => (
            <Text key={sense} style={styles.sense}>
              {sense}
            </Text>
          ))}
          <Pressable style={styles.ok} onPress={onClose}>
            <Text style={styles.okText}>关闭</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: space.lg,
    gap: 8
  },
  word: { fontSize: 22, fontWeight: "800", color: colors.ink },
  ipa: { color: colors.muted, fontSize: 14 },
  sense: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  ok: { alignSelf: "flex-end", paddingVertical: 8 },
  okText: { fontWeight: "700", color: colors.ink }
});
