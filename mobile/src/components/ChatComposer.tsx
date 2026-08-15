import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, space } from "../theme";
import { INPUT_CHAR_CAP } from "../types";

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  sendDisabled,
  sendLabel
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sendDisabled: boolean;
  sendLabel: string;
}) {
  return (
    <View style={styles.bar}>
      <View style={styles.field}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="输入中文或英文"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={INPUT_CHAR_CAP}
          style={styles.box}
        />
        <Text style={styles.counter}>
          {value.length}/{INPUT_CHAR_CAP}
        </Text>
      </View>
      <Pressable style={[styles.send, sendDisabled && styles.sendOff]} onPress={onSend} disabled={sendDisabled}>
        <Text style={styles.sendText}>{sendLabel}</Text>
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
  field: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6
  },
  box: {
    minHeight: 40,
    maxHeight: 120,
    fontSize: 16,
    color: colors.ink,
    textAlignVertical: "top"
  },
  counter: { alignSelf: "flex-end", color: colors.muted, fontSize: 11 },
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
