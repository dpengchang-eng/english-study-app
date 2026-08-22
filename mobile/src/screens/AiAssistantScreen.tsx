import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppState } from "../context/AppState";
import type { RootStackParamList } from "../navigation/types";
import { startListening, stopListening, useSpeechEvents } from "../services/stt";
import { dateKey, todayKey } from "../services/dates";
import { colors, space } from "../theme";
import type { ChatReplyMode } from "../types";

const MODES: Array<{ id: ChatReplyMode; label: string }> = [
  { id: "rewrite", label: "仅改写" },
  { id: "rewrite_translate", label: "改写+翻译" },
  { id: "rewrite_reply", label: "改写+回复" }
];

export function AiAssistantScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { chats, sendChat, replyMode, setReplyMode } = useAppState();
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [cal, setCal] = useState(false);
  const visible = useMemo(() => (day ? chats.filter((item) => dateKey(item.createdAt) === day) : chats), [chats, day]);

  useSpeechEvents({
    onResult: (text) => setDraft(text),
    onError: () => undefined,
    onEnd: () => undefined
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.head}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={styles.headMid}>
          <View style={styles.titleRow}>
            <Text style={styles.bot}>🤖</Text>
            <Text style={styles.title}>AI 助手 Beta</Text>
          </View>
          <Text style={styles.sub}>直接说或输入，默认帮你自然改写</Text>
        </View>
        <Pressable onPress={() => setCal(true)} hitSlop={8}>
          <Text style={styles.icon}>▦</Text>
        </Pressable>
        <Pressable onPress={() => setMenu(true)} hitSlop={8}>
          <Text style={styles.icon}>⋯</Text>
        </Pressable>
      </View>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.sep}>
            <View style={styles.line} />
            <Text style={styles.sepText}>{day && day !== todayKey() ? day : "今天"}</Text>
            <View style={styles.line} />
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.user : styles.assistant]}>
            <Text style={styles.bubbleText}>{item.text}</Text>
            {item.translation ? <Text style={styles.extra}>翻译：{item.translation}</Text> : null}
            {item.reply ? <Text style={styles.extra}>{item.reply}</Text> : null}
          </View>
        )}
      />
      <View style={styles.composer}>
        <View style={styles.inputWrap}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="说出或输入你想改写的内…"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Pressable
            onPressIn={() => {
              void startListening("zh-CN").catch(() => undefined);
            }}
            onPressOut={stopListening}
          >
            <Text style={styles.mic}>🎤</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.send, !draft.trim() && styles.sendOff]}
          disabled={!draft.trim()}
          onPress={() => {
            sendChat(draft);
            setDraft("");
          }}
        >
          <Text style={styles.sendText}>↑</Text>
        </Pressable>
      </View>
      <Modal transparent visible={menu} animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.mask} onPress={() => setMenu(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>回复方式</Text>
            {MODES.map((item) => (
              <Pressable
                key={item.id}
                style={styles.sheetItem}
                onPress={() => {
                  setReplyMode(item.id);
                  setMenu(false);
                }}
              >
                <Text style={styles.sheetText}>
                  {item.label}
                  {replyMode === item.id ? "  · 默认" : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
      <Modal transparent visible={cal} animationType="fade" onRequestClose={() => setCal(false)}>
        <Pressable style={styles.mask} onPress={() => setCal(false)}>
          <View style={styles.sheet}>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setDay(null);
                setCal(false);
              }}
            >
              <Text style={styles.sheetText}>全部</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setDay(todayKey());
                setCal(false);
              }}
            >
              <Text style={styles.sheetText}>今天</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.sm, paddingBottom: 8, gap: 6 },
  back: { fontSize: 24, width: 24, color: colors.ink },
  headMid: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  bot: { fontSize: 16 },
  title: { fontSize: 16, fontWeight: "800", color: colors.ink },
  sub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  icon: { fontSize: 18, paddingHorizontal: 4, color: colors.ink },
  list: { padding: space.md, gap: 10 },
  sep: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  sepText: { color: colors.muted, fontSize: 12 },
  bubble: { borderRadius: 12, padding: 10, maxWidth: "88%" },
  user: { alignSelf: "flex-end", backgroundColor: colors.accentSoft },
  assistant: { alignSelf: "flex-start", backgroundColor: colors.hair },
  bubbleText: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  extra: { marginTop: 6, color: colors.muted, fontSize: 13 },
  composer: { flexDirection: "row", alignItems: "center", gap: 8, padding: space.md },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
    paddingHorizontal: 12
  },
  input: { flex: 1, paddingVertical: 10, color: colors.ink },
  mic: { fontSize: 16 },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  sendOff: { backgroundColor: colors.dim },
  sendText: { color: "#fff", fontSize: 18 },
  mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 28 },
  sheet: { backgroundColor: colors.card, borderRadius: 12, paddingVertical: 8 },
  sheetTitle: { paddingHorizontal: 16, paddingVertical: 8, color: colors.muted, fontSize: 12 },
  sheetItem: { paddingHorizontal: 16, paddingVertical: 12 },
  sheetText: { fontSize: 16, color: colors.ink }
});
