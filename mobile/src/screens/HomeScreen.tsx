import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { ChatComposer } from "../components/ChatComposer";
import { ChatTurn } from "../components/ChatTurn";
import { EmptyHint } from "../components/EmptyHint";
import { OfflineBanner } from "../components/OfflineBanner";
import { useAppState } from "../context/AppState";
import { useAuth } from "../context/AuthState";
import { useHomeArticleListen } from "../hooks/useHomeArticleListen";
import type { ConvertStackParamList } from "../navigation/types";
import { conversationOrder, conversionEnglish, sendFromComposer } from "../services/homeChat";
import { SPEAK_FAIL_TEXT } from "../services/tts";
import { colors, space } from "../theme";
import { CONVERT_WAIT_MS, INPUT_CHAR_CAP, type Conversion } from "../types";

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ConvertStackParamList>>();
  const { isAnonymous } = useAuth();
  const { online, recents, startConversion, convertAgain, failIfLoading } = useAppState();
  const [draft, setDraft] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Conversion>>(null);
  const turns = conversationOrder(recents);
  const { listenId, toggleListen, stopListen } = useHomeArticleListen(recents, () =>
    setSpeakError(SPEAK_FAIL_TEXT)
  );

  useEffect(() => {
    const timers = recents
      .filter((item) => item.status === "loading")
      .map((item) => {
        const left = CONVERT_WAIT_MS - (Date.now() - item.createdAt);
        return setTimeout(() => failIfLoading(item.id, "gemini_timeout"), Math.max(0, left));
      });
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [recents, failIfLoading]);

  const send = (): void => {
    const result = sendFromComposer(draft, online, startConversion);
    if (!result.conversionId) return;
    setDraft("");
  };

  const openResult = (id: string): void => {
    stopListen();
    navigation.navigate("Result", { conversionId: id });
  };

  const copyAll = async (item: Conversion): Promise<void> => {
    const text = conversionEnglish(item);
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setCopiedId(item.id);
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {!online ? (
        <View style={styles.banner}>
          <OfflineBanner />
        </View>
      ) : null}
      <FlatList
        ref={listRef}
        data={turns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<EmptyHint text="输入中文或英文，点发送。" />}
        renderItem={({ item }) => (
          <ChatTurn
            item={item}
            listening={listenId === item.id}
            copied={copiedId === item.id}
            isAnonymous={isAnonymous}
            onOpenResult={() => openResult(item.id)}
            onCopy={() => void copyAll(item)}
            onListen={() => {
              setSpeakError(null);
              toggleListen(item.id);
            }}
            onRetry={() => {
              if (!online) return;
              convertAgain(item.id);
            }}
          />
        )}
      />
      {speakError ? <Text style={styles.speakError}>{speakError}</Text> : null}
      <ChatComposer
        value={draft}
        onChangeText={(value) => setDraft(value.slice(0, INPUT_CHAR_CAP))}
        onSend={send}
        sendDisabled={!draft.trim() || !online}
        sendLabel={online ? "发送" : "离线"}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  banner: { paddingHorizontal: space.md, paddingTop: space.sm },
  thread: { padding: space.md, paddingBottom: 20, gap: 16, flexGrow: 1 },
  speakError: { color: colors.warn, fontSize: 13, paddingHorizontal: space.md, paddingBottom: 6 }
});
