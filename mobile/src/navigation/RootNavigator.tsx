import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ConvertScreen } from "../screens/ConvertScreen";
import { ResultScreen } from "../screens/ResultScreen";
import { WordbookScreen } from "../screens/WordbookScreen";
import { ReviewScreen } from "../screens/ReviewScreen";
import { MeScreen } from "../screens/MeScreen";
import { ClozeScreen } from "../screens/ClozeScreen";
import { useAppState } from "../context/AppState";
import { colors } from "../theme";
import { navigationRef } from "./ref";
import type { ConvertStackParamList, RootStackParamList, RootTabParamList } from "./types";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
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

function ConvertStackNavigator() {
  return (
    <ConvertStack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        contentStyle: { backgroundColor: colors.bg }
      }}
    >
      <ConvertStack.Screen name="ConvertHome" component={ConvertScreen} options={{ title: "转换" }} />
      <ConvertStack.Screen name="Result" component={ResultScreen} options={{ title: "结果" }} />
    </ConvertStack.Navigator>
  );
}

function Tabs() {
  const { dueCount } = useAppState();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.tab, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" }
      }}
    >
      <Tab.Screen name="ConvertTab" component={ConvertStackNavigator} options={{ title: "转换", headerShown: false }} />
      <Tab.Screen name="WordbookTab" component={WordbookScreen} options={{ title: "词本" }} />
      <Tab.Screen
        name="ReviewTab"
        component={ReviewScreen}
        options={{ title: "复习", tabBarBadge: dueCount > 0 ? dueCount : undefined }}
      />
      <Tab.Screen name="MeTab" component={MeScreen} options={{ title: "我的" }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Tabs" component={Tabs} />
        <RootStack.Screen
          name="Cloze"
          component={ClozeScreen}
          options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", headerShown: false }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
