import { StyleSheet, Text } from "react-native";
import { colors } from "../theme";

export function EmptyHint({ text }: { text: string }) {
  return <Text style={styles.text}>{text}</Text>;
}

const styles = StyleSheet.create({
  text: { color: colors.muted, fontSize: 14 }
});
