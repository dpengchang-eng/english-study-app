import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "../context/AppState";
import { colors, space } from "../theme";
import { BotIcon } from "./BotIcon";
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
  const now = new Date();
  const year = now.getUTCFullYear();
  const recentMonths = [now.getUTCMonth() - 2, now.getUTCMonth() - 1, now.getUTCMonth()].filter(
    (month) => month >= 0
  );

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
              <View style={styles.statEnd}>
                <Text style={styles.statN}>{recordedDays}</Text>
                <Text style={styles.statL}>记录天数</Text>
              </View>
            </View>
            <View style={styles.rule} />
            <DrawerHeatmap dayCounts={dayCounts} year={year} months={recentMonths} />
            <Pressable style={styles.item} onPress={onAi}>
              <BotIcon />
              <Text style={styles.itemText}>AI 助手 Beta</Text>
            </Pressable>
            <Pressable style={styles.item} onPress={onMemories}>
              <Text style={styles.itemIcon}>🤖</Text>
              <Text style={styles.itemText}>回忆</Text>
            </Pressable>
            <Pressable style={styles.section} onPress={() => setFavOpen((open) => !open)}>
              <Text style={styles.chev}>{favOpen ? "⌃" : "⌄"}</Text>
              <Text style={styles.sectionText}>收藏夹</Text>
            </Pressable>
            {favOpen ? <View style={styles.emptyChild} /> : null}
            <View style={[styles.lifeHead, styles.lifeHeadOn]}>
              <Pressable style={styles.lifeTitle} onPress={() => setLifeOpen((open) => !open)}>
                <Text style={styles.chev}>{lifeOpen ? "⌃" : "⌄"}</Text>
                <Text style={styles.sectionText}>生活集</Text>
              </Pressable>
              <Pressable onPress={onNewCollection} hitSlop={8}>
                <Text style={styles.plus}>+</Text>
              </Pressable>
            </View>
            {lifeOpen
              ? collections.map((collection) => (
                  <Pressable
                    key={collection.id}
                    style={styles.child}
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
  stats: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, paddingBottom: 6 },
  stat: { gap: 2, alignItems: "flex-start" },
  statEnd: { gap: 2, alignItems: "flex-end" },
  statN: { fontSize: 24, fontWeight: "800", color: colors.ink },
  statL: { fontSize: 12, color: colors.muted },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  itemIcon: { fontSize: 16, width: 22, textAlign: "center" },
  itemText: { fontSize: 15, color: colors.ink },
  section: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  sectionText: { fontSize: 15, color: colors.ink },
  chev: { color: colors.muted, width: 12, fontSize: 13 },
  emptyChild: { height: 8 },
  lifeHead: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingRight: 4 },
  lifeHeadOn: { backgroundColor: colors.accentSoft },
  lifeTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingLeft: 4 },
  plus: { fontSize: 22, color: colors.ink, paddingHorizontal: 8 },
  child: { paddingVertical: 12, paddingLeft: 26, borderRadius: 8 },
  childText: { fontSize: 15, color: colors.ink }
});
