import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppState } from "../context/AppState";
import type { ConvertStackParamList } from "../navigation/types";
import { cacheKey, isPlaying, playPrepared, stopSpeaking } from "../services/tts";
import { colors, space } from "../theme";
import type { PlayUiState, Token } from "../types";

type Selected = { sentenceIndex: number; tokenIndex: number };

export function ResultScreen() {
  const route = useRoute<RouteProp<ConvertStackParamList, "Result">>();
  const navigation = useNavigation();
  const { conversionId } = route.params;
  const { getConversion, retryConversion, openLookup, addToWordbook, settings } = useAppState();
  const conversion = getConversion(conversionId);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Selected[]>([]);
  const [playing, setPlaying] = useState<number | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: "结果" });
  }, [navigation]);

  if (!conversion) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>找不到这条转换。</Text>
      </View>
    );
  }

  if (conversion.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.muted}>正在转换成地道美语…</Text>
        <Text style={styles.source}>{conversion.sourceText}</Text>
      </View>
    );
  }

  if (conversion.status === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.warn}>{conversion.errorMessage ?? "转换失败。"}</Text>
        <Pressable style={styles.primary} onPress={() => retryConversion(conversion.id)}>
          <Text style={styles.primaryText}>重试</Text>
        </Pressable>
      </View>
    );
  }

  const selectedPhrase = (): { sentence: string; phrase: string } | null => {
    if (selected.length === 0) return null;
    const sentenceIndex = selected[0].sentenceIndex;
    if (selected.some((item) => item.sentenceIndex !== sentenceIndex)) return null;
    const sentence = conversion.sentences[sentenceIndex];
    const tokens = [...selected]
      .sort((a, b) => a.tokenIndex - b.tokenIndex)
      .map((item) => sentence.tokens[item.tokenIndex]?.text)
      .filter(Boolean);
    return { sentence: sentence.text, phrase: tokens.join(" ") };
  };

  const toggle = (sentenceIndex: number, tokenIndex: number): void => {
    setSelected((prev) => {
      const exists = prev.some((item) => item.sentenceIndex === sentenceIndex && item.tokenIndex === tokenIndex);
      if (exists) {
        return prev.filter((item) => !(item.sentenceIndex === sentenceIndex && item.tokenIndex === tokenIndex));
      }
      return [...prev, { sentenceIndex, tokenIndex }];
    });
  };

  const playState = (index: number, audioStatus: PlayUiState): PlayUiState => {
    if (playing === index) return "playing";
    return audioStatus;
  };

  const onPlay = async (index: number): Promise<void> => {
    const sentence = conversion.sentences[index];
    const key = cacheKey(conversion.id, index);
    if (playing === index) {
      await stopSpeaking();
      setPlaying(null);
      return;
    }
    if (sentence.audioStatus === "pending") return;
    if (sentence.audioStatus === "unavailable") return;
    const result = await playPrepared(key, sentence.text, settings);
    if (result === "playing") {
      setPlaying(index);
      const tick = setInterval(() => {
        if (!isPlaying(key)) {
          setPlaying(null);
          clearInterval(tick);
        }
      }, 400);
    }
  };

  const phrase = selectedPhrase();

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.source}>{conversion.sourceText}</Text>
        <Text style={styles.rewritten}>{conversion.rewrittenText}</Text>
        <Text style={styles.hint}>点词查词。长按开始选短语，再勾选要加入词本的词。</Text>

        {conversion.sentences.map((sentence, sentenceIndex) => (
          <View key={`${conversion.id}-${sentenceIndex}`} style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.sentence}>{sentence.text}</Text>
              <PlayButton
                state={playState(sentenceIndex, sentence.audioStatus)}
                onPress={() => void onPlay(sentenceIndex)}
              />
            </View>
            <View style={styles.tokens}>
              {sentence.tokens.map((token, tokenIndex) => (
                <TokenChip
                  key={`${sentenceIndex}-${tokenIndex}-${token.start}`}
                  token={token}
                  checked={selected.some((item) => item.sentenceIndex === sentenceIndex && item.tokenIndex === tokenIndex)}
                  selectMode={selectMode}
                  onPress={() => {
                    if (!token.selectable) return;
                    if (selectMode) toggle(sentenceIndex, tokenIndex);
                    else openLookup({ phrase: token.text, sentence: sentence.text, conversionId: conversion.id });
                  }}
                  onLongPress={() => {
                    if (!token.selectable) return;
                    setSelectMode(true);
                    setSelected([{ sentenceIndex, tokenIndex }]);
                  }}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {selectMode && (
        <View style={styles.bar}>
          <Pressable
            onPress={() => {
              setSelectMode(false);
              setSelected([]);
            }}
          >
            <Text style={styles.barGhost}>取消</Text>
          </Pressable>
          <Pressable
            style={[styles.barBtn, !phrase && styles.barOff]}
            disabled={!phrase}
            onPress={() => {
              if (!phrase) return;
              void addToWordbook({
                phrase: phrase.phrase,
                sentence: phrase.sentence,
                conversionId: conversion.id
              });
              setSelectMode(false);
              setSelected([]);
            }}
          >
            <Text style={styles.barBtnText}>加入词本{phrase ? ` · ${phrase.phrase}` : ""}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function PlayButton({ state, onPress }: { state: PlayUiState; onPress: () => void }) {
  const label =
    state === "pending" ? "准备中" : state === "playing" ? "停止" : state === "unavailable" ? "无音频" : "播放";
  const disabled = state === "pending" || state === "unavailable";
  return (
    <Pressable style={[styles.play, disabled && styles.playOff, state === "playing" && styles.playOn]} onPress={onPress} disabled={disabled}>
      <Text style={styles.playText}>{label}</Text>
    </Pressable>
  );
}

function TokenChip({
  token,
  checked,
  selectMode,
  onPress,
  onLongPress
}: {
  token: Token;
  checked: boolean;
  selectMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  if (!token.selectable) {
    return <Text style={styles.punct}>{token.text}</Text>;
  }
  return (
    <Pressable
      style={[styles.token, checked && styles.tokenOn]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
    >
      {selectMode && <Text style={styles.check}>{checked ? "✓" : "○"}</Text>}
      <Text style={styles.tokenText}>{token.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  page: { padding: space.md, paddingBottom: 90, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: colors.bg },
  source: { color: colors.muted, fontSize: 14 },
  rewritten: { color: colors.ink, fontSize: 20, lineHeight: 30, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 13 },
  muted: { color: colors.muted, textAlign: "center" },
  warn: { color: colors.warn, textAlign: "center" },
  primary: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  primaryText: { color: "#fff", fontWeight: "700" },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10
  },
  head: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  sentence: { flex: 1, color: colors.ink, fontSize: 16, lineHeight: 24 },
  play: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  playOn: { backgroundColor: colors.chipOn },
  playOff: { opacity: 0.5 },
  playText: { color: colors.ink, fontWeight: "700", fontSize: 12 },
  tokens: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  token: {
    backgroundColor: colors.chip,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    gap: 4,
    alignItems: "center"
  },
  tokenOn: { backgroundColor: colors.chipOn },
  tokenText: { color: colors.ink, fontSize: 15 },
  check: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  punct: { color: colors.muted, fontSize: 16 },
  bar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  barGhost: { color: colors.muted, fontWeight: "600", padding: 8 },
  barBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flex: 1 },
  barOff: { opacity: 0.4 },
  barBtnText: { color: "#fff", fontWeight: "700", textAlign: "center" }
});
