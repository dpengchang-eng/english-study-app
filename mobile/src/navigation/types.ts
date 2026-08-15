import type { NavigatorScreenParams } from "@react-navigation/native";
import type { Token } from "../types";

export type ConvertStackParamList = {
  Home: undefined;
  Result: { conversionId: string };
};

export type TabParamList = {
  ConvertTab: undefined;
  WordbookTab: undefined;
  ReviewTab: undefined;
  MeTab: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Lookup: {
    tokens: Token[];
    sentenceTokens?: Token[];
    sentenceText: string;
    conversionId: string;
    sentenceId?: string;
  };
  Cloze: { itemIds?: string[] };
};

export type LookupParams = RootStackParamList["Lookup"];
