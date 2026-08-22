import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "../context/AppState";
import { UNCATEGORIZED_ID } from "../types";
import { colors, space } from "../theme";
import { DrawerHeatmap } from "./Heatmap";

export function AppDrawer({
  visible,
  onClose,
  onAi,
  onMemories,
  onSettings,
  onCollection,
  onNewCollection
}: {
  visible: boolean;
  onClose: () => void;
  onAi: () => void;
  onMemories: () => void;
  onSettings: () => void;
  onCollection: (id: string) => void;
  onNewCollection: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { user, cards, collections, recordedDays, dayCounts } = useAppState();
  const [favOpen, setFavOpen] = useState(false);
  const [lifeOpen, setLifeOpen] = useState(true);
  const year = 2026;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.mask}>
        <View style={[styles.panel, { paddingTop: insets.top + 8 }]}>
          <ScrollView contentContainerStyle={styles.inner}>
            <View style={styles.profile}>
              <View style={styles.avatar} />
              <View style={styles.who}>
                <View style={styles.idRow}>
                  <Text style={styles.uid}>{user.id}</Text>
                  {user.isPro ? (
                    <View style={styles.pro}>
                      <Text style={styles.proText}>PRO</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Pressable onPress={onSettings} hitSlop={8}>
                <Text style={styles.gear}>⚙</Text>
              </Pressable>
            </View>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statN}>{cards.length}</Text>
                <Text style={styles.statL}>卡片</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statN}>{recordedDays}</Text>
                <Text style={styles.statL}>记录天数</Text>
              </View>
            </View>
            <DrawerHeatmap dayCounts={dayCounts} year={year} months={[5, 6, 7]} />
            <Pressable style={styles.item} onPress={onAi}>
              <Text style={styles.itemIcon}>🤖</Text>
              <Text style={styles.itemText}>AI 助手 Beta</Text>
            </Pressable>
            <Pressable style={styles.item} onPress={onMemories}>
              <Text style={styles.itemIcon}>☻</Text>
              <Text style={styles.itemText}>回忆</Text>
            </Pressable>
            <Pressable style={styles.section} onPress={() => setFavOpen((open) => !open)}>
              <Text style={styles.sectionText}>收藏夹</Text>
              <Text style={styles.chev}>{favOpen ? "∧" : "∨"}</Text>
            </Pressable>
            {favOpen ? <Text style={styles.emptyChild}> </Text> : null}
            <View style={styles.lifeHead}>
              <Pressable style={styles.lifeTitle} onPress={() => setLifeOpen((open) => !open)}>
                <Text style={styles.sectionText}>生活集</Text>
                <Text style={styles.chev}>{lifeOpen ? "∧" : "∨"}</Text>
              </Pressable>
              <Pressable onPress={onNewCollection} hitSlop={8}>
                <Text style={styles.plus}>+</Text>
              </Pressable>
            </View>
            {lifeOpen
              ? collections.map((collection) => (
                  <Pressable
                    key={collection.id}
                    style={[styles.child, collection.id === UNCATEGORIZED_ID && styles.childOn]}
                    onPress={() => onCollection(collection.id)}
                  >
                    <Text style={styles.childText}>{collection.name}</Text>
                  </Pressable>
                ))
              : null}
          </ScrollView>
        </View>
        <Pressable style={styles.rest} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: { flex: 1, flexDirection: "row", backgroundColor: colors.overlay },
  panel: { width: "82%", backgroundColor: colors.card },
  rest: { flex: 1 },
  inner: { padding: space.md, paddingBottom: 40, gap: 10 },
  profile: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.hair },
  who: { flex: 1 },
  idRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  uid: { fontSize: 16, fontWeight: "800", color: colors.ink },
  pro: { backgroundColor: colors.pro, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  proText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  gear: { fontSize: 20, color: colors.ink },
  stats: { flexDirection: "row", gap: 28, paddingVertical: 6 },
  stat: { gap: 2 },
  statN: { fontSize: 22, fontWeight: "800", color: colors.ink },
  statL: { fontSize: 12, color: colors.muted },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  itemIcon: { fontSize: 16, width: 22, textAlign: "center" },
  itemText: { fontSize: 15, color: colors.ink },
  section: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  sectionText: { fontSize: 15, color: colors.ink, fontWeight: "600" },
  chev: { color: colors.muted },
  emptyChild: { height: 4 },
  lifeHead: { flexDirection: "row", alignItems: "center" },
  lifeTitle: { flex: 1, flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  plus: { fontSize: 22, color: colors.ink, paddingHorizontal: 8 },
  child: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
  childOn: { backgroundColor: colors.accentSoft },
  childText: { fontSize: 15, color: colors.ink }
});
