import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAppState } from "../context/AppState";
import type { ConvertStackParamList } from "../navigation/types";
import { abortListening, startListening, stopListening, useSpeechEvents, type SpeechLang } from "../services/stt";
import { colors, space } from "../theme";
import { INPUT_CHAR_CAP, RECORD_MAX_MS } from "../types";

export function ConvertScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ConvertStackParamList>>();
  const { online, recents, startConversion, loadSample, getConversion } = useAppState();
  const [draft, setDraft] = useState("");
  const [lang, setLang] = useState<SpeechLang>("zh-CN");
  const [holding, setHolding] = useState(false);
  const [willCancel, setWillCancel] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const snapshotRef = useRef("");
  const cancelRef = useRef(false);
  const draftRef = useRef(draft);
  const langRef = useRef(lang);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  draftRef.current = draft;
  langRef.current = lang;

  useSpeechEvents({
    onResult: (text) => {
      if (!cancelRef.current) setDraft(text.slice(0, INPUT_CHAR_CAP));
    },
    onError: (message) => {
      setHolding(false);
      setWillCancel(false);
      setSttError(message);
    },
    onEnd: () => {
      setHolding(false);
      setWillCancel(false);
    }
  });

  const finishRecord = (cancelled: boolean): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHolding(false);
    setWillCancel(false);
    if (cancelled) {
      abortListening();
      setDraft(snapshotRef.current);
      return;
    }
    stopListening();
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        snapshotRef.current = draftRef.current;
        cancelRef.current = false;
        setWillCancel(false);
        setSttError(null);
        setHolding(true);
        void startListening(langRef.current).catch((error: unknown) => {
          setHolding(false);
          setSttError(error instanceof Error ? error.message : "请改用打字。");
        });
        timerRef.current = setTimeout(() => finishRecord(false), RECORD_MAX_MS);
      },
      onPanResponderMove: (_, gesture) => {
        const cancel = gesture.dy < -56;
        cancelRef.current = cancel;
        setWillCancel(cancel);
      },
      onPanResponderRelease: () => finishRecord(cancelRef.current),
      onPanResponderTerminate: () => finishRecord(true)
    })
  ).current;

  const goResult = (id: string): void => {
    navigation.navigate("Result", { conversionId: id });
  };

  const convert = (): void => {
    const text = draft.trim();
    if (!text || !online) return;
    goResult(startConversion(text));
  };

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.kicker}>输入中文或英文，转成地道美语。不是聊天。</Text>
      <View style={styles.card}>
        <TextInput
          value={draft}
          onChangeText={(value) => setDraft(value.slice(0, INPUT_CHAR_CAP))}
          placeholder="先打字，或按住麦克风说进去"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={INPUT_CHAR_CAP}
          style={styles.box}
        />
        <Text style={styles.counter}>
          {draft.length}/{INPUT_CHAR_CAP}
        </Text>
        <View style={styles.row}>
          <Pressable style={[styles.chip, lang === "zh-CN" && styles.chipOn]} onPress={() => setLang("zh-CN")}>
            <Text style={styles.chipText}>中文</Text>
          </Pressable>
          <Pressable style={[styles.chip, lang === "en-US" && styles.chipOn]} onPress={() => setLang("en-US")}>
            <Text style={styles.chipText}>英文</Text>
          </Pressable>
        </View>
        <View style={styles.row}>
          <View
            style={[styles.mic, holding && styles.micHold, willCancel && styles.micCancel]}
            {...pan.panHandlers}
          >
            <Text style={styles.micText}>
              {willCancel ? "松开取消" : holding ? "上滑取消 · 松手填入" : "按住说话"}
            </Text>
          </View>
          <Pressable
            style={[styles.convert, (!draft.trim() || !online) && styles.convertOff]}
            onPress={convert}
            disabled={!draft.trim() || !online}
          >
            <Text style={styles.convertText}>{online ? "转换" : "离线"}</Text>
          </Pressable>
        </View>
        {!online && <Text style={styles.warn}>离线时不能转换。识别出的字可以先留在输入框。</Text>}
        {sttError && <Text style={styles.warn}>{sttError}</Text>}
        <Pressable
          onPress={() => {
            setDraft(SAMPLE_INPUT_SAFE);
            goResult(loadSample());
          }}
        >
          <Text style={styles.sample}>没有模型密钥？加载示例并立刻看结果</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>最近</Text>
      {recents.length === 0 && <Text style={styles.hint}>转换过的句子会出现在这里。</Text>}
      {recents.map((item) => (
        <Pressable
          key={item.firestoreId ?? item.id}
          style={styles.recent}
          onPress={() => {
            const live = getConversion(item.firestoreId ?? item.id) ?? item;
            goResult(live.id);
          }}
        >
          <Text style={styles.recentSrc} numberOfLines={1}>
            {item.sourceText}
          </Text>
          <Text style={styles.recentOut} numberOfLines={2}>
            {item.status === "loading" ? "转换中…" : item.rewrittenText || "—"}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const SAMPLE_INPUT_SAFE = "我想跟你约个时间喝咖啡，看看你方不方便。";

const styles = StyleSheet.create({
  page: { padding: space.md, paddingBottom: 40, gap: 12 },
  kicker: { color: colors.muted, fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10
  },
  box: {
    minHeight: 120,
    fontSize: 16,
    color: colors.ink,
    textAlignVertical: "top"
  },
  counter: { alignSelf: "flex-end", color: colors.muted, fontSize: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  chip: { backgroundColor: colors.chip, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.chipOn },
  chipText: { color: colors.ink, fontWeight: "600" },
  mic: {
    flex: 1,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center"
  },
  micHold: { backgroundColor: "#E8B89A" },
  micCancel: { backgroundColor: "#E8C4C0" },
  micText: { color: colors.ink, fontWeight: "700" },
  convert: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 14
  },
  convertOff: { opacity: 0.45 },
  convertText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  warn: { color: colors.warn, fontSize: 13 },
  sample: { color: colors.accent, fontSize: 13 },
  section: { fontSize: 18, fontWeight: "700", color: colors.ink, marginTop: 8 },
  hint: { color: colors.muted },
  recent: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4
  },
  recentSrc: { color: colors.muted, fontSize: 13 },
  recentOut: { color: colors.ink, fontSize: 15 }
});
