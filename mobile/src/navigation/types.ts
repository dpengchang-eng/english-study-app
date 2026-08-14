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
  Tabs: undefined;
  Lookup: {
    tokens: Token[];
    sentenceTokens?: Token[];
    sentenceText: string;
    conversionId: string;
  };
  Cloze: undefined;
};

export type LookupParams = RootStackParamList["Lookup"];
