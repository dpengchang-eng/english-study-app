import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppState } from "../context/AppState";
import { openCloze } from "../navigation/ref";
import { colors } from "../theme";

export function LookupSheet() {
  const { lookup, lookupResult, lookupBusy, closeLookup, addToWordbook, findSaved } = useAppState();
  const saved = lookup ? findSaved(lookup.phrase) : undefined;
  const ipa = lookupResult?.ipa ?? saved?.ipa ?? "";
  const senses = (lookupResult?.senses?.length ? lookupResult.senses : saved?.senses) ?? [];
  const failed = Boolean(lookupResult?.failed);

  return (
    <Modal visible={lookup !== null} transparent animationType="slide" onRequestClose={closeLookup}>
      <Pressable style={styles.mask} onPress={closeLookup}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.word}>{lookup?.phrase}</Text>
          {!!ipa && <Text style={styles.ipa}>{ipa}</Text>}
          {lookupBusy && <ActivityIndicator color={colors.accent} />}
          {!lookupBusy && failed && <Text style={styles.warn}>查词失败。仍可以加入词本。</Text>}
          {senses.slice(0, 3).map((sense) => (
            <Text key={sense} style={styles.sense}>
              · {sense}
            </Text>
          ))}
          <Text style={styles.sentence}>{lookup?.sentence}</Text>
          {saved ? (
            <Pressable
              style={styles.primary}
              onPress={() => {
                closeLookup();
                openCloze([saved.id], "practice");
              }}
            >
              <Text style={styles.primaryText}>去填空</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.primary}
              onPress={() => {
                if (!lookup) return;
                void addToWordbook({
                  phrase: lookup.phrase,
                  sentence: lookup.sentence,
                  conversionId: lookup.conversionId,
                  ipa,
                  senses
                }).then(closeLookup);
              }}
            >
              <Text style={styles.primaryText}>加入词本</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: { flex: 1, backgroundColor: "rgba(28,25,22,0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: "46%",
    gap: 8
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: 8
  },
  word: { fontSize: 28, fontWeight: "800", color: colors.ink },
  ipa: { color: colors.accent, fontSize: 16 },
  sense: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  sentence: { color: colors.muted, fontSize: 14, marginTop: 6 },
  warn: { color: colors.warn, fontSize: 13 },
  primary: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 }
});
