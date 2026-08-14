import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { ComposeCard } from "../components/ComposeCard";
import { EmptyHint } from "../components/EmptyHint";
import { HistoryRow } from "../components/HistoryRow";
import { OfflineBanner } from "../components/OfflineBanner";
import { useAppState } from "../context/AppState";
import type { ConvertStackParamList } from "../navigation/types";
import { startListening, stopListening, useSpeechEvents } from "../services/stt";
import { colors, space } from "../theme";
import { INPUT_CHAR_CAP, RECORD_MAX_MS, type SourceType } from "../types";

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ConvertStackParamList>>();
  const { online, recents, startConversion, loadSample } = useAppState();
  const [draft, setDraft] = useState("");
  const [holding, setHolding] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const sourceTypeRef = useRef<SourceType>("text");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useSpeechEvents({
    onResult: (text) => {
      sourceTypeRef.current = "voice";
      setDraft(text.slice(0, INPUT_CHAR_CAP));
    },
    onError: (message) => {
      setHolding(false);
      setSttError(message);
    },
    onEnd: () => {
      setHolding(false);
    }
  });

  const onHoldStart = (): void => {
    setSttError(null);
    setHolding(true);
    void startListening("zh-CN").catch((error: unknown) => {
      setHolding(false);
      setSttError(error instanceof Error ? error.message : "请改用打字。");
    });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      stopListening();
      setHolding(false);
    }, RECORD_MAX_MS);
  };

  const onHoldEnd = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHolding(false);
    stopListening();
  };

  const convert = (): void => {
    const text = draft.trim();
    if (!text || !online) return;
    const id = startConversion(text, { sourceType: sourceTypeRef.current });
    navigation.navigate("Result", { conversionId: id });
  };

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {!online ? <OfflineBanner /> : null}
      <Text style={styles.kicker}>输入中文或英文，转成地道美语。</Text>
      <ComposeCard
        value={draft}
        onChangeText={(value) => {
          sourceTypeRef.current = "text";
          setDraft(value.slice(0, INPUT_CHAR_CAP));
        }}
        onConvert={convert}
        convertDisabled={!draft.trim() || !online}
        convertLabel={online ? "转换" : "离线"}
        holding={holding}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
        sttError={sttError}
      />
      <Text
        style={styles.sample}
        onPress={() => navigation.navigate("Result", { conversionId: loadSample() })}
      >
        没有 Gemini 时，加载示例
      </Text>
      <Text style={styles.section}>最近</Text>
      {recents.length === 0 ? <EmptyHint text="转换过的句子会出现在这里。" /> : null}
      {recents.map((item) => (
        <HistoryRow
          key={item.id}
          item={item}
          onPress={() => navigation.navigate("Result", { conversionId: item.id })}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.md, paddingBottom: 40, gap: 12 },
  kicker: { color: colors.muted, fontSize: 14 },
  sample: { color: colors.accent, fontSize: 13 },
  section: { fontSize: 18, fontWeight: "700", color: colors.ink, marginTop: 8 }
});
