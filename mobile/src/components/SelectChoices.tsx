import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function SelectChoices({
  options,
  onPick
}: {
  options: [string, string];
  onPick: (value: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => (
        <Pressable key={option} style={styles.chip} onPress={() => onPick(option)}>
          <Text style={styles.text}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10
  },
  chip: {
    flex: 1,
    backgroundColor: "#EFEFEF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  text: { fontSize: 15, color: colors.ink }
});
