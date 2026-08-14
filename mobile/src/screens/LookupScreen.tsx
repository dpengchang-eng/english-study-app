import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useWordbook } from "../context/WordbookState";
import type { RootStackParamList } from "../navigation/types";
import { lookupPhrase } from "../services/lookup";
import { phraseFromTokens } from "../services/wordbook";
import { speakAmerican, stopSpeaking } from "../services/tts";
import { colors, space } from "../theme";

export function LookupScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Lookup">>();
  const { tokens, sentenceTokens, sentenceText, conversionId } = route.params;
  const { items, savePhrase } = useWordbook();
  const { phrase, lemmaKey } = phraseFromTokens(tokens);
  const alreadySaved = items.some((item) => item.id === lemmaKey);
  const [ipa, setIpa] = useState("");
  const [senses, setSenses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(alreadySaved ? "已在词本" : null);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    let live = true;
    void lookupPhrase(phrase, lemmaKey).then((result) => {
      if (!live) return;
      setIpa(result.ipa);
      setSenses(result.senses.slice(0, 3));
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [lemmaKey, phrase]);

  const save = async (): Promise<void> => {
    try {
      const result = await savePhrase({
        tokens,
        sentenceTokens: sentenceTokens ?? tokens,
        sentenceText,
        conversionId,
        ipa,
        senses: senses.slice(0, 3)
      });
      if (!result.created) {
        setSaved("已在词本");
        return;
      }
      setSaved(result.item.syncState === "synced" ? "已加入词本" : "未同步到云");
    } catch {
      setSaved("只能存 1 到 6 个连续单词");
    }
  };

  return (
    <View style={styles.page}>
      <Text style={styles.phrase}>{phrase || lemmaKey}</Text>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {!loading && ipa ? <Text style={styles.ipa}>{ipa}</Text> : null}
      {!loading
        ? senses.slice(0, 3).map((sense) => (
            <Text key={sense} style={styles.sense}>
              {sense}
            </Text>
          ))
        : null}
      <View style={styles.row}>
        <Pressable style={styles.ghost} onPress={() => speakAmerican(phrase)}>
          <Text style={styles.ghostText}>听</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => void save()}>
          <Text style={styles.btnText}>存入词本</Text>
        </Pressable>
      </View>
      {saved ? <Text style={saved === "未同步到云" ? styles.warnNote : styles.note}>{saved}</Text> : null}
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
  sense: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  btnText: { color: "#fff", fontWeight: "700" },
  ghost: { backgroundColor: colors.accentSoft, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  ghostText: { color: colors.ink, fontWeight: "700" },
  note: { color: colors.good, fontSize: 14 },
  warnNote: { color: colors.warn, fontSize: 14 },
  close: { color: colors.muted, marginTop: 8 }
});
