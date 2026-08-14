import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Token, WordbookItem } from "../types";
import { dueNowCount, loadWordbook, saveToWordbook } from "../services/wordbook";

type SavePhraseInput = {
  tokens: Token[];
  sentenceTokens?: Token[];
  sentenceText: string;
  conversionId: string;
  ipa: string;
  senses: string[];
};

type WordbookValue = {
  items: WordbookItem[];
  dueCount: number;
  savePhrase: (input: SavePhraseInput) => Promise<{ created: boolean; item: WordbookItem }>;
  syncItems: (next: WordbookItem[]) => void;
};

const WordbookContext = createContext<WordbookValue | null>(null);

export function WordbookProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [items, setItems] = useState<WordbookItem[]>([]);

  useEffect(() => {
    void loadWordbook(uid).then(setItems);
  }, [uid]);

  const savePhrase = useCallback(
    async (input: SavePhraseInput) => {
      const result = await saveToWordbook(uid, items, input);
      setItems(result.items);
      return { created: result.created, item: result.item };
    },
    [items, uid]
  );

  const syncItems = useCallback((next: WordbookItem[]) => {
    setItems(next);
  }, []);

  const value = useMemo<WordbookValue>(
    () => ({
      items,
      dueCount: dueNowCount(items),
      savePhrase,
      syncItems
    }),
    [items, savePhrase, syncItems]
  );

  return <WordbookContext.Provider value={value}>{children}</WordbookContext.Provider>;
}

export function useWordbook(): WordbookValue {
  const value = useContext(WordbookContext);
  if (!value) throw new Error("useWordbook 必须在 WordbookProvider 里用");
  return value;
}
