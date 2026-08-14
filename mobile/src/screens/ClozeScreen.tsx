import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useWordbook } from "../context/WordbookState";
import { applySrs, blankedText, clearPracticeAnswers, createPractice, submitPractice } from "../services/practice";
import { colors, space } from "../theme";

export function ClozeScreen() {
  const navigation = useNavigation();
  const { items, applyItem, getItem } = useWordbook();
  const [session] = useState(() => createPractice(items));
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [wrongs, setWrongs] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => clearPracticeAnswers();
  }, []);

  const card = session.cards[index];
  const done = session.cards.length === 0 || index >= session.cards.length;

  const finish = (): void => {
    clearPracticeAnswers();
    navigation.goBack();
  };

  const next = (): void => {
    setDraft("");
    setWrongs(0);
    setRevealed(false);
    setMessage("");
    if (index + 1 >= session.cards.length) {
      finish();
      return;
    }
    setIndex((value) => value + 1);
  };

  const grade = async (kind: "again" | "good"): Promise<void> => {
    if (!card) return;
    const item = getItem(card.wordbookItemId);
    if (item) await applyItem(applySrs(item, kind));
    next();
  };

  const submit = (): void => {
    if (!card || revealed) return;
    if (submitPractice(card.wordbookItemId, draft)) {
      void grade("good");
      return;
    }
    const nextWrongs = wrongs + 1;
    setWrongs(nextWrongs);
    if (nextWrongs === 1) {
      setMessage(card.hintGloss ? `提示：${card.hintGloss}` : "再试一次");
      return;
    }
    const item = getItem(card.wordbookItemId);
    setRevealed(true);
    setMessage(item ? `答案：${item.phrase}` : "这题先跳过");
    if (item) void applyItem(applySrs(item, "again"));
  };

  if (done) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>今天的填空做完了。</Text>
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
      <Text style={styles.sentence}>{blankedText(card)}</Text>
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
        <Pressable style={styles.btn} onPress={submit}>
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
  sentence: { fontSize: 22, lineHeight: 32, color: colors.ink, fontWeight: "600" },
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
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 }
});
