import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppState } from "../context/AppState";
import type { RootStackParamList } from "../navigation/types";
import { startListening, stopListening, useSpeechEvents } from "../services/stt";
import { INPUT_CHAR_CAP, RECORD_MAX_MS, UNCATEGORIZED_ID, type RewriteRadio, type SourceType } from "../types";
import { colors, space } from "../theme";

export function CreateCardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CreateCard">>();
  const { collections, getCard, createCard, updateCard } = useAppState();
  const existing = route.params?.cardId ? getCard(route.params.cardId) : undefined;
  const [collectionId, setCollectionId] = useState(existing?.collectionId ?? UNCATEGORIZED_ID);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [images, setImages] = useState<string[]>(existing?.images ?? []);
  const [radio, setRadio] = useState<RewriteRadio>(existing?.rewriteRadio ?? 1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [holding, setHolding] = useState(false);
  const sourceTypeRef = useRef<SourceType>("text");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useSpeechEvents({
    onResult: (text) => {
      sourceTypeRef.current = "voice";
      setBody(text.slice(0, INPUT_CHAR_CAP));
    },
    onError: () => setHolding(false),
    onEnd: () => setHolding(false)
  });

  const pickImage = async (from: "camera" | "gallery"): Promise<void> => {
    try {
      const result =
        from === "camera"
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
      if (!result.canceled && result.assets[0]?.uri) {
        setImages((prev) => [...prev, result.assets[0]!.uri]);
      }
    } catch {
      // Expo Go / missing permission — typing still works
    }
  };

  const finish = async (): Promise<void> => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      if (existing) {
        updateCard(existing.id, { collectionId, title, body: text, images, rewriteRadio: radio });
        navigation.goBack();
        return;
      }
      const id = await createCard({ collectionId, title, body: text, images, rewriteRadio: radio });
      navigation.replace("CardDetail", { cardId: id });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.head}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>取消</Text>
        </Pressable>
        <Text style={styles.headTitle}>{existing ? "编辑卡片" : "新增卡片"}</Text>
        <Pressable onPress={() => void finish()} disabled={!body.trim() || busy}>
          {busy ? <ActivityIndicator color={colors.ink} /> : <Text style={[styles.link, !body.trim() && styles.dim]}>完成</Text>}
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.pick} onPress={() => setPickerOpen((open) => !open)}>
          <Text style={styles.pickText}>{collections.find((item) => item.id === collectionId)?.name ?? "生活集"}</Text>
          <Text style={styles.dim}>▾</Text>
        </Pressable>
        {pickerOpen
          ? collections.map((item) => (
              <Pressable
                key={item.id}
                style={styles.option}
                onPress={() => {
                  setCollectionId(item.id);
                  setPickerOpen(false);
                }}
              >
                <Text>{item.name}</Text>
              </Pressable>
            ))
          : null}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="标题（可选）"
          placeholderTextColor={colors.muted}
          style={styles.title}
        />
        <TextInput
          value={body}
          onChangeText={(value) => {
            sourceTypeRef.current = "text";
            setBody(value.slice(0, INPUT_CHAR_CAP));
          }}
          placeholder="记录此刻想说的事……"
          placeholderTextColor={colors.muted}
          multiline
          style={styles.box}
        />
        <View style={styles.thumbs}>
          {images.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.thumb} />
          ))}
        </View>
        <View style={styles.tools}>
          <Pressable onPress={() => void pickImage("camera")}>
            <Text style={styles.tool}>📷</Text>
          </Pressable>
          <Pressable onPress={() => void pickImage("gallery")}>
            <Text style={styles.tool}>🖼</Text>
          </Pressable>
          <Pressable
            onPressIn={() => {
              setHolding(true);
              void startListening("zh-CN").catch(() => setHolding(false));
              if (timerRef.current) clearTimeout(timerRef.current);
              timerRef.current = setTimeout(() => {
                stopListening();
                setHolding(false);
              }, RECORD_MAX_MS);
            }}
            onPressOut={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
              stopListening();
              setHolding(false);
            }}
          >
            <Text style={styles.tool}>{holding ? "●" : "🎤"}</Text>
          </Pressable>
          <Text style={styles.counter}>
            {body.length}/{INPUT_CHAR_CAP}
          </Text>
        </View>
        <View style={styles.radios}>
          {([0, 1, 2] as RewriteRadio[]).map((value) => (
            <Pressable key={value} style={styles.radio} onPress={() => setRadio(value)}>
              <View style={[styles.dot, radio === value && styles.dotOn]} />
              {value === 1 ? <Text style={styles.radioHint}>目标语言</Text> : <View style={styles.radioSpacer} />}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.md, paddingVertical: 10 },
  headTitle: { fontWeight: "800", fontSize: 16, color: colors.ink },
  link: { color: colors.ink, fontWeight: "700" },
  dim: { color: colors.dim },
  body: { padding: space.md, gap: 10, paddingBottom: 40 },
  pick: { flexDirection: "row", justifyContent: "space-between", borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10 },
  pickText: { color: colors.ink },
  option: { paddingVertical: 8, paddingHorizontal: 4 },
  title: { fontSize: 16, color: colors.ink, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, paddingVertical: 8 },
  box: { minHeight: 180, fontSize: 16, color: colors.ink, textAlignVertical: "top" },
  thumbs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: colors.hair },
  tools: { flexDirection: "row", alignItems: "center", gap: 14 },
  tool: { fontSize: 20 },
  counter: { marginLeft: "auto", color: colors.muted, fontSize: 12 },
  radios: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", gap: 28, paddingVertical: 12 },
  radio: { padding: 8, alignItems: "center", gap: 6 },
  radioHint: { fontSize: 11, color: colors.muted },
  radioSpacer: { height: 14 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.ink },
  dotOn: { backgroundColor: colors.ink }
});
