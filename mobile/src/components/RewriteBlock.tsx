import { useState, type ReactNode } from "react";
import * as Clipboard from "expo-clipboard";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { blanksForSentence, tokenize } from "../services/cloze";
import { speakEnglish } from "../services/tts";
import { colors } from "../theme";
import type { Blank, Sentence } from "../types";
import type { PracticeMode } from "./PracticeToolbar";

export type BlankDraft = Record<string, { value: string; wrong: boolean; solved: boolean }>;

export type MenuTarget =
  | { kind: "word"; sentenceId: string; start: number; end: number; word: string; x: number; y: number }
  | { kind: "blank"; blank: Blank; x: number; y: number };

export function RewriteBlock({
  sentences,
  blanks,
  mode,
  hidden,
  drafts,
  filledGreen,
  onDraftChange,
  onCheck,
  onMenu,
  hideMenu,
  activeBlankId,
  onActivateBlank
}: {
  sentences: Sentence[];
  blanks: Blank[];
  mode: PracticeMode;
  hidden: boolean;
  drafts: BlankDraft;
  filledGreen: Record<string, boolean>;
  onDraftChange: (blankId: string, value: string) => void;
  onCheck: (blankId: string) => void;
  onMenu: (target: MenuTarget) => void;
  hideMenu: () => void;
  activeBlankId?: string | null;
  onActivateBlank?: (blankId: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  if (hidden || mode === "dictation") {
    return (
      <View style={styles.block}>
        <Text style={styles.hidden}>内容已隐藏，点 👁 显示，或用 🎧 听写。</Text>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      {sentences.map((sentence) => (
        <SentenceLine
          key={sentence.id}
          sentence={sentence}
          blanks={blanksForSentence(blanks, sentence.id)}
          mode={mode}
          drafts={drafts}
          filledGreen={filledGreen}
          onDraftChange={onDraftChange}
          onCheck={onCheck}
          onMenu={onMenu}
          hideMenu={hideMenu}
          activeBlankId={activeBlankId}
          onActivateBlank={onActivateBlank}
        />
      ))}
      <Pressable
        style={styles.copy}
        onPress={() => {
          void Clipboard.setStringAsync(sentences.map((sentence) => sentence.text).join("\n")).then(() => setCopied(true));
        }}
      >
        <Text style={styles.copyText}>{copied ? "已复制" : "⧉"}</Text>
      </Pressable>
    </View>
  );
}

function SentenceLine({
  sentence,
  blanks,
  mode,
  drafts,
  filledGreen,
  onDraftChange,
  onCheck,
  onMenu,
  hideMenu,
  activeBlankId,
  onActivateBlank
}: {
  sentence: Sentence;
  blanks: Blank[];
  mode: PracticeMode;
  drafts: BlankDraft;
  filledGreen: Record<string, boolean>;
  onDraftChange: (blankId: string, value: string) => void;
  onCheck: (blankId: string) => void;
  onMenu: (target: MenuTarget) => void;
  hideMenu: () => void;
  activeBlankId?: string | null;
  onActivateBlank?: (blankId: string) => void;
}) {
  const tokens = tokenize(sentence.text);
        const nodes: ReactNode[] = [];
  let cursor = 0;
  tokens.forEach((token, index) => {
    if (token.start > cursor) {
      nodes.push(
        <Text key={`${sentence.id}-sp${index}`} style={styles.word}>
          {sentence.text.slice(cursor, token.start)}
        </Text>
      );
    }
    const blank = blanks.find((item) => item.start === token.start && item.end === token.end);
    if (blank) {
      nodes.push(
        <BlankView
          key={`${blank.id}-${index}`}
          blank={blank}
          mode={mode}
          draft={drafts[blank.id]}
          green={Boolean(filledGreen[blank.id])}
          onDraftChange={onDraftChange}
          onCheck={onCheck}
          onMenu={onMenu}
          active={activeBlankId === blank.id}
          onActivateBlank={onActivateBlank}
        />
      );
    } else if (!token.isWord) {
      nodes.push(
        <Text key={`${sentence.id}-p${index}`} style={styles.word}>
          {token.surface}
        </Text>
      );
    } else {
      nodes.push(
        <Text
          key={`${sentence.id}-w${index}`}
          style={styles.word}
          onLongPress={(event) => {
            onMenu({
              kind: "word",
              sentenceId: sentence.id,
              start: token.start,
              end: token.end,
              word: token.surface,
              x: event.nativeEvent.pageX,
              y: event.nativeEvent.pageY
            });
          }}
          onPress={hideMenu}
        >
          {token.surface}
        </Text>
      );
    }
    cursor = token.end;
  });
  if (cursor < sentence.text.length) {
    nodes.push(
      <Text key={`${sentence.id}-tail`} style={styles.word}>
        {sentence.text.slice(cursor)}
      </Text>
    );
  }
  return (
    <View style={styles.line}>
      <View style={styles.lineText}>{nodes}</View>
      <Pressable onPress={() => speakEnglish(sentence.text)} hitSlop={8} style={styles.play}>
        <Text style={styles.playText}>▶</Text>
      </Pressable>
    </View>
  );
}

function BlankView({
  blank,
  mode,
  draft,
  green,
  onDraftChange,
  onCheck,
  onMenu,
  active,
  onActivateBlank
}: {
  blank: Blank;
  mode: PracticeMode;
  draft?: { value: string; wrong: boolean; solved: boolean };
  green: boolean;
  onDraftChange: (blankId: string, value: string) => void;
  onCheck: (blankId: string) => void;
  onMenu: (target: MenuTarget) => void;
  active?: boolean;
  onActivateBlank?: (blankId: string) => void;
}) {
  const filling = mode === "fill";
  const solved = Boolean(draft?.solved || green);
  const wrong = Boolean(draft?.wrong) && !solved;
  const shown = solved ? blank.answer : filling ? (draft?.value ?? "") : "";

  if (filling) {
    return (
      <View style={styles.inline}>
        <View style={[styles.inputWrap, wrong && styles.inputWrong, solved && styles.inputGood]}>
          <TextInput
            value={shown}
            onChangeText={(value) => onDraftChange(blank.id, value)}
            style={[styles.input, solved && styles.goodText]}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!solved}
          />
          <Pressable onPress={() => onCheck(blank.id)} hitSlop={6} style={styles.check}>
            <Text style={styles.checkText}>✓</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (solved) {
    return <Text style={styles.greenWord}>{blank.answer}</Text>;
  }

  return (
    <Text
      onPress={() => onActivateBlank?.(blank.id)}
      onLongPress={(event) => {
        onMenu({
          kind: "blank",
          blank,
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY
        });
      }}
      style={[styles.yellow, active && styles.yellowActive]}
    >
      {"        "}
    </Text>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10, paddingBottom: 8 },
  hidden: { color: colors.muted, fontSize: 15, lineHeight: 24 },
  line: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  lineText: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  word: { fontSize: 16, lineHeight: 26, color: colors.ink },
  play: { paddingTop: 4 },
  playText: { color: colors.dim, fontSize: 12 },
  copy: { alignSelf: "flex-end" },
  copyText: { color: colors.muted, fontSize: 14 },
  inline: { transform: [{ translateY: 4 }] },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.blank,
    borderRadius: 6,
    minWidth: 72,
    paddingHorizontal: 4,
    height: 26
  },
  inputWrong: { backgroundColor: colors.blankWrong },
  inputGood: { backgroundColor: colors.goodFill },
  input: {
    minWidth: 48,
    paddingVertical: 0,
    paddingHorizontal: 4,
    fontSize: 16,
    color: colors.ink,
    textDecorationLine: "underline"
  },
  goodText: { color: colors.good, textDecorationLine: "none", fontWeight: "700" },
  check: { paddingHorizontal: 4 },
  checkText: { color: "#2B6CB0", fontWeight: "800" },
  yellow: {
    backgroundColor: colors.blank,
    borderRadius: 4,
    overflow: "hidden",
    fontSize: 16,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: "#D4C04A"
  },
  yellowActive: { borderWidth: 2, borderColor: colors.ink },
  greenWord: {
    backgroundColor: colors.goodFill,
    color: colors.good,
    fontWeight: "800",
    fontSize: 16,
    lineHeight: 26,
    textDecorationLine: "underline",
    overflow: "hidden",
    borderRadius: 3
  }
});
