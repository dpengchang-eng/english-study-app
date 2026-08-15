import type { Ref } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { HOME_INPUT_PLACEHOLDER, HOME_SEND_ACTION } from "../services/homeChat";
import { colors, space } from "../theme";
import { INPUT_CHAR_CAP } from "../types";

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  sendDisabled,
  inputRef
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sendDisabled: boolean;
  inputRef?: Ref<TextInput>;
}) {
  return (
    <View style={styles.bar}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={HOME_INPUT_PLACEHOLDER}
        placeholderTextColor={colors.muted}
        multiline
        maxLength={INPUT_CHAR_CAP}
        style={styles.box}
      />
      <Pressable style={[styles.send, sendDisabled && styles.sendOff]} onPress={onSend} disabled={sendDisabled}>
        <Text style={styles.sendText}>{HOME_SEND_ACTION}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg
  },
  box: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 16,
    color: colors.ink,
    textAlignVertical: "top",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center"
  },
  sendOff: { opacity: 0.45 },
  sendText: { color: "#fff", fontWeight: "700", fontSize: 16 }
});
