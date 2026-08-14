import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, space } from "../theme";
import type { ReviewResult, SavedItem } from "../types";
import { answersMatch, buildCloze } from "../services/srs";
import { speakAmericanEnglish } from "../services/tts";

type Props = {
  item: SavedItem;
  showSchedule: boolean;
  onSchedule?: (result: ReviewResult) => void;
  onNext?: () => void;
};

export function ClozeCard({ item, showSchedule, onSchedule, onNext }: Props) {
  const [draft, setDraft] = useState("");
  const [checked, setChecked] = useState<"idle" | "right" | "wrong">("idle");

  const submit = (): void => {
    setChecked(answersMatch(draft, item.phrase) ? "right" : "wrong");
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>根据句子填空</Text>
      <Text style={styles.cloze}>{buildCloze(item.sentenceContext, item.phrase)}</Text>
      <Pressable onPress={() => void speakAmericanEnglish(item.sentenceContext)}>
        <Text style={styles.link}>播放原句</Text>
      </Pressable>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="输入英文单词或短语"
        placeholderTextColor={colors.muted}
        style={styles.input}
        onSubmitEditing={submit}
      />
      <Pressable style={styles.primary} onPress={submit}>
        <Text style={styles.primaryText}>提交</Text>
      </Pressable>
      {checked === "right" && <Text style={styles.good}>对了。{item.definition}</Text>}
      {checked === "wrong" && (
        <Text style={styles.bad}>
          答案是 “{item.phrase}”。{item.definition}
        </Text>
      )}
      {checked !== "idle" && showSchedule && onSchedule && (
        <View style={styles.row}>
          {([
            ["again", "再来"],
            ["1", "1 天"],
            ["3", "3 天"],
            ["7", "7 天"]
          ] as const).map(([value, label]) => (
            <Pressable
              key={value}
              style={styles.chip}
              onPress={() => {
                onSchedule(value);
                setDraft("");
                setChecked("idle");
              }}
            >
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {checked !== "idle" && !showSchedule && onNext && (
        <Pressable
          style={styles.secondary}
          onPress={() => {
            onNext();
            setDraft("");
            setChecked("idle");
          }}
        >
          <Text style={styles.secondaryText}>下一题</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: space.md
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 8
  },
  cloze: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 30,
    marginBottom: 8
  },
  link: {
    color: colors.accent,
    fontSize: 15,
    marginBottom: 12
  },
  input: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: "#fff",
    marginBottom: 10
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  secondary: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.accentSoft
  },
  secondaryText: {
    color: colors.ink,
    fontWeight: "600"
  },
  good: {
    marginTop: 10,
    color: colors.good
  },
  bad: {
    marginTop: 10,
    color: colors.warn
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  chip: {
    backgroundColor: colors.chip,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipText: {
    color: colors.ink,
    fontWeight: "600"
  }
});
