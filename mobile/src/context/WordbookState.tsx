import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Token, WordbookItem } from "../types";
import { dueTodayCount, loadWordbook, saveToWordbook, updateWordbookSrs } from "../services/wordbook";

type WordbookValue = {
  items: WordbookItem[];
  dueCount: number;
  savePhrase: (input: {
    tokens: Token[];
    sentenceText: string;
    conversionId: string;
    ipa: string;
    senses: string[];
  }) => Promise<{ created: boolean; item: WordbookItem }>;
  applyItem: (item: WordbookItem) => Promise<void>;
  getItem: (id: string) => WordbookItem | undefined;
};

const WordbookContext = createContext<WordbookValue | null>(null);

export function WordbookProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [items, setItems] = useState<WordbookItem[]>([]);

  useEffect(() => {
    void loadWordbook(uid).then(setItems);
  }, [uid]);

  const savePhrase = useCallback(
    async (input: {
      tokens: Token[];
      sentenceText: string;
      conversionId: string;
      ipa: string;
      senses: string[];
    }) => {
      const result = await saveToWordbook(uid, items, input);
      setItems(result.items);
      return { created: result.created, item: result.item };
    },
    [items, uid]
  );

  const applyItem = useCallback(
    async (item: WordbookItem) => {
      const next = await updateWordbookSrs(uid, items, item);
      setItems(next);
    },
    [items, uid]
  );

  const getItem = useCallback((id: string) => items.find((item) => item.id === id), [items]);

  const value = useMemo<WordbookValue>(
    () => ({
      items,
      dueCount: dueTodayCount(items),
      savePhrase,
      applyItem,
      getItem
    }),
    [applyItem, getItem, items, savePhrase]
  );

  return <WordbookContext.Provider value={value}>{children}</WordbookContext.Provider>;
}

export function useWordbook(): WordbookValue {
  const value = useContext(WordbookContext);
  if (!value) throw new Error("useWordbook 必须在 WordbookProvider 里用");
  return value;
}
