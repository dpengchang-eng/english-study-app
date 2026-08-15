import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { ChatComposer } from "../components/ChatComposer";
import { ChatTurn } from "../components/ChatTurn";
import { EmptyHint } from "../components/EmptyHint";
import { OfflineBanner } from "../components/OfflineBanner";
import { useAppState } from "../context/AppState";
import { useAuth } from "../context/AuthState";
import { useHomeArticleListen } from "../hooks/useHomeArticleListen";
import type { ConvertStackParamList } from "../navigation/types";
import {
  conversationOrder,
  conversionEnglish,
  HOME_COPY_TOAST,
  HOME_EMPTY_HINT,
  HOME_OFFLINE_BANNER,
  sendFromComposer
} from "../services/homeChat";
import { colors, space } from "../theme";
import { CONVERT_WAIT_MS, INPUT_CHAR_CAP, type Conversion } from "../types";

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ConvertStackParamList>>();
  const { isAnonymous } = useAuth();
  const { online, recents, startConversion, convertAgain, failIfLoading } = useAppState();
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const listRef = useRef<FlatList<Conversion>>(null);
  const inputRef = useRef<TextInput>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turns = conversationOrder(recents);
  const { listenId, toggleListen, stopListen } = useHomeArticleListen(recents);

  const scrollToEnd = useCallback((animated: boolean) => {
    listRef.current?.scrollToEnd({ animated });
  }, []);

  useFocusEffect(
    useCallback(() => {
      scrollToEnd(false);
    }, [scrollToEnd])
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

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

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
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(HOME_COPY_TOAST);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {!online ? (
        <View style={styles.banner}>
          <OfflineBanner text={HOME_OFFLINE_BANNER} />
        </View>
      ) : null}
      <FlatList
        ref={listRef}
        data={turns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled"
        extraData={listenId}
        onContentSizeChange={() => scrollToEnd(true)}
        ListEmptyComponent={<EmptyHint text={HOME_EMPTY_HINT} />}
        renderItem={({ item }) => (
          <ChatTurn
            item={item}
            listening={listenId === item.id}
            isAnonymous={isAnonymous}
            onOpenResult={() => openResult(item.id)}
            onCopy={() => void copyAll(item)}
            onListen={() => toggleListen(item.id)}
            onRetry={() => {
              if (!online) return;
              convertAgain(item.id);
            }}
            onFocusInput={() => inputRef.current?.focus()}
          />
        )}
      />
      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
      <ChatComposer
        value={draft}
        onChangeText={(value) => setDraft(value.slice(0, INPUT_CHAR_CAP))}
        onSend={send}
        sendDisabled={!draft.trim() || !online}
        inputRef={inputRef}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  banner: { paddingHorizontal: space.md, paddingTop: space.sm },
  thread: { padding: space.md, paddingBottom: 20, gap: 16, flexGrow: 1 },
  toast: {
    alignSelf: "center",
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8
  },
  toastText: { color: colors.card, fontWeight: "700", fontSize: 14 }
});
