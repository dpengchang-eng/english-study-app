import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MicButton } from "./MicButton";
import { colors, space } from "../theme";
import { INPUT_CHAR_CAP } from "../types";

export function ComposeCard({
  value,
  onChangeText,
  onConvert,
  convertDisabled,
  convertLabel,
  holding,
  onHoldStart,
  onHoldEnd,
  sttError,
  showMic
}: {
  value: string;
  onChangeText: (text: string) => void;
  onConvert: () => void;
  convertDisabled: boolean;
  convertLabel: string;
  holding: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  sttError: string | null;
  showMic: boolean;
}) {
  return (
    <View style={styles.card}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={showMic ? "先打字，或按住麦克风说进去" : "先打字"}
        placeholderTextColor={colors.muted}
        multiline
        maxLength={INPUT_CHAR_CAP}
        style={styles.box}
      />
      <Text style={styles.counter}>
        {value.length}/{INPUT_CHAR_CAP}
      </Text>
      <View style={styles.row}>
        {showMic ? <MicButton holding={holding} onHoldStart={onHoldStart} onHoldEnd={onHoldEnd} /> : null}
        <Pressable
          style={[styles.convert, !showMic && styles.convertGrow, convertDisabled && styles.convertOff]}
          onPress={onConvert}
          disabled={convertDisabled}
        >
          <Text style={styles.convertText}>{convertLabel}</Text>
        </Pressable>
      </View>
      {sttError ? <Text style={styles.warn}>{sttError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10
  },
  box: {
    minHeight: 120,
    fontSize: 16,
    color: colors.ink,
    textAlignVertical: "top"
  },
  counter: { alignSelf: "flex-end", color: colors.muted, fontSize: 12 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  convert: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 14
  },
  convertGrow: { flex: 1, alignItems: "center" },
  convertOff: { opacity: 0.45 },
  convertText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  warn: { color: colors.warn, fontSize: 13 }
});
