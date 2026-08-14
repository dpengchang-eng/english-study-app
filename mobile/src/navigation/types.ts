import type { ClozeMode } from "../types";

export type ConvertStackParamList = {
  ConvertHome: undefined;
  Result: { conversionId: string };
};

export type RootTabParamList = {
  ConvertTab: undefined;
  WordbookTab: undefined;
  ReviewTab: undefined;
  MeTab: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  Cloze: { itemIds: string[]; mode: ClozeMode };
};
