import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useWordbook } from "../context/WordbookState";
import type { RootStackParamList } from "../navigation/types";
import { lookupPhrase } from "../services/lookup";
import { phraseFromTokens } from "../services/wordbook";
import { speakAmerican } from "../services/tts";
import { colors, space } from "../theme";

export function LookupScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Lookup">>();
  const { tokens, sentenceText, conversionId } = route.params;
  const { savePhrase } = useWordbook();
  const { phrase, lemmaKey } = phraseFromTokens(tokens);
  const [ipa, setIpa] = useState("");
  const [senses, setSenses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void lookupPhrase(phrase, lemmaKey).then((result) => {
      if (!live) return;
      setIpa(result.ipa);
      setSenses(result.senses);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [lemmaKey, phrase]);

  const save = async (): Promise<void> => {
    const result = await savePhrase({
      tokens,
      sentenceText,
      conversionId,
      ipa,
      senses
    });
    setSaved(result.created ? "已加入词本" : "词本里已有，复习进度没变");
  };

  return (
    <View style={styles.page}>
      <Text style={styles.phrase}>{phrase || lemmaKey}</Text>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {!loading && ipa ? <Text style={styles.ipa}>{ipa}</Text> : null}
      {!loading
        ? senses.map((sense) => (
            <Text key={sense} style={styles.sense}>
              {sense}
            </Text>
          ))
        : null}
      <View style={styles.row}>
        <Pressable style={styles.ghost} onPress={() => void speakAmerican(phrase)}>
          <Text style={styles.ghostText}>听</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => void save()}>
          <Text style={styles.btnText}>存入词本</Text>
        </Pressable>
      </View>
      {saved ? <Text style={styles.note}>{saved}</Text> : null}
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
  close: { color: colors.muted, marginTop: 8 }
});
