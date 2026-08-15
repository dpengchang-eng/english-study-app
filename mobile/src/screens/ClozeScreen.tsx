import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppState } from "../context/AppState";
import { useWordbook } from "../context/WordbookState";
import type { RootStackParamList } from "../navigation/types";
import { blankParts, clearPracticeAnswers, clozeAnswerLine, createPractice, type PracticeSession, submitPractice } from "../services/practice";
import { clozeHydrateKey, pickClozeItems, practiceSourceItems, waitForClozeHydrate } from "../services/reviewCalendar";
import { peekSpeechSpeed } from "../services/speechSpeed";
import { SPEAK_FAIL_TEXT, speakAmerican, stopSpeaking } from "../services/tts";
import { colors, space } from "../theme";
import type { PracticeCard } from "../types";

function ClozeSentence({ card, phrase }: { card: PracticeCard; phrase?: string }) {
  const { before, after } = blankParts(card, phrase);
  return (
    <View style={styles.sentenceWrap}>
      <Text style={styles.sentence}>{before}</Text>
      <View style={styles.blank} accessibilityLabel="blank" />
      <Text style={styles.sentence}>{after}</Text>
    </View>
  );
}

export function ClozeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "Cloze">>();
  const route = useRoute<RouteProp<RootStackParamList, "Cloze">>();
  const { uid } = useAppState();
  const { items, syncItems } = useWordbook();
  const itemIds = route.params?.itemIds;
  const itemIdsKey = itemIds?.join("\0") ?? "";
  const hydrateKey = clozeHydrateKey(itemIds, items);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState("");
  const [syncWarn, setSyncWarn] = useState("");
  const [busy, setBusy] = useState(false);
  const [settled, setSettled] = useState(false);
  const [missedIds, setMissedIds] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const listeningRef = useRef(false);
  listeningRef.current = listening;

  const stopListen = useCallback((): void => {
    stopSpeaking();
    setListening(false);
  }, []);

  const backToReview = useCallback((): void => {
    stopListen();
    navigation.navigate("Tabs", { screen: "ReviewTab" });
  }, [navigation, stopListen]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => stopListen();
    }, [stopListen])
  );

  useEffect(() => {
    const onChange = (status: string) => {
      if (status !== "active") stopListen();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [stopListen]);

  useEffect(() => {
    let live = true;
    setSession(null);
    setIndex(0);
    setDraft("");
    setAttempt(0);
    setRevealed(false);
    setMessage("");
    setSyncWarn("");
    setSettled(false);
    setMissedIds([]);
    stopListen();
    const hang = setTimeout(() => {
      if (live) setSession((current) => current ?? { sessionId: "local", cards: [] });
    }, 10_000);
    if (waitForClozeHydrate(itemIds, itemsRef.current)) {
      return () => {
        live = false;
        clearTimeout(hang);
        clearPracticeAnswers();
        stopSpeaking();
      };
    }
    const picked = pickClozeItems(itemsRef.current, itemIds);
    void createPractice(uid, practiceSourceItems(picked))
      .then((next) => {
        if (live) setSession(next);
      })
      .catch(() => {
        if (live) setSession({ sessionId: "local", cards: [] });
      })
      .finally(() => clearTimeout(hang));
    return () => {
      live = false;
      clearTimeout(hang);
      clearPracticeAnswers();
      stopSpeaking();
    };
  }, [hydrateKey, itemIds, itemIdsKey, stopListen, uid]);

  const resetCard = (): void => {
    setDraft("");
    setAttempt(0);
    setRevealed(false);
    setMessage("");
    setSyncWarn("");
    setSpeakError(null);
    stopListen();
  };

  const finishCard = (): void => {
    if (!session || index + 1 >= session.cards.length) {
      stopListen();
      setSettled(true);
      return;
    }
    resetCard();
    setIndex((value) => value + 1);
  };

  const toggleListen = (sentenceContext: string): void => {
    if (listeningRef.current) {
      stopListen();
      return;
    }
    if (!sentenceContext.trim()) return;
    setSpeakError(null);
    setListening(true);
    speakAmerican(
      sentenceContext,
      {
        onError: () => {
          setListening(false);
          setSpeakError(SPEAK_FAIL_TEXT);
        },
        onDone: () => setListening(false),
        onStopped: () => setListening(false)
      },
      peekSpeechSpeed()
    );
  };

  const retryMissed = async (): Promise<void> => {
    if (!missedIds.length) return;
    stopListen();
    setBusy(true);
    const picked = pickClozeItems(itemsRef.current, missedIds);
    try {
      const next = await createPractice(uid, practiceSourceItems(picked));
      setSession(next);
      setIndex(0);
      setDraft("");
      setAttempt(0);
      setRevealed(false);
      setMessage("");
      setSyncWarn("");
      setSettled(false);
      setMissedIds([]);
      setSpeakError(null);
    } catch {
      setSession({ sessionId: "local", cards: [] });
    } finally {
      setBusy(false);
    }
  };

  const submit = async (card: PracticeCard): Promise<void> => {
    if (revealed || busy) return;
    setBusy(true);
    const nextAttempt = attempt + 1;
    const { result, items: nextItems } = await submitPractice(
      uid,
      itemsRef.current,
      card.wordbookItemId,
      draft,
      nextAttempt,
      session?.sessionId
    );
    syncItems(nextItems);
    const updated = nextItems.find((item) => item.id === card.wordbookItemId);
    setSyncWarn(updated?.syncState === "error" ? "未同步到云" : "");
    setAttempt(nextAttempt);
    if (result.correct) {
      setRevealed(true);
      setBusy(false);
      return;
    }
    if (nextAttempt === 1) {
      setMessage(card.hintGloss ? `提示：${card.hintGloss}` : "再试一次");
      setBusy(false);
      return;
    }
    setMissedIds((current) => (current.includes(card.wordbookItemId) ? current : [...current, card.wordbookItemId]));
    setRevealed(true);
    setMessage(result.expected ? `答案：${result.expected}` : "这题先跳过");
    setBusy(false);
  };

  if (session === null) {
    return (
      <SafeAreaView style={styles.page}>
        <Pressable onPress={backToReview}>
          <Text style={styles.kicker}>返回复习</Text>
        </Pressable>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (session.cards.length === 0) {
    return (
      <SafeAreaView style={styles.page}>
        <Pressable onPress={backToReview}>
          <Text style={styles.kicker}>返回复习</Text>
        </Pressable>
        <Text style={styles.title}>现在没有待复习的填空。</Text>
        <Text style={styles.kicker}>先存几个词，到期了再来填空。</Text>
        <Pressable style={styles.btn} onPress={backToReview}>
          <Text style={styles.btnText}>返回复习</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (settled) {
    return (
      <SafeAreaView style={styles.page}>
        <Pressable onPress={backToReview}>
          <Text style={styles.kicker}>返回复习</Text>
        </Pressable>
        <Text style={styles.title}>这轮练完了</Text>
        <Pressable style={styles.btn} onPress={backToReview}>
          <Text style={styles.btnText}>返回复习</Text>
        </Pressable>
        {missedIds.length > 0 ? (
          <Pressable style={styles.ghost} onPress={() => void retryMissed()} disabled={busy}>
            <Text style={styles.ghostText}>再练错题</Text>
          </Pressable>
        ) : null}
      </SafeAreaView>
    );
  }

  const card = session.cards[index];
  if (!card) {
    return (
      <SafeAreaView style={styles.page}>
        <Pressable onPress={backToReview}>
          <Text style={styles.kicker}>返回复习</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={backToReview}>
          <Text style={styles.btnText}>返回复习</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const currentItem = items.find((item) => item.id === card.wordbookItemId);
  const sentenceContext = currentItem?.sentenceContext || card.sentenceText;
  const answerLine = currentItem && revealed ? clozeAnswerLine(currentItem) : "";

  return (
    <SafeAreaView style={styles.page}>
      <Pressable onPress={backToReview}>
        <Text style={styles.kicker}>返回复习</Text>
      </Pressable>
      <View style={styles.topRow}>
        <Text style={styles.kicker}>
          {index + 1}/{session.cards.length}
        </Text>
        <Pressable onPress={() => toggleListen(sentenceContext)} hitSlop={8}>
          <Text style={styles.listen}>{listening ? "停止" : "听"}</Text>
        </Pressable>
      </View>
      <ClozeSentence card={card} phrase={currentItem?.phrase} />
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="填上空白里的词"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!revealed}
        style={styles.input}
      />
      {message ? <Text style={styles.msg}>{message}</Text> : null}
      {answerLine ? <Text style={styles.answer}>{answerLine}</Text> : null}
      {syncWarn ? <Text style={styles.sync}>{syncWarn}</Text> : null}
      {speakError ? <Text style={styles.sync}>{speakError}</Text> : null}
      {revealed ? (
        <Pressable style={styles.btn} onPress={finishCard}>
          <Text style={styles.btnText}>下一题</Text>
        </Pressable>
      ) : (
        <Pressable style={[styles.btn, busy && styles.off]} onPress={() => void submit(card)} disabled={busy}>
          <Text style={styles.btnText}>提交</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.lg, gap: 14, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  kicker: { color: colors.muted },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  listen: { color: colors.accent, fontWeight: "700", fontSize: 16 },
  sentenceWrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" },
  sentence: { fontSize: 22, lineHeight: 32, color: colors.ink, fontWeight: "600" },
  blank: {
    width: 96,
    height: 2,
    backgroundColor: colors.ink,
    marginHorizontal: 6,
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 18,
    color: colors.ink
  },
  msg: { color: colors.ink, fontSize: 16 },
  answer: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  sync: { color: colors.warn, fontSize: 14 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ghost: { backgroundColor: colors.accentSoft, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  off: { opacity: 0.45 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ghostText: { color: colors.ink, fontWeight: "700", fontSize: 16 }
});
