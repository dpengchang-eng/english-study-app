import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyHint } from "../components/EmptyHint";
import { ErrorState } from "../components/ErrorState";
import { SentenceList } from "../components/SentenceList";
import { useAppState } from "../context/AppState";
import { auth } from "../firebase";
import type { ConvertStackParamList } from "../navigation/types";
import { colors, space } from "../theme";

export function ResultScreen() {
  const route = useRoute<RouteProp<ConvertStackParamList, "Result">>();
  const navigation = useNavigation<NativeStackNavigationProp<ConvertStackParamList>>();
  const { conversionId } = route.params;
  const { getConversion, convertAgain } = useAppState();
  const conversion = getConversion(conversionId);
  const [copied, setCopied] = useState(false);
  const isAnonymous = !auth.currentUser || auth.currentUser.isAnonymous;

  if (!conversion) {
    return (
      <View style={styles.page}>
        <EmptyHint text="找不到这条转换。" />
      </View>
    );
  }

  const again = (): void => {
    const nextId = convertAgain(conversion.id);
    if (nextId) navigation.replace("Result", { conversionId: nextId });
  };

  const copyAll = async (): Promise<void> => {
    const text =
      conversion.sentences.map((sentence) => sentence.text).filter(Boolean).join("\n") || conversion.outputText || "";
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setCopied(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.source}>{conversion.sourceText}</Text>
      {conversion.status === "loading" ? <SentenceList sentences={[]} loading /> : null}
      {conversion.status === "failed" ? (
        <ErrorState
          errorCode={conversion.errorCode}
          isAnonymous={isAnonymous}
          onRetry={again}
          onGoHome={() => navigation.navigate("Home")}
        />
      ) : null}
      {conversion.status === "ready" ? <SentenceList sentences={conversion.sentences} /> : null}
      {conversion.status === "ready" ? (
        <View style={styles.actions}>
          <Pressable style={styles.btn} onPress={() => void copyAll()}>
            <Text style={styles.btnText}>{copied ? "已复制" : "复制全部"}</Text>
          </Pressable>
          <Pressable style={styles.ghost} onPress={again}>
            <Text style={styles.ghostText}>再转一次</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.md, paddingBottom: 40, gap: 16, backgroundColor: colors.bg, flexGrow: 1 },
  source: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  actions: { flexDirection: "row", gap: 8 },
  btn: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  btnText: { color: "#fff", fontWeight: "700" },
  ghost: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.accentSoft },
  ghostText: { color: colors.ink, fontWeight: "700" }
});
