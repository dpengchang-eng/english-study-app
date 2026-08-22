import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LookupSheet } from "../components/LookupSheet";
import { PracticeToolbar } from "../components/PracticeToolbar";
import { RewriteBlock, type MenuTarget } from "../components/RewriteBlock";
import { SelectChoices } from "../components/SelectChoices";
import { Toast } from "../components/Toast";
import { WordMenu } from "../components/WordMenu";
import { useAppState } from "../context/AppState";
import { usePractice } from "../hooks/usePractice";
import type { RootStackParamList } from "../navigation/types";
import { autoBlankCard } from "../services/cloze";
import { stopSpeaking } from "../services/tts";
import { colors, space } from "../theme";

export function RecallSessionScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "RecallSession">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getCard, setBlanks, setLastSession } = useAppState();
  const { cardIds } = route.params;
  const [index, setIndex] = useState(0);
  const card = getCard(cardIds[index] ?? "");
  const practice = usePractice(card, (blanks) => {
    if (card) setBlanks(card.id, blanks);
  });
  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const [lookup, setLookup] = useState<string | null>(null);

  useEffect(() => {
    setLastSession({ kind: route.params.kind, cardIds, index, dateKey: route.params.dateKey, query: route.params.query });
  }, [cardIds, index, route.params.dateKey, route.params.kind, route.params.query, setLastSession]);

  useEffect(() => {
    if (!card || card.blanks.length > 0) return;
    const auto = autoBlankCard(card.sentences, card.blanks);
    if (auto.length) setBlanks(card.id, auto);
  }, [card, setBlanks]);

  if (!card) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.empty}>没有可回忆的卡片。</Text>
      </SafeAreaView>
    );
  }

  const end = (): void => {
    stopSpeaking();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.head}>
        <Pressable onPress={end}>
          <Text style={styles.x}>✕</Text>
        </Pressable>
        <Text style={styles.count}>
          {index + 1}/{cardIds.length}
        </Text>
        <Pressable onPress={end}>
          <Text style={styles.done}>结束回忆 ✓</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{card.title}</Text>
        {practice.showingOriginal ? (
          <Text style={styles.orig}>{card.body}</Text>
        ) : (
          <RewriteBlock
            sentences={practice.displaySentences}
            blanks={card.blanks}
            mode={practice.mode}
            hidden={practice.hidden}
            drafts={practice.drafts}
            filledGreen={practice.filledGreen}
            onDraftChange={practice.onDraftChange}
            onCheck={practice.onCheck}
            onMenu={setMenu}
            hideMenu={() => setMenu(null)}
            activeBlankId={practice.selectBlankId}
            onActivateBlank={practice.setSelectBlankId}
          />
        )}
        {index < cardIds.length - 1 ? (
          <Pressable style={styles.next} onPress={() => setIndex((value) => value + 1)}>
            <Text style={styles.nextText}>下一张</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {practice.mode === "select" && practice.selectOptions ? (
        <SelectChoices options={practice.selectOptions} onPick={practice.pickSelect} />
      ) : null}
      <PracticeToolbar
        mode={practice.mode}
        fillEnabled={practice.fillEnabled}
        showingOriginal={practice.showingOriginal}
        hidden={practice.hidden}
        onToggleOriginal={() => practice.setShowingOriginal((value) => !value)}
        onDictation={() => {
          practice.setMode("dictation");
          practice.setHidden(true);
          practice.playAll();
        }}
        onToggleHidden={() => practice.setHidden((value) => !value)}
        onFill={practice.enterFill}
        onSelect={practice.enterSelect}
        onPlayAll={practice.playAll}
      />
      <WordMenu
        visible={Boolean(menu)}
        kind={menu?.kind === "blank" ? "blank" : "word"}
        top={menu ? Math.max(80, menu.y - 140) : 0}
        left={menu ? Math.min(220, Math.max(12, menu.x - 80)) : 0}
        onLookup={() => {
          if (!menu) return;
          setLookup(menu.kind === "word" ? menu.word : menu.blank.answer);
          setMenu(null);
        }}
        onCloze={() => {
          if (menu?.kind === "word") practice.clozeWord(menu.sentenceId, menu.start, menu.end);
          setMenu(null);
        }}
        onRemove={() => {
          if (menu?.kind === "blank") practice.remove(menu.blank.id);
          setMenu(null);
        }}
      />
      <LookupSheet word={lookup} onClose={() => setLookup(null)} />
      <Toast text={practice.toast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.md, paddingVertical: 8 },
  x: { fontSize: 18, color: colors.ink },
  count: { fontWeight: "800", color: colors.ink },
  done: { fontWeight: "700", color: colors.ink },
  body: { padding: space.md, gap: 12, paddingBottom: 24 },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink },
  orig: { fontSize: 16, lineHeight: 26, color: colors.ink },
  empty: { padding: space.md, color: colors.muted },
  next: { alignSelf: "flex-end", backgroundColor: colors.ink, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  nextText: { color: "#fff", fontWeight: "700" }
});
