import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { formatDetailStamp } from "../services/dates";
import { stopSpeaking } from "../services/tts";
import { colors, space } from "../theme";

export function CardDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "CardDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getCard, setBlanks, relatedCards } = useAppState();
  const card = getCard(route.params.cardId);
  const practice = usePractice(card, (blanks) => {
    if (card) setBlanks(card.id, blanks);
  });
  const [rewriteOpen, setRewriteOpen] = useState(true);
  const [replyOpen, setReplyOpen] = useState(true);
  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const [lookup, setLookup] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const related = card ? relatedCards(card.id) : [];

  if (!card) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.missing}>找不到这张卡片。</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.head}>
        <Pressable
          onPress={() => {
            stopSpeaking();
            navigation.goBack();
          }}
          hitSlop={8}
        >
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("CreateCard", { cardId: card.id })} hitSlop={8}>
          <Text style={styles.nav}>✎</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
        <Text style={styles.title}>{card.title}</Text>
        <Text style={styles.stamp}>{formatDetailStamp(card.createdAt)}</Text>
        {card.images.map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.image} />
        ))}
        <Pressable style={styles.section} onPress={() => setRewriteOpen((open) => !open)}>
          <Text style={styles.sectionTitle}>目标语言改写</Text>
          <Text style={styles.chev}>{rewriteOpen ? "⌃" : "⌄"}</Text>
        </Pressable>
        {rewriteOpen ? (
          practice.showingOriginal ? (
            <Text style={styles.original}>{card.body}</Text>
          ) : card.rewrite ? (
            <RewriteBlock
              sentences={practice.displaySentences}
              blanks={card.blanks}
              mode={practice.mode}
              hidden={practice.hidden}
              drafts={practice.drafts}
              filledGreen={practice.filledGreen}
              onDraftChange={practice.onDraftChange}
              onCheck={practice.onCheck}
              onMenu={(target) => setMenu(target)}
              hideMenu={() => setMenu(null)}
              activeBlankId={practice.selectBlankId}
              onActivateBlank={practice.setSelectBlankId}
            />
          ) : (
            <Text style={styles.muted}>未改写</Text>
          )
        ) : null}
        {card.reply ? (
          <>
            <Pressable style={styles.section} onPress={() => setReplyOpen((open) => !open)}>
              <Text style={styles.sectionTitle}>回复</Text>
              <Text style={styles.chev}>{replyOpen ? "⌃" : "⌄"}</Text>
            </Pressable>
            {replyOpen ? (
              <View style={styles.reply}>
                <Text style={styles.replyText}>{card.reply}</Text>
                <Pressable onPress={() => void Clipboard.setStringAsync(card.reply)}>
                  <Text style={styles.copy}>⧉</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
        {related.length > 0 ? (
          <View style={styles.related}>
            <Text style={styles.sectionTitle}>相关记录</Text>
            {related.map((item) => (
              <Pressable key={item.id} onPress={() => navigation.push("CardDetail", { cardId: item.id })}>
                <Text style={styles.relatedItem}>{item.title}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        </View>
      </ScrollView>
      <Pressable style={styles.handle} onPress={() => setPlayerOpen((open) => !open)}>
        <Text style={styles.handleText}>{playerOpen ? "‹" : "›"}</Text>
      </Pressable>
      {playerOpen ? (
        <View style={styles.player}>
          <Text style={styles.playerText} numberOfLines={2}>
            {card.rewrite || card.body}
          </Text>
          <Pressable onPress={practice.playAll}>
            <Text style={styles.nav}>▶</Text>
          </Pressable>
        </View>
      ) : null}
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
  safe: { flex: 1, backgroundColor: colors.page },
  head: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.md, paddingVertical: 8, backgroundColor: colors.bg },
  nav: { fontSize: 22, color: colors.ink },
  page: { padding: 12, paddingBottom: 24 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: space.md, gap: 10 },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  stamp: { color: colors.muted, fontSize: 13 },
  image: { width: "100%", height: 180, borderRadius: 10, backgroundColor: colors.hair },
  section: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  chev: { color: colors.muted },
  original: { fontSize: 16, lineHeight: 26, color: colors.ink },
  muted: { color: colors.muted },
  reply: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  replyText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.ink },
  copy: { color: colors.muted, fontSize: 14 },
  related: { gap: 8, marginTop: 8 },
  relatedItem: { fontSize: 14, color: colors.ink, paddingVertical: 6 },
  missing: { padding: space.md, color: colors.muted },
  handle: {
    position: "absolute",
    left: 0,
    top: "42%",
    width: 22,
    height: 40,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: colors.handle,
    alignItems: "center",
    justifyContent: "center"
  },
  handleText: { color: "#fff", fontSize: 14 },
  player: {
    marginHorizontal: space.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  playerText: { flex: 1, color: colors.ink, fontSize: 13 }
});
