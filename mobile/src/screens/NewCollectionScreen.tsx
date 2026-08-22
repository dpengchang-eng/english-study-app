import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppState } from "../context/AppState";
import type { RootStackParamList } from "../navigation/types";
import { colors, space } from "../theme";

export function NewCollectionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addCollection } = useAppState();
  const [name, setName] = useState("");
  const canSave = name.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>取消</Text>
        </Pressable>
        <Text style={styles.title}>新建生活集</Text>
        <Pressable
          disabled={!canSave}
          onPress={() => {
            const id = addCollection(name);
            navigation.navigate("Home", { collectionId: id });
          }}
        >
          <Text style={[styles.link, !canSave && styles.dim]}>确定</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <View style={styles.card}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="生活集名称"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.page },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.md,
    paddingVertical: 14,
    backgroundColor: colors.page
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  link: { fontSize: 15, color: colors.ink },
  dim: { color: colors.dim },
  body: { padding: space.sm },
  card: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14 },
  input: { paddingVertical: 18, fontSize: 15, color: colors.ink }
});
