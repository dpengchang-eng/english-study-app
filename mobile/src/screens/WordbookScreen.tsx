import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { EmptyHint } from "../components/EmptyHint";
import { useWordbook } from "../context/WordbookState";
import type { TabParamList } from "../navigation/types";
import { colors, space } from "../theme";
import type { WordbookItem } from "../types";

export function WordbookScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { items, deletePhrase } = useWordbook();

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
      {items.map((item) => (
        <Swipeable
          key={item.id}
          overshootRight={false}
          renderRightActions={() => (
            <Pressable style={styles.swipe} onPress={() => void deletePhrase(item.id)}>
              <Text style={styles.swipeText}>删除</Text>
            </Pressable>
          )}
        >
          <WordRow item={item} />
        </Swipeable>
      ))}
    </ScrollView>
  );
}

function WordRow({ item }: { item: WordbookItem }) {
  return (
    <View style={styles.card}>
      <Text style={styles.phrase}>{item.phrase}</Text>
      {item.ipa ? <Text style={styles.ipa}>{item.ipa}</Text> : null}
      <Text style={styles.sense}>{item.senses.join(" · ") || "暂无释义"}</Text>
      <Text style={styles.ctx} numberOfLines={2}>
        {item.sentenceContext}
      </Text>
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
