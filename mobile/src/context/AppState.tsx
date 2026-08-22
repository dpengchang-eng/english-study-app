import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as Crypto from "expo-crypto";
import { DEMO_USER } from "../data/seed";
import { titleFromBody } from "../services/mockRewrite";
import { rewriteJournal } from "../services/rewrite";
import { emptyJournal, loadJournal, saveJournal, type PersistedJournal } from "../services/journalStore";
import { dateKey, inRange, todayKey, yesterdayKey } from "../services/dates";
import { UNCATEGORIZED_ID, type Blank, type ChatMessage, type ChatReplyMode, type Collection, type DemoUser, type JournalCard, type LanguageSettings, type MysteryRange, type RecallSession, type RewriteRadio, type SortOrder } from "../types";

type AppStateValue = {
  ready: boolean;
  signedIn: boolean;
  user: DemoUser;
  cards: JournalCard[];
  collections: Collection[];
  settings: LanguageSettings;
  sortOrder: SortOrder;
  chats: ChatMessage[];
  replyMode: ChatReplyMode;
  lastSession: RecallSession | null;
  online: boolean;
  signInDemo: () => void;
  signOut: () => void;
  setSortOrder: (order: SortOrder) => void;
  saveSettings: (settings: LanguageSettings) => void;
  addCollection: (name: string) => string;
  getCard: (id: string) => JournalCard | undefined;
  createCard: (input: {
    collectionId: string;
    title: string;
    body: string;
    images: string[];
    rewriteRadio: RewriteRadio;
  }) => Promise<string>;
  updateCard: (id: string, patch: Partial<JournalCard>) => void;
  deleteCards: (ids: string[]) => void;
  moveCards: (ids: string[], collectionId: string) => void;
  setBlanks: (cardId: string, blanks: Blank[]) => void;
  cardsOnDay: (key: string) => JournalCard[];
  cardsToday: () => JournalCard[];
  cardsYesterday: () => JournalCard[];
  cardsInRange: (range: MysteryRange) => JournalCard[];
  searchCards: (query: string, collectionId?: string) => JournalCard[];
  relatedCards: (cardId: string) => JournalCard[];
  monthStats: (year: number, monthIndex: number) => { cards: number; words: number; days: number };
  dayCounts: Record<string, number>;
  recordedDays: number;
  setLastSession: (session: RecallSession | null) => void;
  sendChat: (text: string) => void;
  setReplyMode: (mode: ChatReplyMode) => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

function newId(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function persist(next: PersistedJournal): PersistedJournal {
  void saveJournal(next);
  return next;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedJournal>(emptyJournal);
  const [ready, setReady] = useState(false);
  const [online] = useState(true);

  useEffect(() => {
    void loadJournal().then((loaded) => {
      setState(loaded);
      setReady(true);
    });
  }, []);

  const patch = useCallback((fn: (prev: PersistedJournal) => PersistedJournal) => {
    setState((prev) => persist(fn(prev)));
  }, []);

  const signInDemo = useCallback(() => {
    patch((prev) => ({ ...prev, signedIn: true }));
  }, [patch]);

  const signOut = useCallback(() => {
    patch((prev) => ({ ...prev, signedIn: false }));
  }, [patch]);

  const setSortOrder = useCallback(
    (order: SortOrder) => {
      patch((prev) => ({ ...prev, sortOrder: order }));
    },
    [patch]
  );

  const saveSettings = useCallback(
    (settings: LanguageSettings) => {
      patch((prev) => ({ ...prev, settings }));
    },
    [patch]
  );

  const addCollection = useCallback(
    (name: string): string => {
      const id = newId();
      patch((prev) => ({
        ...prev,
        collections: [...prev.collections, { id, name: name.trim() }]
      }));
      return id;
    },
    [patch]
  );

  const getCard = useCallback((id: string) => state.cards.find((card) => card.id === id), [state.cards]);

  const createCard = useCallback(
    async (input: {
      collectionId: string;
      title: string;
      body: string;
      images: string[];
      rewriteRadio: RewriteRadio;
    }): Promise<string> => {
      const id = newId();
      const rewritten = await rewriteJournal(input.body, input.rewriteRadio);
      const next: JournalCard = {
        id,
        collectionId: input.collectionId || UNCATEGORIZED_ID,
        title: titleFromBody(input.title, input.body),
        body: input.body.trim(),
        rewrite: rewritten.rewrite,
        sentences: rewritten.sentences,
        reply: rewritten.reply,
        images: input.images,
        blanks: [],
        createdAt: Date.now(),
        rewriteRadio: input.rewriteRadio
      };
      patch((prev) => ({ ...prev, cards: [next, ...prev.cards] }));
      return id;
    },
    [patch]
  );

  const updateCard = useCallback(
    (id: string, cardPatch: Partial<JournalCard>) => {
      patch((prev) => ({
        ...prev,
        cards: prev.cards.map((card) => (card.id === id ? { ...card, ...cardPatch } : card))
      }));
    },
    [patch]
  );

  const deleteCards = useCallback(
    (ids: string[]) => {
      const drop = new Set(ids);
      patch((prev) => ({ ...prev, cards: prev.cards.filter((card) => !drop.has(card.id)) }));
    },
    [patch]
  );

  const moveCards = useCallback(
    (ids: string[], collectionId: string) => {
      const move = new Set(ids);
      patch((prev) => ({
        ...prev,
        cards: prev.cards.map((card) => (move.has(card.id) ? { ...card, collectionId } : card))
      }));
    },
    [patch]
  );

  const setBlanks = useCallback(
    (cardId: string, blanks: Blank[]) => {
      updateCard(cardId, { blanks });
    },
    [updateCard]
  );

  const cardsOnDay = useCallback(
    (key: string) => state.cards.filter((card) => dateKey(card.createdAt) === key),
    [state.cards]
  );

  const cardsToday = useCallback(() => cardsOnDay(todayKey()), [cardsOnDay]);
  const cardsYesterday = useCallback(() => cardsOnDay(yesterdayKey()), [cardsOnDay]);

  const cardsInRange = useCallback(
    (range: MysteryRange) => state.cards.filter((card) => inRange(card.createdAt, range)),
    [state.cards]
  );

  const searchCards = useCallback(
    (query: string, collectionId?: string) => {
      const q = query.trim().toLowerCase();
      return state.cards.filter((card) => {
        if (collectionId && card.collectionId !== collectionId) return false;
        if (!q) return true;
        const blob = `${card.title}\n${card.body}\n${card.rewrite}`.toLowerCase();
        return blob.includes(q);
      });
    },
    [state.cards]
  );

  const relatedCards = useCallback(
    (cardId: string) => {
      const current = state.cards.find((card) => card.id === cardId);
      if (!current) return [];
      const words = current.rewrite
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((word) => word.length > 3);
      return state.cards
        .filter((card) => card.id !== cardId)
        .map((card) => {
          const blob = `${card.title} ${card.rewrite}`.toLowerCase();
          const score = words.reduce((sum, word) => sum + (blob.includes(word) ? 1 : 0), 0);
          return { card, score };
        })
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((row) => row.card);
    },
    [state.cards]
  );

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const card of state.cards) {
      const key = dateKey(card.createdAt);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [state.cards]);

  const recordedDays = useMemo(() => Object.keys(dayCounts).length, [dayCounts]);

  const monthStats = useCallback(
    (year: number, monthIndex: number) => {
      const prefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
      const monthCards = state.cards.filter((card) => dateKey(card.createdAt).startsWith(prefix));
      const words = monthCards.reduce((sum, card) => sum + card.body.length + card.rewrite.length, 0);
      const days = new Set(monthCards.map((card) => dateKey(card.createdAt))).size;
      return { cards: monthCards.length, words, days };
    },
    [state.cards]
  );

  const setLastSession = useCallback(
    (session: RecallSession | null) => {
      patch((prev) => ({ ...prev, lastSession: session }));
    },
    [patch]
  );

  const setReplyMode = useCallback(
    (mode: ChatReplyMode) => {
      patch((prev) => ({ ...prev, replyMode: mode }));
    },
    [patch]
  );

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const rewritten = rewriteJournal(trimmed, 2);
      void rewritten.then((result) => {
        const user: ChatMessage = {
          id: newId(),
          role: "user",
          text: trimmed,
          createdAt: Date.now()
        };
        const assistant: ChatMessage = {
          id: newId(),
          role: "assistant",
          text: result.rewrite || trimmed,
          translation: state.replyMode === "rewrite_translate" ? trimmed : undefined,
          reply: state.replyMode === "rewrite_reply" ? result.reply : undefined,
          createdAt: Date.now() + 1
        };
        patch((prev) => ({ ...prev, chats: [...prev.chats, user, assistant] }));
      });
    },
    [patch, state.replyMode]
  );

  const value = useMemo<AppStateValue>(
    () => ({
      ready,
      signedIn: state.signedIn,
      user: DEMO_USER,
      cards: state.cards,
      collections: state.collections,
      settings: state.settings,
      sortOrder: state.sortOrder,
      chats: state.chats,
      replyMode: state.replyMode,
      lastSession: state.lastSession,
      online,
      signInDemo,
      signOut,
      setSortOrder,
      saveSettings,
      addCollection,
      getCard,
      createCard,
      updateCard,
      deleteCards,
      moveCards,
      setBlanks,
      cardsOnDay,
      cardsToday,
      cardsYesterday,
      cardsInRange,
      searchCards,
      relatedCards,
      monthStats,
      dayCounts,
      recordedDays,
      setLastSession,
      sendChat,
      setReplyMode
    }),
    [
      addCollection,
      cardsInRange,
      cardsOnDay,
      cardsToday,
      cardsYesterday,
      createCard,
      dayCounts,
      deleteCards,
      getCard,
      monthStats,
      moveCards,
      online,
      ready,
      recordedDays,
      relatedCards,
      saveSettings,
      searchCards,
      sendChat,
      setBlanks,
      setLastSession,
      setReplyMode,
      setSortOrder,
      signInDemo,
      signOut,
      state.cards,
      state.chats,
      state.collections,
      state.lastSession,
      state.replyMode,
      state.settings,
      state.signedIn,
      state.sortOrder,
      updateCard
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState 必须在 AppStateProvider 里用");
  return value;
}
