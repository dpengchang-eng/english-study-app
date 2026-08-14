import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "../screens/HomeScreen";
import { ResultScreen } from "../screens/ResultScreen";
import { colors } from "../theme";
import type { ConvertStackParamList } from "./types";

const ConvertStack = createNativeStackNavigator<ConvertStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.ink,
    border: colors.line,
    primary: colors.accent
  }
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <ConvertStack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          contentStyle: { backgroundColor: colors.bg }
        }}
      >
        <ConvertStack.Screen name="Home" component={HomeScreen} options={{ title: "地道" }} />
        <ConvertStack.Screen name="Result" component={ResultScreen} options={{ title: "结果" }} />
      </ConvertStack.Navigator>
    </NavigationContainer>
  );
}
