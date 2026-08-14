import { StyleSheet, Text, View } from "react-native";
import type { Sentence } from "../types";
import { colors, space } from "../theme";

export function SentenceList({
  sentences,
  loading
}: {
  sentences: Sentence[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <View style={styles.list}>
        <View style={[styles.bone, styles.boneWide]} />
        <View style={[styles.bone, styles.boneMid]} />
        <View style={[styles.bone, styles.boneShort]} />
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {sentences.map((sentence) => (
        <Text key={sentence.id} style={styles.sentence}>
          {sentence.text}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  sentence: { color: colors.ink, fontSize: 18, lineHeight: 28 },
  bone: { height: 16, borderRadius: 8, backgroundColor: colors.line },
  boneWide: { width: "100%" },
  boneMid: { width: "82%" },
  boneShort: { width: "64%" }
});
