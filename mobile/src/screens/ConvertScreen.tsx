import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SAMPLE_CONVERSION, SAMPLE_INPUT } from "../sample";
import { convertToAmericanEnglish, defineWord } from "../services/convert";
import { saveConversion, saveItem } from "../services/firestore";
import { startListening, stopListening, useSpeechEvents, type SpeechLang } from "../services/stt";
import { speakAmericanEnglish } from "../services/tts";
import { colors, space } from "../theme";
import type { ConversionResult, WordToken } from "../types";

type Props = {
  uid: string;
};

type WordKey = `${number}:${number}`;

export function ConvertScreen({ uid }: Props) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [conversionId, setConversionId] = useState<string>("local");
  const [selected, setSelected] = useState<Set<WordKey>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [activeWord, setActiveWord] = useState<{
    sentence: string;
    token: WordToken;
  } | null>(null);
  const [defining, setDefining] = useState(false);

  useSpeechEvents({
    onResult: (text) => setDraft(text),
    onError: (message) => {
      setListening(false);
      setError(message);
    },
    onEnd: () => setListening(false)
  });

  const selectedPhrase = useMemo(() => {
    if (!result || selected.size === 0) return null;
    const keys = [...selected];
    const sentenceIndex = Number(keys[0].split(":")[0]);
    if (keys.some((key) => Number(key.split(":")[0]) !== sentenceIndex)) {
      return null;
    }
    const sentence = result.sentences[sentenceIndex];
    const words = keys
      .map((key) => Number(key.split(":")[1]))
      .sort((a, b) => a - b)
      .map((wordIndex) => sentence.words[wordIndex]);
    return {
      sentence: sentence.text,
      phrase: words.map((word) => word.word).join(" "),
      definition: words
        .map((word) => word.zh || word.definition)
        .filter(Boolean)
        .join("；")
    };
  }, [result, selected]);

  const persistResult = async (next: ConversionResult): Promise<void> => {
    setResult(next);
    setSelected(new Set());
    setSelectMode(false);
    try {
      const id = await saveConversion(uid, next);
      setConversionId(id);
    } catch {
      setConversionId("local");
      setError("改写成功，但保存到云端失败。你仍可以先练习。");
    }
  };

  const runConvert = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = await convertToAmericanEnglish(draft);
      await persistResult(next);
      setNotice("已改成地道美语。点单词看释义，点喇叭听发音。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "改写失败。");
    } finally {
      setBusy(false);
    }
  };

  const loadSample = async (): Promise<void> => {
    setDraft(SAMPLE_INPUT);
    setError(null);
    setNotice("这是示例结果，方便你先走完保存和填空。");
    await persistResult(SAMPLE_CONVERSION);
  };

  const listen = async (lang: SpeechLang): Promise<void> => {
    setError(null);
    try {
      if (listening) {
        stopListening();
        setListening(false);
        return;
      }
      await startListening(lang);
      setListening(true);
    } catch (err) {
      setListening(false);
      setError(err instanceof Error ? err.message : "请改用打字。");
    }
  };

  const openWord = async (sentence: string, token: WordToken): Promise<void> => {
    if (selectMode) return;
    setActiveWord({ sentence, token });
    if (token.definition) return;
    setDefining(true);
    try {
      const extra = await defineWord(token.word, sentence);
      setActiveWord({
        sentence,
        token: { ...token, definition: extra.definition, zh: extra.zh }
      });
    } finally {
      setDefining(false);
    }
  };

  const toggleWord = (sentenceIndex: number, wordIndex: number): void => {
    const key: WordKey = `${sentenceIndex}:${wordIndex}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const persistItem = async (phrase: string, definition: string, sentenceContext: string): Promise<void> => {
    try {
      await saveItem(uid, {
        phrase,
        definition,
        sentenceContext,
        conversionId
      });
      setNotice(`已保存 “${phrase}”，可去练习或复习。`);
      setActiveWord(null);
      setSelected(new Set());
    } catch {
      setError("保存失败。请检查网络后再试。");
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>把中文或英文，改成真正美国人会说的话</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="说或输入一句中文 / 英文"
          placeholderTextColor={colors.muted}
          multiline
          style={styles.box}
        />
        <View style={styles.row}>
          <Pressable style={[styles.btn, listening && styles.btnOn]} onPress={() => void listen("zh-CN")}>
            <Text style={styles.btnText}>{listening ? "停止" : "说中文"}</Text>
          </Pressable>
          <Pressable style={[styles.btn, listening && styles.btnOn]} onPress={() => void listen("en-US")}>
            <Text style={styles.btnText}>说英文</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnAccent]} onPress={() => void runConvert()} disabled={busy}>
            <Text style={styles.btnAccentText}>{busy ? "改写中…" : "改写"}</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => void loadSample()}>
          <Text style={styles.sample}>没有模型密钥？先加载示例</Text>
        </Pressable>
        {listening && <Text style={styles.hint}>正在听… 说完会自动填入，也可点「停止」。听不清就打字。</Text>}
        {busy && <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />}
        {error && <Text style={styles.error}>{error}</Text>}
        {notice && <Text style={styles.notice}>{notice}</Text>}

        {result && (
          <View style={styles.result}>
            <Text style={styles.section}>地道美语</Text>
            <Text style={styles.rewritten}>{result.rewrittenText}</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.btn, selectMode && styles.btnOn]}
                onPress={() => {
                  setSelectMode((prev) => !prev);
                  setSelected(new Set());
                }}
              >
                <Text style={styles.btnText}>{selectMode ? "完成选择" : "选短语"}</Text>
              </Pressable>
              {selectedPhrase && (
                <Pressable
                  style={[styles.btn, styles.btnAccent]}
                  onPress={() =>
                    void persistItem(selectedPhrase.phrase, selectedPhrase.definition, selectedPhrase.sentence)
                  }
                >
                  <Text style={styles.btnAccentText}>保存短语</Text>
                </Pressable>
              )}
            </View>
            {selectMode && <Text style={styles.hint}>点几个连续单词，再按「保存短语」。</Text>}

            {result.sentences.map((sentence, sentenceIndex) => (
              <View key={`${sentence.text}-${sentenceIndex}`} style={styles.sentence}>
                <View style={styles.sentenceHead}>
                  <Text style={styles.sentenceText}>{sentence.text}</Text>
                  <Pressable onPress={() => void speakAmericanEnglish(sentence.text)} style={styles.play}>
                    <Text style={styles.playText}>播放</Text>
                  </Pressable>
                </View>
                <View style={styles.words}>
                  {sentence.words.map((token, wordIndex) => {
                    const key: WordKey = `${sentenceIndex}:${wordIndex}`;
                    const on = selected.has(key);
                    return (
                      <Pressable
                        key={key}
                        style={[styles.word, on && styles.wordOn]}
                        onPress={() => {
                          if (selectMode) toggleWord(sentenceIndex, wordIndex);
                          else void openWord(sentence.text, token);
                        }}
                      >
                        <Text style={styles.wordText}>{token.word}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={activeWord !== null} transparent animationType="fade" onRequestClose={() => setActiveWord(null)}>
        <Pressable style={styles.mask} onPress={() => setActiveWord(null)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetWord}>{activeWord?.token.word}</Text>
            {defining && <ActivityIndicator color={colors.accent} />}
            {!!activeWord?.token.zh && <Text style={styles.sheetZh}>{activeWord.token.zh}</Text>}
            <Text style={styles.sheetDef}>{activeWord?.token.definition || "正在查这条句子里的意思…"}</Text>
            <Text style={styles.sheetCtx}>{activeWord?.sentence}</Text>
            <Pressable
              style={[styles.btn, styles.btnAccent]}
              onPress={() => {
                if (!activeWord) return;
                void persistItem(
                  activeWord.token.word,
                  [activeWord.token.zh, activeWord.token.definition].filter(Boolean).join(" · "),
                  activeWord.sentence
                );
              }}
            >
              <Text style={styles.btnAccentText}>保存这个词</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: space.md, paddingBottom: 40, gap: 10 },
  kicker: { color: colors.muted, fontSize: 14 },
  box: {
    minHeight: 110,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    fontSize: 16,
    color: colors.ink,
    textAlignVertical: "top"
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: {
    backgroundColor: colors.chip,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  btnOn: { backgroundColor: colors.chipOn },
  btnText: { color: colors.ink, fontWeight: "600" },
  btnAccent: { backgroundColor: colors.accent },
  btnAccentText: { color: "#fff", fontWeight: "700" },
  sample: { color: colors.accent, fontSize: 14 },
  hint: { color: colors.muted, fontSize: 13 },
  error: { color: colors.warn, fontSize: 14 },
  notice: { color: colors.good, fontSize: 14 },
  result: { gap: 12, marginTop: 8 },
  section: { fontSize: 18, fontWeight: "700", color: colors.ink },
  rewritten: { fontSize: 20, lineHeight: 30, color: colors.ink },
  sentence: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    gap: 10
  },
  sentenceHead: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  sentenceText: { flex: 1, fontSize: 16, lineHeight: 24, color: colors.ink },
  play: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  playText: { color: colors.ink, fontWeight: "700" },
  words: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  word: { backgroundColor: colors.chip, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  wordOn: { backgroundColor: colors.chipOn },
  wordText: { color: colors.ink, fontSize: 15 },
  mask: { flex: 1, backgroundColor: "rgba(28,25,22,0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 8
  },
  sheetWord: { fontSize: 28, fontWeight: "700", color: colors.ink },
  sheetZh: { fontSize: 16, color: colors.accent },
  sheetDef: { fontSize: 16, lineHeight: 24, color: colors.ink },
  sheetCtx: { fontSize: 14, color: colors.muted, marginBottom: 8 }
});
