import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "../screens/HomeScreen";
import { ResultScreen } from "../screens/ResultScreen";
import { WordbookScreen } from "../screens/WordbookScreen";
import { ReviewScreen } from "../screens/ReviewScreen";
import { MeScreen } from "../screens/MeScreen";
import { LookupScreen } from "../screens/LookupScreen";
import { ClozeScreen } from "../screens/ClozeScreen";
import { useWordbook } from "../context/WordbookState";
import { colors } from "../theme";
import { flushRootNav, rootNav } from "./rootNav";
import type { ConvertStackParamList, RootStackParamList, TabParamList } from "./types";

const ConvertStack = createNativeStackNavigator<ConvertStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

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

const screenStyle = {
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.ink,
  contentStyle: { backgroundColor: colors.bg }
} as const;

function ConvertNavigator() {
  return (
    <ConvertStack.Navigator screenOptions={screenStyle}>
      <ConvertStack.Screen name="Home" component={HomeScreen} options={{ title: "地道" }} />
      <ConvertStack.Screen name="Result" component={ResultScreen} options={{ title: "结果" }} />
    </ConvertStack.Navigator>
  );
}

function TabNavigator() {
  const { dueCount } = useWordbook();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.tab, borderTopColor: colors.line }
      }}
    >
      <Tabs.Screen name="ConvertTab" component={ConvertNavigator} options={{ title: "转换" }} />
      <Tabs.Screen name="WordbookTab" component={WordbookScreen} options={{ title: "词本", headerShown: true }} />
      <Tabs.Screen
        name="ReviewTab"
        component={ReviewScreen}
        options={{ title: "复习", headerShown: true, tabBarBadge: dueCount > 0 ? dueCount : undefined }}
      />
      <Tabs.Screen name="MeTab" component={MeScreen} options={{ title: "我的", headerShown: true }} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer ref={rootNav} theme={theme} onReady={flushRootNav}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Tabs" component={TabNavigator} />
        <RootStack.Screen
          name="Lookup"
          component={LookupScreen}
          options={{
            presentation: "formSheet",
            headerShown: false,
            sheetAllowedDetents: [0.65],
            sheetGrabberVisible: true
          }}
        />
        <RootStack.Screen
          name="Cloze"
          component={ClozeScreen}
          options={{ presentation: "fullScreenModal", headerShown: true, title: "填空" }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
