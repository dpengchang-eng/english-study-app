import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MysteryBoxModal } from "../components/MysteryBoxModal";
import { useAppState } from "../context/AppState";
import type { RootStackParamList } from "../navigation/types";
import { colors, space } from "../theme";

export function MemoriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cardsToday, cardsYesterday, lastSession, searchCards } = useAppState();
  const today = cardsToday();
  const yesterday = cardsYesterday();
  const [mystery, setMystery] = useState(false);
  const [keywordOpen, setKeywordOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

  const startList = (kind: "today" | "yesterday" | "last" | "keyword", ids: string[], query?: string): void => {
    if (ids.length === 0) return;
    navigation.navigate("RecallSession", { kind, cardIds: ids, query });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>回忆</Text>
        <View style={styles.spacer} />
      </View>
      <Pressable
        style={[styles.continue, !lastSession && styles.disabled]}
        disabled={!lastSession}
        onPress={() => lastSession && startList("last", lastSession.cardIds)}
      >
        <Text style={styles.continueText}>继续上次</Text>
        <Text style={styles.arrow}>→</Text>
      </Pressable>
      <View style={styles.tiles}>
        <Pressable
          style={[styles.tile, today.length === 0 && styles.disabled]}
          disabled={today.length === 0}
          onPress={() => startList("today", today.map((card) => card.id))}
        >
          <Text style={styles.tileTitle}>今天</Text>
          <Text style={styles.tileSub}>{today.length === 0 ? "没有 Card" : `${today.length} 张卡片`}</Text>
        </Pressable>
        <Pressable
          style={[styles.tile, yesterday.length === 0 && styles.disabled]}
          disabled={yesterday.length === 0}
          onPress={() => startList("yesterday", yesterday.map((card) => card.id))}
        >
          <Text style={styles.tileTitle}>昨天</Text>
          <Text style={styles.tileSub}>{yesterday.length === 0 ? "没有 Card" : `${yesterday.length} 张卡片`}</Text>
        </Pressable>
      </View>
      <Pressable style={styles.row} onPress={() => navigation.navigate("RecordCalendar")}>
        <Text style={styles.rowIcon}>＋</Text>
        <Text style={styles.rowText}>选择日期</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => setKeywordOpen(true)}>
        <Text style={styles.rowIcon}>⌕</Text>
        <Text style={styles.rowText}>关键词搜索</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => setMystery(true)}>
        <Text style={styles.rowIcon}>▣</Text>
        <Text style={styles.rowText}>记忆盲盒</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <MysteryBoxModal
        visible={mystery}
        onClose={() => setMystery(false)}
        onStart={(range, count) => {
          setMystery(false);
          navigation.navigate("MysteryBox", { range, count });
        }}
      />
      <Modal transparent visible={keywordOpen} animationType="fade" onRequestClose={() => setKeywordOpen(false)}>
        <View style={styles.mask}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>关键词搜索</Text>
            <View style={styles.field}>
              <TextInput
                value={keyword}
                onChangeText={setKeyword}
                placeholder="输入关键词"
                placeholderTextColor={colors.muted}
                style={styles.keyword}
              />
              <Pressable
                style={styles.go}
                onPress={() => {
                  const hits = searchCards(keyword);
                  setKeywordOpen(false);
                  startList(
                    "keyword",
                    hits.map((card) => card.id),
                    keyword
                  );
                }}
              >
                <Text style={styles.goText}>→</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.page },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.md, paddingVertical: 8, backgroundColor: colors.bg },
  back: { fontSize: 24, width: 28, color: colors.ink },
  title: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800" },
  spacer: { width: 28 },
  continue: {
    margin: space.md,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  continueText: { fontSize: 16, fontWeight: "700", color: colors.ink },
  arrow: { color: colors.muted, fontSize: 18 },
  tiles: { flexDirection: "row", gap: 10, paddingHorizontal: space.md },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 16, minHeight: 88 },
  tileTitle: { fontSize: 22, fontWeight: "800", color: colors.ink },
  tileSub: { marginTop: 8, color: colors.muted, fontSize: 13 },
  disabled: { opacity: 0.45 },
  row: {
    marginHorizontal: space.md,
    marginTop: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  rowIcon: { width: 22, textAlign: "center", color: colors.ink },
  rowText: { flex: 1, fontSize: 15, color: colors.ink },
  chev: { color: colors.muted, fontSize: 18 },
  mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 28 },
  dialog: { backgroundColor: colors.card, borderRadius: 14, padding: 18, gap: 12 },
  dialogTitle: { textAlign: "center", fontWeight: "800", fontSize: 16 },
  field: { flexDirection: "row", alignItems: "center", gap: 8 },
  keyword: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  go: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.hair, alignItems: "center", justifyContent: "center" },
  goText: { color: colors.ink }
});
