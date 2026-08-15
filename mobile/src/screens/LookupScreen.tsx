import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppState } from "../context/AppState";
import { useWordbook } from "../context/WordbookState";
import type { RootStackParamList } from "../navigation/types";
import { ensureTappableTokens } from "../services/align";
import { lookupPhrase } from "../services/lookup";
import {
  isWholeSentence,
  sentenceChangeSpan,
  spanFromSelected,
  tapLookupWord,
  tokensForSpan,
  wholeSentenceSpan,
  wordTokens,
  type WordSpan
} from "../services/lookupSelection";
import { phraseFromTokens, SAVE_SPAN_ERROR } from "../services/wordbook";
import { SPEAK_FAIL_TEXT, speakAmerican, stopSpeaking } from "../services/tts";
import { colors, space } from "../theme";
import type { Sentence, Token } from "../types";

function sentenceFromParams(params: RootStackParamList["Lookup"]): Sentence {
  return {
    id: params.sentenceId ?? "s0",
    text: params.sentenceText,
    tokens: params.sentenceTokens ?? params.tokens
  };
}

export function LookupScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Lookup">>();
  const { getConversion } = useAppState();
  const conversion = getConversion(route.params.conversionId);
  const sentences = useMemo<Sentence[]>(() => {
    const fromConversion = (conversion?.sentences ?? []).map((sentence) => ({
      ...sentence,
      tokens: ensureTappableTokens(sentence)
    }));
    if (fromConversion.some((sentence) => wordTokens(sentence.tokens ?? []).length > 0)) return fromConversion;
    const fallback = sentenceFromParams(route.params);
    return [{ ...fallback, tokens: ensureTappableTokens(fallback) }];
  }, [conversion?.sentences, route.params]);

  const [sentenceIndex, setSentenceIndex] = useState(() => {
    const id = route.params.sentenceId;
    const byId = id ? sentences.findIndex((sentence) => sentence.id === id) : -1;
    if (byId >= 0) return byId;
    const byText = sentences.findIndex((sentence) => sentence.text === route.params.sentenceText);
    return byText >= 0 ? byText : 0;
  });
  const [span, setSpan] = useState<WordSpan>(() =>
    spanFromSelected(route.params.sentenceTokens ?? route.params.tokens, route.params.tokens)
  );
  const [preferWhole, setPreferWhole] = useState(false);
  const { items, savePhrase } = useWordbook();
  const sentence = sentences[sentenceIndex] ?? sentences[0];
  const tokens = sentence?.tokens ?? [];
  const words = wordTokens(tokens);
  const selected = tokensForSpan(tokens, span);
  const { phrase, lemmaKey } = phraseFromTokens(selected);
  const alreadySaved = items.some((item) => item.id === lemmaKey);
  const [ipa, setIpa] = useState("");
  const [senses, setSenses] = useState<string[]>([]);
  const [simpleEn, setSimpleEn] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(alreadySaved ? "已在词本" : null);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const canPrev = sentenceIndex > 0;
  const canNext = sentenceIndex < sentences.length - 1;
  const wholeOn = isWholeSentence(span, words.length);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    setSaved(alreadySaved ? "已在词本" : null);
  }, [alreadySaved, lemmaKey]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setIpa("");
    setSenses([]);
    setSimpleEn("");
    void lookupPhrase(phrase, lemmaKey)
      .then((result) => {
        if (!live) return;
        setIpa(result.ipa);
        setSenses(result.senses.slice(0, 3));
        setSimpleEn(result.simpleEn);
        setLoading(false);
      })
      .catch(() => {
        if (!live) return;
        setIpa("");
        setSenses(["查词失败，请再试一次"]);
        setSimpleEn("");
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [lemmaKey, phrase]);

  const tapWord = (token: Token): void => {
    const index = words.findIndex((word) => word.id === token.id);
    if (index < 0) return;
    setPreferWhole(false);
    setSpan(tapLookupWord(span, index));
  };

  const selectWhole = (): void => {
    setPreferWhole(true);
    setSpan(wholeSentenceSpan(words.length));
  };

  const moveSentence = (delta: number): void => {
    const nextIndex = sentenceIndex + delta;
    if (nextIndex < 0 || nextIndex >= sentences.length) return;
    const nextWords = wordTokens(sentences[nextIndex]?.tokens ?? []);
    setSentenceIndex(nextIndex);
    setSpan(sentenceChangeSpan(nextWords.length, preferWhole));
  };

  const save = async (): Promise<void> => {
    if (loading) return;
    try {
      const result = await savePhrase({
        tokens: selected.length ? selected : words.slice(0, 1),
        sentenceTokens: tokens,
        sentenceText: sentence?.text ?? route.params.sentenceText,
        conversionId: route.params.conversionId,
        ipa,
        senses: senses.slice(0, 3)
      });
      if (!result.created) {
        setSaved("已在词本");
        return;
      }
      setSaved(result.item.syncState === "synced" ? "已加入词本" : "未同步到云");
    } catch {
      setSaved(SAVE_SPAN_ERROR);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.phrase}>{phrase || lemmaKey}</Text>
      <View style={styles.sentence}>
        {tokens.map((token) =>
          token.isWord ? (
            <Pressable
              key={token.id}
              onPress={() => tapWord(token)}
              style={[styles.word, selected.some((item) => item.id === token.id) && styles.wordOn]}
            >
              <Text style={styles.wordText}>{token.surface}</Text>
            </Pressable>
          ) : (
            <Text key={token.id} style={styles.punct}>
              {token.surface}
            </Text>
          )
        )}
      </View>
      <View style={styles.nav}>
        <Pressable style={[styles.chip, wholeOn && styles.chipOn]} onPress={selectWhole}>
          <Text style={styles.chipText}>整句</Text>
        </Pressable>
        <Pressable style={[styles.chip, !canPrev && styles.off]} onPress={() => moveSentence(-1)} disabled={!canPrev}>
          <Text style={styles.chipText}>上一句</Text>
        </Pressable>
        <Pressable style={[styles.chip, !canNext && styles.off]} onPress={() => moveSentence(1)} disabled={!canNext}>
          <Text style={styles.chipText}>下一句</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {!loading && ipa ? <Text style={styles.ipa}>{ipa}</Text> : null}
      {!loading
        ? senses.slice(0, 3).map((sense) => (
            <Text key={sense} style={styles.sense}>
              {sense}
            </Text>
          ))
        : null}
      {!loading && simpleEn ? <Text style={styles.simpleEn}>{simpleEn}</Text> : null}
      <View style={styles.row}>
        <Pressable
          style={styles.ghost}
          onPress={() => {
            setSpeakError(null);
            speakAmerican(phrase, () => setSpeakError(SPEAK_FAIL_TEXT));
          }}
        >
          <Text style={styles.ghostText}>听</Text>
        </Pressable>
        <Pressable style={[styles.btn, loading && styles.off]} onPress={() => void save()} disabled={loading}>
          <Text style={styles.btnText}>存入词本</Text>
        </Pressable>
      </View>
      {speakError ? <Text style={styles.warn}>{speakError}</Text> : null}
      {saved ? <Text style={saved === "未同步到云" ? styles.warn : styles.note}>{saved}</Text> : null}
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.close}>关闭</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: 10, backgroundColor: colors.card, flexGrow: 1 },
  phrase: { fontSize: 26, fontWeight: "800", color: colors.ink },
  sentence: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  word: { paddingHorizontal: 2, paddingVertical: 2, borderRadius: 6 },
  wordOn: { backgroundColor: colors.chipOn },
  wordText: { color: colors.ink, fontSize: 18, lineHeight: 28 },
  punct: { color: colors.ink, fontSize: 18, lineHeight: 28 },
  nav: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.accentSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.chipOn },
  chipText: { color: colors.ink, fontWeight: "700" },
  ipa: { color: colors.muted, fontSize: 16 },
  sense: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  simpleEn: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  btnText: { color: "#fff", fontWeight: "700" },
  ghost: { backgroundColor: colors.accentSoft, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  ghostText: { color: colors.ink, fontWeight: "700" },
  note: { color: colors.good, fontSize: 14 },
  warn: { color: colors.warn, fontSize: 14 },
  off: { opacity: 0.45 },
  close: { color: colors.muted, marginTop: 8 }
});
