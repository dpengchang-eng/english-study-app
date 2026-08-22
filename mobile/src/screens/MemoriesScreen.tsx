import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MysteryBoxModal } from "../components/MysteryBoxModal";
import { useAppState } from "../context/AppState";
import type { RootStackParamList } from "../navigation/types";
import { colors, space } from "../theme";
import type { RecallKind } from "../types";

export function MemoriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cardsToday, cardsYesterday, lastSession, searchCards } = useAppState();
  const today = cardsToday();
  const yesterday = cardsYesterday();
  const [mystery, setMystery] = useState(false);
  const [keywordOpen, setKeywordOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

  const start = (kind: RecallKind, ids: string[], query?: string): void => {
    if (ids.length === 0) return;
    navigation.navigate("RecallSession", { kind, cardIds: ids, query });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>回忆</Text>
        <View style={styles.spacer} />
      </View>
      {lastSession ? (
        <Pressable style={styles.continue} onPress={() => start("last", lastSession.cardIds)}>
          <Text style={styles.continueText}>继续上次</Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      ) : null}
      <View style={[styles.tiles, !lastSession && styles.tilesTop]}>
        <Tile
          label="今天"
          count={today.length}
          onPress={() => start("today", today.map((card) => card.id))}
        />
        <Tile
          label="昨天"
          count={yesterday.length}
          onPress={() => start("yesterday", yesterday.map((card) => card.id))}
        />
      </View>
      <Pressable style={styles.row} onPress={() => navigation.navigate("RecordCalendar")}>
        <Text style={styles.rowIcon}>📅</Text>
        <Text style={styles.rowText}>选择日期</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => setKeywordOpen(true)}>
        <Text style={styles.rowIcon}>🔍</Text>
        <Text style={styles.rowText}>关键词搜索</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => setMystery(true)}>
        <Text style={styles.rowIcon}>📦</Text>
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
        <Pressable style={styles.mask} onPress={() => setKeywordOpen(false)}>
          <Pressable style={styles.dialog} onPress={() => undefined}>
            <Text style={styles.dialogTitle}>关键词搜索</Text>
            <View style={styles.field}>
              <TextInput
                value={keyword}
                onChangeText={setKeyword}
                placeholder="输入关键词"
                placeholderTextColor={colors.muted}
                style={styles.keyword}
                autoFocus
              />
              <Pressable
                style={styles.go}
                hitSlop={6}
                onPress={() => {
                  const hits = searchCards(keyword);
                  setKeywordOpen(false);
                  start(
                    "keyword",
                    hits.map((card) => card.id),
                    keyword
                  );
                }}
              >
                <Text style={styles.goText}>→</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Tile({ label, count, onPress }: { label: string; count: number; onPress: () => void }) {
  const empty = count === 0;
  return (
    <Pressable style={[styles.tile, empty && styles.disabled]} disabled={empty} onPress={onPress}>
      <Text style={styles.tileTitle}>{label}</Text>
      <Text style={styles.tileSub}>{empty ? "没有 Card" : `${count} 张卡片`}</Text>
      <Text style={styles.tileArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.page },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.md, paddingVertical: 8, backgroundColor: colors.bg },
  back: { fontSize: 24, width: 28, color: colors.ink },
  title: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: colors.ink },
  spacer: { width: 28 },
  continue: {
    margin: space.md,
    marginBottom: 0,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  continueText: { fontSize: 15, color: colors.ink },
  arrow: { color: colors.muted, fontSize: 16 },
  tiles: { flexDirection: "row", gap: 10, paddingHorizontal: space.md, marginTop: space.md },
  tilesTop: { marginTop: space.md },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 16, minHeight: 104 },
  tileTitle: { fontSize: 20, fontWeight: "700", color: colors.ink },
  tileSub: { marginTop: 6, color: colors.muted, fontSize: 12 },
  tileArrow: { marginTop: 12, color: colors.muted, fontSize: 14 },
  disabled: { opacity: 0.45 },
  row: {
    marginHorizontal: space.md,
    marginTop: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  rowIcon: { width: 22, textAlign: "center", fontSize: 14 },
  rowText: { flex: 1, fontSize: 15, color: colors.ink },
  chev: { color: colors.muted, fontSize: 18 },
  mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 24 },
  dialog: { backgroundColor: colors.card, borderRadius: 14, padding: 18, gap: 14 },
  dialogTitle: { fontWeight: "700", fontSize: 16, color: colors.ink },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6
  },
  keyword: { flex: 1, paddingVertical: 10, color: colors.ink, fontSize: 15 },
  go: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.hair, alignItems: "center", justifyContent: "center" },
  goText: { color: colors.ink, fontSize: 14 }
});
