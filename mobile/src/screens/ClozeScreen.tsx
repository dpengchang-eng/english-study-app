import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppState } from "../context/AppState";
import { useWordbook } from "../context/WordbookState";
import type { RootStackParamList } from "../navigation/types";
import { blankParts, clearPracticeAnswers, createPractice, type PracticeSession, submitPractice } from "../services/practice";
import { clozeHydrateKey, pickClozeItems, practiceSourceItems, waitForClozeHydrate } from "../services/reviewCalendar";
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
  const navigation = useNavigation();
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
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    let live = true;
    const hang = setTimeout(() => {
      if (live) setSession((current) => current ?? { sessionId: "local", cards: [] });
    }, 10_000);
    if (waitForClozeHydrate(itemIds, itemsRef.current)) {
      return () => {
        live = false;
        clearTimeout(hang);
        clearPracticeAnswers();
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
    };
  }, [hydrateKey, itemIds, itemIdsKey, uid]);

  if (session === null) {
    return (
      <View style={styles.page}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const card = session.cards[index];
  const done = session.cards.length === 0 || index >= session.cards.length || !card;

  const finish = (): void => {
    clearPracticeAnswers();
    navigation.goBack();
  };

  const next = (): void => {
    setDraft("");
    setAttempt(0);
    setRevealed(false);
    setMessage("");
    setSyncWarn("");
    if (!session || index + 1 >= session.cards.length) {
      finish();
      return;
    }
    setIndex((value) => value + 1);
  };

  const submit = async (): Promise<void> => {
    if (!card || revealed || busy) return;
    setBusy(true);
    const nextAttempt = attempt + 1;
    const { result, items: nextItems } = await submitPractice(
      uid,
      itemsRef.current,
      card.wordbookItemId,
      draft,
      nextAttempt,
      session.sessionId
    );
    syncItems(nextItems);
    const updated = nextItems.find((item) => item.id === card.wordbookItemId);
    setSyncWarn(updated?.syncState === "error" ? "未同步到云" : "");
    setAttempt(nextAttempt);
    if (result.correct) {
      setBusy(false);
      next();
      return;
    }
    if (nextAttempt === 1) {
      setMessage(card.hintGloss ? `提示：${card.hintGloss}` : "再试一次");
      setBusy(false);
      return;
    }
    setRevealed(true);
    setMessage(result.expected ? `答案：${result.expected}` : "这题先跳过");
    setBusy(false);
  };

  if (done) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>现在没有待复习的填空。</Text>
        <Text style={styles.kicker}>先存几个词，到期了再来填空。</Text>
        <Pressable style={styles.btn} onPress={finish}>
          <Text style={styles.btnText}>返回</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Pressable onPress={finish}>
        <Text style={styles.kicker}>关闭</Text>
      </Pressable>
      <Text style={styles.kicker}>
        {index + 1}/{session.cards.length}
      </Text>
      <ClozeSentence card={card} phrase={items.find((item) => item.id === card.wordbookItemId)?.phrase} />
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
      {syncWarn ? <Text style={styles.sync}>{syncWarn}</Text> : null}
      {revealed ? (
        <Pressable style={styles.btn} onPress={next}>
          <Text style={styles.btnText}>下一题</Text>
        </Pressable>
      ) : (
        <Pressable style={[styles.btn, busy && styles.off]} onPress={() => void submit()} disabled={busy}>
          <Text style={styles.btnText}>提交</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.lg, gap: 14, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  kicker: { color: colors.muted },
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
  sync: { color: colors.warn, fontSize: 14 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  off: { opacity: 0.45 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 }
});
