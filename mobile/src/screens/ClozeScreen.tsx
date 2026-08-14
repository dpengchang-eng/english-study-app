import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppState } from "../context/AppState";
import type { RootStackParamList } from "../navigation/types";
import { renderCloze, toPracticeCard } from "../services/practice";
import { answersMatch, bumpAfterCorrect } from "../services/srs";
import { cacheKey, playPrepared } from "../services/tts";
import { colors, space } from "../theme";
import type { PracticeCard } from "../types";

export function ClozeScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Cloze">>();
  const { itemIds, mode } = route.params;
  const { wordbook, settings, markReview } = useAppState();
  const [deck] = useState(() =>
    itemIds
      .map((id) => wordbook.find((item) => item.id === id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map(toPracticeCard)
      .slice(0, settings.quizSize)
  );

  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [wrongs, setWrongs] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [misses, setMisses] = useState<string[]>([]);
  const [phase, setPhase] = useState<"quiz" | "recap">("quiz");
  const [recapIds, setRecapIds] = useState<string[] | null>(null);

  const cards: PracticeCard[] = recapIds
    ? deck.filter((card) => recapIds.includes(card.itemId))
    : deck;
  const card = cards[index];

  const finishCard = async (ok: boolean): Promise<void> => {
    if (!card || recapIds) {
      goNext(ok);
      return;
    }
    const item = wordbook.find((row) => row.id === card.itemId);
    if (item && (mode === "review" || mode === "practice")) {
      await markReview(item, ok ? bumpAfterCorrect(item) : "again");
    }
    goNext(ok);
  };

  const goNext = (ok: boolean): void => {
    const nextMisses = ok ? misses : [...misses, card.itemId];
    if (!ok) setMisses(nextMisses);
    if (index + 1 >= cards.length) {
      setMisses(nextMisses);
      setPhase("recap");
      return;
    }
    setIndex((prev) => prev + 1);
    setDraft("");
    setWrongs(0);
    setRevealed(false);
    setCorrect(false);
  };

  const submit = (): void => {
    if (!card || revealed || correct) return;
    if (answersMatch(draft, card.answer)) {
      setCorrect(true);
      const item = wordbook.find((row) => row.id === card.itemId);
      void playPrepared(cacheKey(item?.conversionId ?? card.itemId, 0), card.sentence, settings);
      return;
    }
    const next = wrongs + 1;
    setWrongs(next);
    if (next >= 2) setRevealed(true);
  };

  if (phase === "recap") {
    const uniqueMisses = [...new Set(misses)];
    return (
      <View style={styles.page}>
        <Text style={styles.title}>本轮结束</Text>
        <Text style={styles.hint}>
          对了 {cards.length - uniqueMisses.length} / {cards.length}
        </Text>
        {uniqueMisses.length > 0 && (
          <Pressable
            style={styles.primary}
            onPress={() => {
              setRecapIds(uniqueMisses);
              setMisses([]);
              setIndex(0);
              setDraft("");
              setWrongs(0);
              setRevealed(false);
              setCorrect(false);
              setPhase("quiz");
            }}
          >
            <Text style={styles.primaryText}>重做错题</Text>
          </Pressable>
        )}
        <Pressable style={styles.ghost} onPress={() => navigation.goBack()}>
          <Text style={styles.ghostText}>完成</Text>
        </Pressable>
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>没有可练的词</Text>
        <Pressable style={styles.primary} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryText}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const parts = renderCloze(card);

  return (
    <View style={styles.page}>
      <Text style={styles.kicker}>
        {mode === "review" ? "复习" : recapIds ? "错题" : "填空"} · {index + 1}/{cards.length}
      </Text>
      <Text style={styles.cloze}>
        {parts.before}
        <Text style={styles.blank}>______</Text>
        {parts.after}
      </Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!revealed && !correct}
        placeholder="填入单词或短语"
        placeholderTextColor={colors.muted}
        style={styles.input}
        onSubmitEditing={submit}
      />
      {!revealed && !correct && (
        <Pressable style={styles.primary} onPress={submit}>
          <Text style={styles.primaryText}>提交</Text>
        </Pressable>
      )}
      {wrongs === 1 && !correct && !revealed && <Text style={styles.warn}>再试一次。两次错误后会揭晓。</Text>}
      {correct && <Text style={styles.good}>对了。正在播放原句。</Text>}
      {revealed && <Text style={styles.warn}>答案是 “{card.answer}”。</Text>}
      {(correct || revealed) && (
        <Pressable style={styles.primary} onPress={() => void finishCard(correct)}>
          <Text style={styles.primaryText}>下一题</Text>
        </Pressable>
      )}
      <Pressable style={styles.ghost} onPress={() => navigation.goBack()}>
        <Text style={styles.ghostText}>退出</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: space.lg, gap: 14, justifyContent: "center" },
  kicker: { color: colors.muted },
  title: { fontSize: 24, fontWeight: "800", color: colors.ink },
  cloze: { fontSize: 22, lineHeight: 34, color: colors.ink },
  blank: { color: colors.accent, fontWeight: "800" },
  input: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.ink,
    backgroundColor: colors.card
  },
  primary: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ghost: { alignItems: "center", paddingVertical: 8 },
  ghostText: { color: colors.muted, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 16 },
  warn: { color: colors.warn },
  good: { color: colors.good }
});
