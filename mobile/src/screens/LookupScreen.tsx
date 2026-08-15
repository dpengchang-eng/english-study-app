import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useWordbook } from "../context/WordbookState";
import type { RootStackParamList } from "../navigation/types";
import { lookupWord } from "../services/lookup";
import { EMPTY_SELECTION, phraseFromTokens } from "../services/wordbook";
import { SPEAK_FAIL_TEXT, speakAmerican, stopSpeaking } from "../services/tts";
import { colors, space } from "../theme";

export function LookupScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Lookup">>();
  const { tokens, sentenceTokens, sentenceText, conversionId } = route.params;
  const { items, savePhrase } = useWordbook();
  const { phrase, lemmaKey } = phraseFromTokens(tokens, sentenceText);
  const alreadySaved = items.some((item) => item.id === lemmaKey);
  const [ipa, setIpa] = useState("");
  const [senses, setSenses] = useState<string[]>([]);
  const [simpleEn, setSimpleEn] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(alreadySaved ? "已在词本" : null);
  const [speakError, setSpeakError] = useState<string | null>(null);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    let live = true;
    void lookupWord({ lemma: lemmaKey, surface: phrase, sentenceContext: sentenceText })
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
        setSenses([]);
        setSimpleEn("");
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [lemmaKey, phrase, sentenceText]);

  const save = async (): Promise<void> => {
    if (loading) return;
    try {
      const result = await savePhrase({
        tokens,
        sentenceTokens: sentenceTokens ?? tokens,
        sentenceText,
        conversionId,
        ipa,
        senses: senses.slice(0, 3),
        simpleEn
      });
      if (!result.created) {
        setSaved("已在词本");
        return;
      }
      setSaved(result.item.syncState === "synced" ? "已加入词本" : "未同步到云");
    } catch (error) {
      setSaved(error instanceof Error && error.message === EMPTY_SELECTION ? EMPTY_SELECTION : "没存上，再试一次");
    }
  };

  return (
    <View style={styles.page}>
      <Text style={styles.phrase}>{phrase || lemmaKey}</Text>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {!loading && ipa ? <Text style={styles.ipa}>{ipa}</Text> : null}
      {!loading && simpleEn ? <Text style={styles.simpleEn}>{simpleEn}</Text> : null}
      {!loading
        ? senses.slice(0, 3).map((sense) => (
            <Text key={sense} style={styles.sense}>
              {sense}
            </Text>
          ))
        : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: 10, backgroundColor: colors.card, flex: 1 },
  phrase: { fontSize: 26, fontWeight: "800", color: colors.ink },
  ipa: { color: colors.muted, fontSize: 16 },
  simpleEn: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  sense: { color: colors.ink, fontSize: 16, lineHeight: 24 },
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
