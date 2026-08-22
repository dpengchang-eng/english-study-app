import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStateProvider, useAppState } from "./src/context/AppState";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { colors } from "./src/theme";

function Gate() {
  const { ready, signedIn, signInDemo } = useAppState();
  if (!ready) {
    return (
      <View style={styles.center}>
        <Text style={styles.brand}>地道</Text>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }
  if (!signedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.brand}>地道</Text>
        <Text style={styles.hint}>已退出演示账号</Text>
        <Pressable style={styles.btn} onPress={signInDemo}>
          <Text style={styles.btnText}>进入演示</Text>
        </Pressable>
      </View>
    );
  }
  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AppStateProvider>
          <StatusBar style="dark" />
          <Gate />
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.bg },
  brand: { fontSize: 32, fontWeight: "800", color: colors.ink },
  hint: { color: colors.muted },
  btn: { backgroundColor: colors.ink, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  btnText: { color: "#fff", fontWeight: "700" }
});
