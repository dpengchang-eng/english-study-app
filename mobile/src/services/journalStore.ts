import AsyncStorage from "@react-native-async-storage/async-storage";
import { SEED_CARDS, SEED_COLLECTIONS } from "../data/seed";
import type {
  ChatMessage,
  ChatReplyMode,
  Collection,
  JournalCard,
  LanguageSettings,
  RecallSession,
  SortOrder
} from "../types";

const KEY = "didao-journal-v2";

export type PersistedJournal = {
  cards: JournalCard[];
  collections: Collection[];
  settings: LanguageSettings;
  sortOrder: SortOrder;
  chats: ChatMessage[];
  replyMode: ChatReplyMode;
  lastSession: RecallSession | null;
  signedIn: boolean;
};

export const DEFAULT_SETTINGS: LanguageSettings = {
  uiLang: "zh-Hans",
  learnLang: "en",
  difficulty: "advanced",
  voice: "Andrew (English US)",
  multilingualStt: true
};

export function emptyJournal(): PersistedJournal {
  return {
    cards: SEED_CARDS,
    collections: SEED_COLLECTIONS,
    settings: DEFAULT_SETTINGS,
    sortOrder: "newest",
    chats: [],
    replyMode: "rewrite",
    lastSession: null,
    signedIn: true
  };
}

export async function loadJournal(): Promise<PersistedJournal> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyJournal();
    const parsed = JSON.parse(raw) as PersistedJournal;
    if (!Array.isArray(parsed.cards) || !Array.isArray(parsed.collections)) return emptyJournal();
    return {
      ...emptyJournal(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      cards: parsed.cards,
      collections: parsed.collections.length > 0 ? parsed.collections : SEED_COLLECTIONS
    };
  } catch {
    return emptyJournal();
  }
}

export async function saveJournal(state: PersistedJournal): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}
