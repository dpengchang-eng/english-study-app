import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppDrawer } from "../components/AppDrawer";
import { FeedCard } from "../components/FeedCard";
import { MysteryBoxModal } from "../components/MysteryBoxModal";
import { useAppState } from "../context/AppState";
import type { RootStackParamList } from "../navigation/types";
import { UNCATEGORIZED_ID } from "../types";
import { colors, space } from "../theme";

export function HomeFeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Home">>();
  const { cards, collections, sortOrder, setSortOrder, deleteCards, moveCards, cardsToday, cardsYesterday } =
    useAppState();
  const collectionId = route.params?.collectionId;
  const [drawer, setDrawer] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [overflowId, setOverflowId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [mystery, setMystery] = useState(false);

  const visible = useMemo(() => {
    const list = collectionId ? cards.filter((card) => card.collectionId === collectionId) : cards;
    return [...list].sort((a, b) => (sortOrder === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
  }, [cards, collectionId, sortOrder]);

  const toggleSelect = (id: string): void => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const goReview = (which: "today" | "yesterday"): void => {
    const list = which === "today" ? cardsToday() : cardsYesterday();
    if (list.length === 0) {
      navigation.navigate("Memories");
      return;
    }
    navigation.navigate("RecallSession", { kind: which, cardIds: list.map((card) => card.id) });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Pressable onPress={() => setDrawer(true)} hitSlop={8}>
          <Text style={styles.icon}>☰</Text>
        </Pressable>
        <Pressable style={styles.titleBtn} onPress={() => setTitleOpen(true)}>
          <Text style={styles.title}>生活集</Text>
          <Text style={styles.chev}>▾</Text>
        </Pressable>
        <View style={styles.right}>
          <Pressable onPress={() => navigation.navigate("AiAssistant")} hitSlop={8}>
            <Text style={styles.icon}>🤖</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Search", { collectionId })} hitSlop={8}>
            <Text style={styles.icon}>⌕</Text>
          </Pressable>
        </View>
      </View>
      {selecting ? (
        <View style={styles.selectBar}>
          <Text style={styles.selectN}>已选 {selected.length}</Text>
          <Pressable onPress={() => setMoveOpen(true)}>
            <Text style={styles.link}>移动到</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              deleteCards(selected);
              setSelected([]);
              setSelecting(false);
            }}
          >
            <Text style={styles.danger}>删除</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setSelecting(false);
              setSelected([]);
            }}
          >
            <Text style={styles.link}>完成</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.chips}>
          <Pressable style={styles.chip} onPress={() => goReview("today")}>
            <Text style={styles.chipText}>回顾今天</Text>
          </Pressable>
          <Pressable style={styles.chip} onPress={() => goReview("yesterday")}>
            <Text style={styles.chipText}>回顾昨天</Text>
          </Pressable>
          <Pressable style={styles.chip} onPress={() => setMystery(true)}>
            <Text style={styles.chipText}>记忆盲盒</Text>
          </Pressable>
        </View>
      )}
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedCard
            card={item}
            selecting={selecting}
            selected={selected.includes(item.id)}
            onPress={() => {
              if (selecting) toggleSelect(item.id);
              else navigation.navigate("CardDetail", { cardId: item.id });
            }}
            onOverflow={() => setOverflowId(item.id)}
          />
        )}
      />
      <Pressable style={styles.fab} onPress={() => navigation.navigate("CreateCard")}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
      <AppDrawer
        visible={drawer}
        onClose={() => setDrawer(false)}
        onAi={() => {
          setDrawer(false);
          navigation.navigate("AiAssistant");
        }}
        onMemories={() => {
          setDrawer(false);
          navigation.navigate("Memories");
        }}
        onSettings={() => {
          setDrawer(false);
          navigation.navigate("Me");
        }}
        onCollection={(id) => {
          setDrawer(false);
          navigation.setParams({ collectionId: id });
        }}
        onNewCollection={() => {
          setDrawer(false);
          navigation.navigate("NewCollection");
        }}
      />
      <Modal transparent visible={titleOpen} animationType="fade" onRequestClose={() => setTitleOpen(false)}>
        <Pressable style={styles.mask} onPress={() => setTitleOpen(false)}>
          <View style={styles.sheet}>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setSelecting(true);
                setTitleOpen(false);
              }}
            >
              <Text style={styles.sheetText}>选择卡片</Text>
            </Pressable>
            <Text style={styles.sheetHint}>排序方式</Text>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setSortOrder("newest");
                setTitleOpen(false);
              }}
            >
              <Text style={styles.sheetText}>创建日期从新到旧</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setSortOrder("oldest");
                setTitleOpen(false);
              }}
            >
              <Text style={styles.sheetText}>创建日期从旧到新</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <Modal transparent visible={Boolean(overflowId)} animationType="fade" onRequestClose={() => setOverflowId(null)}>
        <Pressable style={styles.mask} onPress={() => setOverflowId(null)}>
          <View style={styles.sheet}>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setMoveOpen(true);
              }}
            >
              <Text style={styles.sheetText}>移动到</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                if (overflowId) deleteCards([overflowId]);
                setOverflowId(null);
              }}
            >
              <Text style={styles.danger}>删除</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <Modal transparent visible={moveOpen} animationType="fade" onRequestClose={() => setMoveOpen(false)}>
        <Pressable style={styles.mask} onPress={() => setMoveOpen(false)}>
          <View style={styles.sheet}>
            {collections.map((collection) => (
              <Pressable
                key={collection.id}
                style={styles.sheetItem}
                onPress={() => {
                  const ids = overflowId ? [overflowId] : selected;
                  moveCards(ids, collection.id || UNCATEGORIZED_ID);
                  setMoveOpen(false);
                  setOverflowId(null);
                  setSelecting(false);
                  setSelected([]);
                }}
              >
                <Text style={styles.sheetText}>{collection.name}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
      <MysteryBoxModal
        visible={mystery}
        onClose={() => setMystery(false)}
        onStart={(range, count) => {
          setMystery(false);
          navigation.navigate("MysteryBox", { range, count });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.md, paddingVertical: 8 },
  icon: { fontSize: 20, color: colors.ink, paddingHorizontal: 4 },
  titleBtn: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4 },
  title: { fontSize: 18, fontWeight: "800", color: colors.ink },
  chev: { color: colors.muted },
  right: { flexDirection: "row", gap: 8 },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: space.md, paddingBottom: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, color: colors.ink },
  selectBar: { flexDirection: "row", gap: 12, paddingHorizontal: space.md, paddingBottom: 8, alignItems: "center" },
  selectN: { flex: 1, fontWeight: "700" },
  link: { color: colors.ink, fontWeight: "600" },
  danger: { color: colors.warn, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6
  },
  fabText: { fontSize: 28, color: colors.muted, marginTop: -2 },
  mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 28 },
  sheet: { backgroundColor: colors.card, borderRadius: 12, paddingVertical: 6 },
  sheetItem: { paddingHorizontal: 16, paddingVertical: 14 },
  sheetText: { fontSize: 16, color: colors.ink },
  sheetHint: { paddingHorizontal: 16, paddingTop: 8, color: colors.muted, fontSize: 12 }
});
