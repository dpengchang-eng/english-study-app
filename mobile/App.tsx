import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "./src/firebase";
import { AppStateProvider } from "./src/context/AppState";
import { AuthProvider, profileFromUser, type AuthProfile } from "./src/context/AuthState";
import { WordbookProvider } from "./src/context/WordbookState";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { colors } from "./src/theme";

export default function App() {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setProfile(profileFromUser(user));
        return;
      }
      // Only create an anonymous user when none is stored. Never sign in again
      // after Google link — that would mint a new uid and hide the wordbook.
      void signInAnonymously(auth).catch(() => {
        setBootError("匿名登录失败。请检查网络后重启应用。");
      });
    });
    return unsub;
  }, []);

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.brand}>地道</Text>
        {bootError ? <Text style={styles.error}>{bootError}</Text> : <ActivityIndicator color={colors.accent} />}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AuthProvider value={profile} setValue={setProfile}>
          <AppStateProvider uid={profile.uid}>
            <WordbookProvider uid={profile.uid} linked={!profile.isAnonymous}>
              <StatusBar style="dark" />
              <RootNavigator />
            </WordbookProvider>
          </AppStateProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.bg },
  brand: { fontSize: 32, fontWeight: "800", color: colors.ink },
  error: { color: colors.warn, textAlign: "center", paddingHorizontal: 24 }
});
