import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { EmptyHint } from "../components/EmptyHint";
import { MonthCalendar } from "../components/MonthCalendar";
import { useWordbook } from "../context/WordbookState";
import type { TabParamList } from "../navigation/types";
import { dottedDayKeys, dueLabel, itemsOnCalendarDay } from "../services/reviewCalendar";
import { peekSpeechSpeed } from "../services/speechSpeed";
import { SPEAK_FAIL_TEXT, speakAmerican, stopSpeaking } from "../services/tts";
import { colors, space } from "../theme";
import type { WordbookItem } from "../types";

export function WordbookScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { items, deletePhrase } = useWordbook();
  const [now, setNow] = useState(() => Date.now());
  const [listeningId, setListeningId] = useState<string | null>(null);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const listeningIdRef = useRef<string | null>(null);
  listeningIdRef.current = listeningId;

  const stopListen = useCallback((): void => {
    stopSpeaking();
    listeningIdRef.current = null;
    setListeningId(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      return () => stopListen();
    }, [stopListen])
  );

  useEffect(() => {
    const onChange = (status: string) => {
      if (status !== "active") stopListen();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [stopListen]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const dots = useMemo(() => dottedDayKeys(items, now), [items, now]);
  const visible = selectedDay ? itemsOnCalendarDay(items, selectedDay, now) : items;

  const toggleDay = (dayKey: string): void => {
    setSelectedDay((current) => (current === dayKey ? null : dayKey));
  };

  const toggleListen = (item: WordbookItem): void => {
    if (listeningIdRef.current === item.id) {
      stopListen();
      return;
    }
    if (!item.phrase.trim()) return;
    setSpeakError(null);
    listeningIdRef.current = item.id;
    setListeningId(item.id);
    speakAmerican(
      item.phrase,
      {
        onError: () => {
          if (listeningIdRef.current === item.id) {
            listeningIdRef.current = null;
            setListeningId(null);
            setSpeakError(SPEAK_FAIL_TEXT);
          }
        },
        onDone: () => {
          if (listeningIdRef.current === item.id) {
            listeningIdRef.current = null;
            setListeningId(null);
          }
        },
        onStopped: () => {
          if (listeningIdRef.current === item.id) {
            listeningIdRef.current = null;
            setListeningId(null);
          }
        }
      },
      peekSpeechSpeed()
    );
  };

  if (items.length === 0) {
    return (
      <View style={styles.page}>
        <EmptyHint text="转换一句，点词或划短语再存" />
        <Pressable style={styles.btn} onPress={() => navigation.navigate("ConvertTab")}>
          <Text style={styles.btnText}>去转换</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <MonthCalendar selectedDay={selectedDay} dottedDays={dots} onPressDay={toggleDay} now={now} />
      {visible.map((item) => (
        <Swipeable
          key={item.id}
          overshootRight={false}
          renderRightActions={() => (
            <Pressable style={styles.swipe} onPress={() => void deletePhrase(item.id)}>
              <Text style={styles.swipeText}>删除</Text>
            </Pressable>
          )}
        >
          <WordRow
            item={item}
            now={now}
            listening={listeningId === item.id}
            onToggleListen={() => toggleListen(item)}
          />
        </Swipeable>
      ))}
      {speakError ? <Text style={styles.sync}>{speakError}</Text> : null}
    </ScrollView>
  );
}

function WordRow({
  item,
  now,
  listening,
  onToggleListen
}: {
  item: WordbookItem;
  now: number;
  listening: boolean;
  onToggleListen: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.phrase}>{item.phrase}</Text>
      {item.ipa ? <Text style={styles.ipa}>{item.ipa}</Text> : null}
      <Text style={styles.sense}>{item.senses.join(" · ") || "暂无释义"}</Text>
      <Text style={styles.ctx} numberOfLines={2}>
        {item.sentenceContext}
      </Text>
      <Text style={styles.due}>{dueLabel(item.dueAt, now)}</Text>
      {item.syncState !== "synced" ? <Text style={styles.sync}>未同步到云</Text> : null}
      <Pressable onPress={onToggleListen} hitSlop={8}>
        <Text style={styles.listen}>{listening ? "停止" : "听"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.md, gap: 12, backgroundColor: colors.bg },
  list: { padding: space.md, paddingBottom: 40, gap: 12, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: space.md,
    gap: 4
  },
  phrase: { fontSize: 18, fontWeight: "700", color: colors.ink },
  ipa: { color: colors.muted },
  sense: { color: colors.ink, fontSize: 15 },
  ctx: { color: colors.muted, fontSize: 13 },
  due: { color: colors.muted, fontSize: 12, marginTop: 2 },
  listen: { color: colors.accent, fontWeight: "700", fontSize: 16, marginTop: 6 },
  sync: { color: colors.warn, fontSize: 13, marginTop: 2 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  swipe: {
    backgroundColor: colors.warn,
    justifyContent: "center",
    alignItems: "center",
    width: 84,
    marginBottom: 0,
    borderRadius: 14
  },
  swipeText: { color: "#fff", fontWeight: "700" }
});
