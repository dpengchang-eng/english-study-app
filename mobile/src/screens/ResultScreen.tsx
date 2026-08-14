import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyHint } from "../components/EmptyHint";
import { ErrorState } from "../components/ErrorState";
import { SentenceList } from "../components/SentenceList";
import { useAppState } from "../context/AppState";
import { auth } from "../firebase";
import { openLookup } from "../navigation/rootNav";
import type { ConvertStackParamList } from "../navigation/types";
import { speakAmerican, stopSpeaking } from "../services/tts";
import { colors, space } from "../theme";
import { CONVERT_WAIT_MS, type Sentence, type Token } from "../types";

function consecutiveWords(tokens: Token[], a: Token, b: Token): Token[] | null {
  const words = tokens.filter((token) => token.isWord);
  const i = words.findIndex((token) => token.id === a.id);
  const j = words.findIndex((token) => token.id === b.id);
  if (i < 0 || j < 0) return null;
  const from = Math.min(i, j);
  const to = Math.max(i, j);
  if (to - from + 1 > 6) return null;
  return words.slice(from, to + 1);
}

export function ResultScreen() {
  const route = useRoute<RouteProp<ConvertStackParamList, "Result">>();
  const navigation = useNavigation<NativeStackNavigationProp<ConvertStackParamList>>();
  const { conversionId } = route.params;
  const { getConversion, convertAgain, failIfLoading } = useAppState();
  const conversion = getConversion(conversionId);
  const [copied, setCopied] = useState(false);
  const [picked, setPicked] = useState<{ sentence: Sentence; tokens: Token[] } | null>(null);
  const isAnonymous = !auth.currentUser || auth.currentUser.isAnonymous;

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    if (!conversion || conversion.status !== "loading") return;
    const left = CONVERT_WAIT_MS - (Date.now() - conversion.createdAt);
    const timer = setTimeout(() => failIfLoading(conversionId, "gemini_timeout"), Math.max(0, left));
    return () => clearTimeout(timer);
  }, [conversionId, conversion?.status, conversion?.createdAt, failIfLoading]);

  if (!conversion) {
    return (
      <View style={styles.page}>
        <EmptyHint text="找不到这条转换。" />
      </View>
    );
  }

  const again = (): void => {
    const nextId = convertAgain(conversion.id);
    if (nextId) navigation.replace("Result", { conversionId: nextId });
  };

  const copyAll = async (): Promise<void> => {
    const text =
      conversion.sentences.map((sentence) => sentence.text).filter(Boolean).join("\n") || conversion.outputText || "";
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setCopied(true);
  };

  const play = (sentence: Sentence): void => {
    speakAmerican(sentence.text);
  };

  const openTokens = (sentence: Sentence, tokens: Token[]): void => {
    setPicked(null);
    openLookup({
      tokens,
      sentenceTokens: sentence.tokens ?? tokens,
      sentenceText: sentence.text,
      conversionId: conversion.id
    });
  };

  const onTapToken = (sentence: Sentence, token: Token): void => {
    if (picked && picked.sentence.id === sentence.id) {
      const span = consecutiveWords(sentence.tokens ?? [], picked.tokens[0], token);
      if (span && span.length > 1) {
        setPicked({ sentence, tokens: span });
        return;
      }
    }
    openTokens(sentence, [token]);
  };

  const onLongPressToken = (sentence: Sentence, token: Token): void => {
    setPicked({ sentence, tokens: [token] });
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.source}>{conversion.sourceText}</Text>
      {conversion.status === "loading" ? <SentenceList sentences={[]} loading /> : null}
      {conversion.status === "failed" ? (
        <ErrorState
          errorCode={conversion.errorCode}
          isAnonymous={isAnonymous}
          onRetry={again}
          onGoHome={() => navigation.navigate("Home")}
        />
      ) : null}
      {conversion.status === "ready" ? (
        <SentenceList
          sentences={conversion.sentences}
          selectedIds={picked?.tokens.map((token) => token.id)}
          onPlay={play}
          onTapToken={onTapToken}
          onLongPressToken={onLongPressToken}
        />
      ) : null}
      {picked ? (
        <Pressable style={styles.phrase} onPress={() => openTokens(picked.sentence, picked.tokens)}>
          <Text style={styles.phraseText}>
            保存短语：{picked.tokens.map((token) => token.surface).join(" ")}
          </Text>
        </Pressable>
      ) : null}
      {conversion.status === "ready" ? (
        <View style={styles.actions}>
          <Pressable style={styles.btn} onPress={() => void copyAll()}>
            <Text style={styles.btnText}>{copied ? "已复制" : "复制全部"}</Text>
          </Pressable>
          <Pressable style={styles.ghost} onPress={again}>
            <Text style={styles.ghostText}>再转一次</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.md, paddingBottom: 40, gap: 16, backgroundColor: colors.bg, flexGrow: 1 },
  source: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  phrase: { backgroundColor: colors.accentSoft, borderRadius: 12, padding: 12 },
  phraseText: { color: colors.ink, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  btnText: { color: "#fff", fontWeight: "700" },
  ghost: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.accentSoft },
  ghostText: { color: colors.ink, fontWeight: "700" }
});
