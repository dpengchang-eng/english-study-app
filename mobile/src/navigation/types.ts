import type { MysteryRange, RecallKind } from "../types";

export type RootStackParamList = {
  Home: { collectionId?: string } | undefined;
  CardDetail: { cardId: string };
  CreateCard: { cardId?: string } | undefined;
  Search: { collectionId?: string } | undefined;
  Memories: undefined;
  RecordCalendar: undefined;
  RecallSession: {
    kind: RecallKind;
    cardIds: string[];
    dateKey?: string;
    query?: string;
  };
  MysteryBox: { range: MysteryRange; count: number };
  AiAssistant: undefined;
  Me: undefined;
  NewCollection: undefined;
};
