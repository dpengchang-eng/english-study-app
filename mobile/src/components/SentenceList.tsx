import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ensureTappableTokens } from "../services/align";
import { isSpeakable, type ArticlePlayMode } from "../services/articleSpeech";
import type { Sentence, Token } from "../types";
import { colors, space } from "../theme";

export function SentenceList({
  sentences,
  loading,
  selectedIds,
  playingId,
  listenMode,
  onPlay,
  onLoop,
  onTapToken,
  onLongPressToken,
  onSentenceLayout
}: {
  sentences: Sentence[];
  loading?: boolean;
  selectedIds?: string[];
  playingId?: string | null;
  listenMode?: ArticlePlayMode | "idle";
  onPlay?: (sentence: Sentence) => void;
  onLoop?: (sentence: Sentence) => void;
  onTapToken?: (sentence: Sentence, token: Token) => void;
  onLongPressToken?: (sentence: Sentence, token: Token) => void;
  onSentenceLayout?: (id: string, y: number, height: number) => void;
}) {
  const listYRef = useRef(0);
  const locals = useRef<Record<string, { y: number; h: number }>>({});

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

  const report = (id: string) => {
    const local = locals.current[id];
    if (!local || !onSentenceLayout) return;
    onSentenceLayout(id, listYRef.current + local.y, local.h);
  };

  return (
    <View
      style={styles.list}
      onLayout={(event) => {
        listYRef.current = event.nativeEvent.layout.y;
        for (const id of Object.keys(locals.current)) report(id);
      }}
    >
      {sentences.map((sentence) => {
        const tokens = ensureTappableTokens(sentence);
        const hasWords = tokens.some((token) => token.isWord);
        const tappable = { ...sentence, tokens };
        const canListen = isSpeakable(sentence.text);
        return (
          <View
            key={sentence.id}
            style={[styles.card, sentence.id === playingId && styles.cardOn]}
            onLayout={(event) => {
              locals.current[sentence.id] = {
                y: event.nativeEvent.layout.y,
                h: event.nativeEvent.layout.height
              };
              report(sentence.id);
            }}
          >
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
              {canListen && (onPlay || onLoop) ? (
                <View style={styles.plays}>
                  {onPlay ? (
                    <Pressable
                      style={[styles.play, listenMode === "once" && sentence.id === playingId && styles.playOn]}
                      onPress={() => onPlay(sentence)}
                    >
                      <Text
                        style={[
                          styles.playText,
                          listenMode === "once" && sentence.id === playingId && styles.playOnText
                        ]}
                      >
                        {listenMode === "once" && sentence.id === playingId ? "停止" : "听"}
                      </Text>
                    </Pressable>
                  ) : null}
                  {onLoop ? (
                    <Pressable
                      style={[styles.play, listenMode === "loopOne" && sentence.id === playingId && styles.playOn]}
                      onPress={() => onLoop(sentence)}
                    >
                      <Text
                        style={[
                          styles.playText,
                          listenMode === "loopOne" && sentence.id === playingId && styles.playOnText
                        ]}
                      >
                        {listenMode === "loopOne" && sentence.id === playingId ? "停止" : "循环"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
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
    backgroundColor: colors.accentSoft
  },
  row: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  words: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  word: { paddingHorizontal: 2, paddingVertical: 2, borderRadius: 6 },
  wordOn: { backgroundColor: colors.chipOn },
  wordText: { color: colors.ink, fontSize: 18, lineHeight: 28 },
  punct: { color: colors.ink, fontSize: 18, lineHeight: 28 },
  plain: { color: colors.ink, fontSize: 18, lineHeight: 28 },
  plays: { gap: 6, alignItems: "flex-end" },
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
