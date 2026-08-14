import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppState } from "../context/AppState";
import { useWordbook } from "../context/WordbookState";
import { blankParts, clearPracticeAnswers, createPractice, type PracticeSession, submitPractice } from "../services/practice";
import { colors, space } from "../theme";
import type { PracticeCard } from "../types";

function ClozeSentence({ card }: { card: PracticeCard }) {
  const { before, after } = blankParts(card);
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
  const { uid } = useAppState();
  const { items, syncItems } = useWordbook();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    let live = true;
    void createPractice(uid, itemsRef.current).then((next) => {
      if (live) setSession(next);
    });
    return () => {
      live = false;
      clearPracticeAnswers();
    };
  }, [uid]);

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
    const { result, items: nextItems } = await submitPractice(uid, items, card.wordbookItemId, draft, nextAttempt);
    syncItems(nextItems);
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
      <ClozeSentence card={card} />
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
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  off: { opacity: 0.45 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 }
});
