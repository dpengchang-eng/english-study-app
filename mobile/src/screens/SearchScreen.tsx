import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FeedCard } from "../components/FeedCard";
import { useAppState } from "../context/AppState";
import type { RootStackParamList } from "../navigation/types";
import { colors, space } from "../theme";

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Search">>();
  const { collections, searchCards } = useAppState();
  const [query, setQuery] = useState("");
  const [collectionId, setCollectionId] = useState(route.params?.collectionId);
  const results = useMemo(() => searchCards(query, collectionId), [collectionId, query, searchCards]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜索原文、AI 改写和学过的表达"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>
      <View style={styles.filters}>
        <Pressable style={[styles.filter, !collectionId && styles.filterOn]} onPress={() => setCollectionId(undefined)}>
          <Text style={styles.filterText}>全部</Text>
        </Pressable>
        {collections.map((collection) => (
          <Pressable
            key={collection.id}
            style={[styles.filter, collectionId === collection.id && styles.filterOn]}
            onPress={() => setCollectionId(collection.id)}
          >
            <Text style={styles.filterText}>{collection.name}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedCard
            card={item}
            onPress={() => navigation.navigate("CardDetail", { cardId: item.id })}
            onOverflow={() => undefined}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.md, gap: 8 },
  back: { fontSize: 24, color: colors.ink },
  input: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: space.md },
  filter: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  filterOn: { backgroundColor: colors.accentSoft },
  filterText: { fontSize: 13, color: colors.ink }
});
