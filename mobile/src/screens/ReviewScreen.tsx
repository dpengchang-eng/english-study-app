import { Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyHint } from "../components/EmptyHint";
import { useWordbook } from "../context/WordbookState";
import { openCloze } from "../navigation/rootNav";
import { colors, space } from "../theme";

export function ReviewScreen() {
  const { items, dueCount } = useWordbook();
  return (
    <View style={styles.page}>
      <Text style={styles.count}>今天待复习 {dueCount} 个</Text>
      {items.length === 0 ? <EmptyHint text="词本空着。先去转换一句话，点单词存进词本。" /> : null}
      <Pressable style={[styles.btn, dueCount === 0 && styles.off]} onPress={openCloze} disabled={dueCount === 0}>
        <Text style={styles.btnText}>开始填空</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: space.md, gap: 12, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  count: { fontSize: 18, color: colors.ink },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  off: { opacity: 0.45 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 }
});
