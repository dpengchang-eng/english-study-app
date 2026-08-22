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
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="生活集名称"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoFocus
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.md, paddingVertical: 12 },
  title: { fontSize: 16, fontWeight: "800", color: colors.ink },
  link: { fontSize: 16, color: colors.ink, fontWeight: "600" },
  dim: { color: colors.dim },
  body: { padding: space.md },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: colors.ink }
});
