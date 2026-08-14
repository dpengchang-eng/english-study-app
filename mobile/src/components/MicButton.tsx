import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme";

export function MicButton({
  holding,
  disabled,
  onHoldStart,
  onHoldEnd
}: {
  holding: boolean;
  disabled?: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}) {
  return (
    <Pressable
      style={[styles.btn, holding && styles.hold, disabled && styles.off]}
      onPressIn={onHoldStart}
      onPressOut={onHoldEnd}
      disabled={disabled}
    >
      <Text style={styles.text}>{holding ? "松开填入" : "按住说话"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center"
  },
  hold: { backgroundColor: "#E8B89A" },
  off: { opacity: 0.45 },
  text: { color: colors.ink, fontWeight: "700" }
});
