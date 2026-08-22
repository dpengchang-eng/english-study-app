import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AiAssistantScreen } from "../screens/AiAssistantScreen";
import { CardDetailScreen } from "../screens/CardDetailScreen";
import { CreateCardScreen } from "../screens/CreateCardScreen";
import { HomeFeedScreen } from "../screens/HomeFeedScreen";
import { MeScreen } from "../screens/MeScreen";
import { MemoriesScreen } from "../screens/MemoriesScreen";
import { MysteryBoxScreen } from "../screens/MysteryBoxScreen";
import { NewCollectionScreen } from "../screens/NewCollectionScreen";
import { RecallSessionScreen } from "../screens/RecallSessionScreen";
import { RecordCalendarScreen } from "../screens/RecordCalendarScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { colors } from "../theme";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

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
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="Home" component={HomeFeedScreen} />
        <Stack.Screen name="CardDetail" component={CardDetailScreen} />
        <Stack.Screen name="CreateCard" component={CreateCardScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Memories" component={MemoriesScreen} />
        <Stack.Screen name="RecordCalendar" component={RecordCalendarScreen} />
        <Stack.Screen name="RecallSession" component={RecallSessionScreen} />
        <Stack.Screen name="MysteryBox" component={MysteryBoxScreen} />
        <Stack.Screen name="AiAssistant" component={AiAssistantScreen} />
        <Stack.Screen name="Me" component={MeScreen} />
        <Stack.Screen name="NewCollection" component={NewCollectionScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
