import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraIcon } from "../components/CameraIcon";
import { ImageIcon } from "../components/ImageIcon";
import { MicIcon } from "../components/MicIcon";
import { Toast } from "../components/Toast";
import { useAppState } from "../context/AppState";
import type { RootStackParamList } from "../navigation/types";
import { rewriteJournal } from "../services/rewrite";
import { startListening, stopListening, useSpeechEvents } from "../services/stt";
import { INPUT_CHAR_CAP, RECORD_MAX_MS, UNCATEGORIZED_ID, type RewriteRadio, type SourceType } from "../types";
import { colors, space } from "../theme";

const RADIO_LABEL: Record<RewriteRadio, string> = {
  0: "保留原文",
  1: "目标语言",
  2: "改写+回复"
};

const RADIO_HINT: Record<RewriteRadio, string> = {
  0: "完成时只保留原文",
  1: "完成时改写成目标语言",
  2: "完成时改写并加上回复"
};

function pickWebImage(camera: boolean): Promise<string | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (camera) input.setAttribute("capture", "environment");
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ? URL.createObjectURL(file) : null);
    };
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}

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
  const [hint, setHint] = useState<string | null>(null);
  const sourceTypeRef = useRef<SourceType>("text");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHint = (text: string): void => {
    setHint(text);
    setTimeout(() => setHint((current) => (current === text ? null : current)), 2600);
  };

  useSpeechEvents({
    onResult: (text) => {
      sourceTypeRef.current = "voice";
      setBody(text.slice(0, INPUT_CHAR_CAP));
    },
    onError: (message) => {
      setHolding(false);
      showHint(message);
    },
    onEnd: () => setHolding(false)
  });

  const addPhoto = async (from: "camera" | "gallery"): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        const uri = await pickWebImage(from === "camera");
        if (uri) setImages((prev) => [...prev, uri]);
        return;
      }
      if (from === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          showHint("没有相机权限，请用相册或打字。");
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showHint("没有相册权限，请打字。");
          return;
        }
      }
      const result =
        from === "camera"
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
      if (!result.canceled && result.assets[0]?.uri) {
        setImages((prev) => [...prev, result.assets[0]!.uri]);
      }
    } catch {
      showHint(from === "camera" ? "这台设备打不开相机，请用相册或打字。" : "这台设备打不开相册，请打字。");
    }
  };

  const startMic = async (): Promise<void> => {
    setHolding(true);
    try {
      await startListening("zh-CN");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        stopListening();
        setHolding(false);
      }, RECORD_MAX_MS);
    } catch (error) {
      setHolding(false);
      showHint(error instanceof Error ? error.message : "语音识别不可用，请改用打字。");
    }
  };

  const stopMic = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    stopListening();
    setHolding(false);
  };

  const finish = async (): Promise<void> => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      if (existing) {
        const rewritten = await rewriteJournal(text, radio);
        updateCard(existing.id, {
          collectionId,
          title,
          body: text,
          images,
          rewriteRadio: radio,
          rewrite: rewritten.rewrite,
          sentences: rewritten.sentences,
          reply: rewritten.reply
        });
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
            <Pressable key={uri} onPress={() => setImages((prev) => prev.filter((item) => item !== uri))}>
              <Image source={{ uri }} style={styles.thumb} />
            </Pressable>
          ))}
        </View>
        <View style={styles.tools}>
          <Pressable onPress={() => void addPhoto("camera")} hitSlop={8} accessibilityRole="button" accessibilityLabel="相机">
            <CameraIcon />
          </Pressable>
          <Pressable onPress={() => void addPhoto("gallery")} hitSlop={8} accessibilityRole="button" accessibilityLabel="相册">
            <ImageIcon />
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS === "web") {
                if (holding) stopMic();
                else void startMic();
              }
            }}
            onPressIn={() => {
              if (Platform.OS !== "web") void startMic();
            }}
            onPressOut={() => {
              if (Platform.OS !== "web") stopMic();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="语音"
          >
            <MicIcon color={holding ? colors.warn : colors.ink} />
          </Pressable>
          <Text style={styles.counter}>
            {body.length}/{INPUT_CHAR_CAP}
          </Text>
        </View>
        <View style={styles.radios}>
          {([0, 1, 2] as RewriteRadio[]).map((value) => (
            <Pressable
              key={value}
              style={styles.radio}
              onPress={() => {
                setRadio(value);
                showHint(RADIO_HINT[value]);
              }}
            >
              <View style={styles.radioOuter}>{radio === value ? <View style={styles.radioInner} /> : null}</View>
              <Text style={styles.radioHint}>{RADIO_LABEL[value]}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Toast text={hint} />
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
  tools: { flexDirection: "row", alignItems: "center", gap: 16 },
  counter: { marginLeft: "auto", color: colors.muted, fontSize: 12 },
  radios: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", gap: 28, paddingVertical: 12 },
  radio: { padding: 8, alignItems: "center", gap: 6 },
  radioHint: { fontSize: 11, color: colors.muted, textAlign: "center" },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.6,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center"
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink }
});
