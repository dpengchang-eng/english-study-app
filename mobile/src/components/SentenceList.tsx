import { Pressable, StyleSheet, Text, View } from "react-native";
import { ensureTappableTokens } from "../services/align";
import type { Sentence, Token } from "../types";
import { colors, space } from "../theme";

export function SentenceList({
  sentences,
  loading,
  selectedIds,
  playingId,
  onPlay,
  onTapToken,
  onLongPressToken
}: {
  sentences: Sentence[];
  loading?: boolean;
  selectedIds?: string[];
  playingId?: string | null;
  onPlay?: (sentence: Sentence) => void;
  onTapToken?: (sentence: Sentence, token: Token) => void;
  onLongPressToken?: (sentence: Sentence, token: Token) => void;
}) {
  if (loading) {
    return (
      <View style={styles.list}>
        <View style={[styles.bone, styles.boneWide]} />
        <View style={[styles.bone, styles.boneMid]} />
        <View style={[styles.bone, styles.boneShort]} />
      </View>
    );
  }

  const selected = new Set(selectedIds ?? []);

  return (
    <View style={styles.list}>
      {sentences.map((sentence) => {
        const tokens = ensureTappableTokens(sentence);
        const hasWords = tokens.some((token) => token.isWord);
        const tappable = { ...sentence, tokens };
        return (
          <View key={sentence.id} style={[styles.card, sentence.id === playingId && styles.cardOn]}>
            <View style={styles.row}>
              <View style={styles.words}>
                {hasWords
                  ? tokens.map((token) =>
                      token.isWord ? (
                        <Pressable
                          key={token.id}
                          onPress={() => onTapToken?.(tappable, token)}
                          onLongPress={() => onLongPressToken?.(tappable, token)}
                          style={[styles.word, selected.has(token.id) && styles.wordOn]}
                        >
                          <Text style={styles.wordText}>{token.surface}</Text>
                        </Pressable>
                      ) : (
                        <Text key={token.id} style={styles.punct}>
                          {token.surface}
                        </Text>
                      )
                    )
                  : (
                    <Text style={styles.plain}>{sentence.text}</Text>
                  )}
              </View>
              {onPlay ? (
                <Pressable
                  style={[styles.play, sentence.id === playingId && styles.playOn]}
                  onPress={() => onPlay(sentence)}
                >
                  <Text style={[styles.playText, sentence.id === playingId && styles.playOnText]}>听</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12
  },
  cardOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft
  },
  row: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  words: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  word: { paddingHorizontal: 2, paddingVertical: 2, borderRadius: 6 },
  wordOn: { backgroundColor: colors.chipOn },
  wordText: { color: colors.ink, fontSize: 18, lineHeight: 28 },
  punct: { color: colors.ink, fontSize: 18, lineHeight: 28 },
  plain: { color: colors.ink, fontSize: 18, lineHeight: 28 },
  play: {
    backgroundColor: colors.accentSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  playOn: { backgroundColor: colors.accent },
  playText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  playOnText: { color: "#fff" },
  bone: { height: 16, borderRadius: 8, backgroundColor: colors.line },
  boneWide: { width: "100%" },
  boneMid: { width: "82%" },
  boneShort: { width: "64%" }
});
