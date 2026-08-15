import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppState } from "../context/AppState";
import { useWordbook } from "../context/WordbookState";
import type { RootStackParamList } from "../navigation/types";
import { ensureTappableTokens } from "../services/align";
import { lookupWord } from "../services/lookup";
import {
  firstWordSpan,
  isWholeSentence,
  spanFromSelected,
  tapLookupWord,
  tokensForSpan,
  wholeSentenceSpan,
  wordTokens,
  type WordSpan
} from "../services/lookupSelection";
import { peekSpeechSpeed } from "../services/speechSpeed";
import { phraseFromTokens } from "../services/wordbook";
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
  const { items, savePhrase } = useWordbook();
  const sentence = sentences[sentenceIndex] ?? sentences[0];
  const tokens = sentence?.tokens ?? [];
  const words = wordTokens(tokens);
  const selected = tokensForSpan(tokens, span);
  const wholeOn = isWholeSentence(span, words.length);
  const phrase = wholeOn ? (sentence?.text ?? route.params.sentenceText) : phraseFromTokens(selected).phrase;
  const lemma = selected[0]?.lemma || phraseFromTokens(selected).lemmaKey;
  const lemmaKey = phraseFromTokens(selected).lemmaKey;
  const alreadySaved = items.some((item) => item.id === lemmaKey);
  const [ipa, setIpa] = useState("");
  const [pos, setPos] = useState("");
  const [senses, setSenses] = useState<string[]>([]);
  const [simpleEn, setSimpleEn] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(alreadySaved ? "已在词本" : null);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const canPrev = sentenceIndex > 0;
  const canNext = sentenceIndex < sentences.length - 1;
  const sentenceContext = sentence?.text ?? route.params.sentenceText;

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    stopSpeaking();
    setListening(false);
  }, [lemmaKey, sentenceIndex]);

  useEffect(() => {
    setSaved(alreadySaved ? "已在词本" : null);
  }, [alreadySaved, lemmaKey]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setIpa("");
    setPos("");
    setSenses([]);
    setSimpleEn("");
    void lookupWord({ lemma, surface: phrase, sentenceContext })
      .then((result) => {
        if (!live) return;
        setIpa(result.ipa);
        setPos(result.pos);
        setSenses(result.senses.slice(0, 3));
        setSimpleEn(result.simpleEn);
        setLoading(false);
      })
      .catch(() => {
        if (!live) return;
        setIpa("");
        setPos("");
        setSenses([]);
        setSimpleEn("");
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [lemma, phrase, sentenceContext]);

  const tapWord = (token: Token): void => {
    const index = words.findIndex((word) => word.id === token.id);
    if (index < 0) return;
    setSpan(tapLookupWord(span, index));
  };

  const selectWhole = (): void => {
    setSpan(wholeSentenceSpan(words.length));
  };

  const moveSentence = (delta: number): void => {
    const nextIndex = sentenceIndex + delta;
    if (nextIndex < 0 || nextIndex >= sentences.length) return;
    setSentenceIndex(nextIndex);
    setSpan(firstWordSpan());
  };

  const toggleListen = (): void => {
    if (listening) {
      stopSpeaking();
      setListening(false);
      return;
    }
    setSpeakError(null);
    setListening(true);
    speakAmerican(phrase, {
      onError: () => {
        setListening(false);
        setSpeakError(SPEAK_FAIL_TEXT);
      },
      onDone: () => setListening(false),
      onStopped: () => setListening(false)
    }, peekSpeechSpeed());
  };

  const save = async (): Promise<void> => {
    try {
      const result = await savePhrase({
        tokens: selected,
        sentenceTokens: tokens,
        sentenceText: sentenceContext,
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
      setSaved("没有可保存的词");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.sentence}>
        {tokens.map((token) =>
          token.isWord ? (
            <Pressable
              key={token.id}
              onPress={() => tapWord(token)}
              style={[styles.word, (wholeOn || selected.some((item) => item.id === token.id)) && styles.wordOn]}
            >
              <Text style={styles.wordText}>{token.surface}</Text>
            </Pressable>
          ) : (
            <Text key={token.id} style={[styles.punct, wholeOn && styles.wordOn]}>
              {token.surface}
            </Text>
          )
        )}
      </View>
      <View style={styles.nav}>
        <Pressable onPress={() => moveSentence(-1)} disabled={!canPrev} hitSlop={8}>
          <Text style={!canPrev ? styles.navOff : styles.navText}>上一句</Text>
        </Pressable>
        <Text style={styles.navPipe}>|</Text>
        <Pressable onPress={selectWhole} hitSlop={8}>
          <Text style={wholeOn ? styles.navOn : styles.navText}>整句</Text>
        </Pressable>
        <Text style={styles.navPipe}>|</Text>
        <Pressable onPress={() => moveSentence(1)} disabled={!canNext} hitSlop={8}>
          <Text style={!canNext ? styles.navOff : styles.navText}>下一句</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {!loading && pos ? <Text style={styles.pos}>{pos}</Text> : null}
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
        <Pressable style={styles.ghost} onPress={toggleListen}>
          <Text style={styles.ghostText}>听</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => void save()}>
          <Text style={styles.btnText}>加入词本</Text>
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
  sentence: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  word: { paddingHorizontal: 2, paddingVertical: 2, borderRadius: 6 },
  wordOn: { backgroundColor: colors.chipOn },
  wordText: { color: colors.ink, fontSize: 18, lineHeight: 28 },
  punct: { color: colors.ink, fontSize: 18, lineHeight: 28 },
  nav: { flexDirection: "row", alignItems: "center", gap: 10 },
  navText: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  navOn: { color: colors.accent, fontWeight: "700", fontSize: 16 },
  navOff: { color: colors.muted, fontWeight: "700", fontSize: 16 },
  navPipe: { color: colors.muted, fontSize: 16 },
  pos: { color: colors.muted, fontSize: 14, textTransform: "lowercase" },
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
  close: { color: colors.muted, marginTop: 8 }
});
