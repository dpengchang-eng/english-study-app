import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyHint } from "../components/EmptyHint";
import { useWordbook } from "../context/WordbookState";
import { openCloze } from "../navigation/rootNav";
import type { TabParamList } from "../navigation/types";
import { colors, space } from "../theme";

export function ReviewScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { items, dueCount } = useWordbook();

  if (items.length === 0) {
    return (
      <View style={styles.page}>
        <EmptyHint text="先存词" />
        <Pressable style={styles.btn} onPress={() => navigation.navigate("ConvertTab")}>
          <Text style={styles.btnText}>去转换</Text>
        </Pressable>
      </View>
    );
  }

  if (dueCount === 0) {
    return (
      <View style={styles.page}>
        <EmptyHint text="明天再来" />
        <Pressable style={styles.btn} onPress={() => navigation.navigate("WordbookTab")}>
          <Text style={styles.btnText}>去词本</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={styles.count}>待复习 {dueCount} 个</Text>
      <Pressable style={styles.btn} onPress={openCloze}>
        <Text style={styles.btnText}>开始填空</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.md, gap: 12, backgroundColor: colors.bg },
  count: { fontSize: 18, color: colors.ink },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 }
});
