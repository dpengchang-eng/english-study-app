import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import NetInfo from "@react-native-community/netinfo";
import { Timestamp } from "firebase/firestore";
import { SAMPLE_CONVERSION, SAMPLE_INPUT } from "../sample";
import { convertToAmericanEnglish } from "../services/convert";
import {
  addWordbookItem,
  createConversionDoc,
  markWordbookReview,
  patchSentenceAudio,
  subscribeConversions,
  subscribeWordbook,
  updateConversionDoc
} from "../services/firestore";
import { lookupPhrase } from "../services/lookup";
import { loadSettings, saveSettings } from "../services/settings";
import { cacheKey, prepareSentenceAudio } from "../services/tts";
import { isDue, samePhrase } from "../services/srs";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type Conversion,
  type LookupResult,
  type ReviewResult,
  type WordbookItem
} from "../types";

type LookupTarget = {
  phrase: string;
  sentence: string;
  conversionId: string;
};

type AppStateValue = {
  uid: string;
  online: boolean;
  settings: AppSettings;
  setSettings: (next: AppSettings) => void;
  wordbook: WordbookItem[];
  dueCount: number;
  recents: Conversion[];
  getConversion: (id: string) => Conversion | undefined;
  startConversion: (text: string) => string;
  loadSample: () => string;
  retryConversion: (id: string) => void;
  lookup: LookupTarget | null;
  lookupResult: LookupResult | null;
  lookupBusy: boolean;
  openLookup: (target: LookupTarget) => void;
  closeLookup: () => void;
  addToWordbook: (input: {
    phrase: string;
    sentence: string;
    conversionId: string;
    ipa?: string;
    senses?: string[];
  }) => Promise<void>;
  findSaved: (phrase: string) => WordbookItem | undefined;
  markReview: (item: WordbookItem, result: ReviewResult) => Promise<void>;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [wordbook, setWordbook] = useState<WordbookItem[]>([]);
  const [remoteRecents, setRemoteRecents] = useState<Conversion[]>([]);
  const [localMap, setLocalMap] = useState<Record<string, Conversion>>({});
  const [lookup, setLookup] = useState<LookupTarget | null>(null);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return unsub;
  }, []);

  useEffect(() => {
    void loadSettings().then(setSettingsState);
  }, []);

  useEffect(() => subscribeWordbook(uid, setWordbook), [uid]);
  useEffect(() => subscribeConversions(uid, setRemoteRecents), [uid]);

  const persistSettings = useCallback(
    (next: AppSettings) => {
      setSettingsState(next);
      void saveSettings(uid, next);
    },
    [uid]
  );

  const patchLocal = useCallback((id: string, updater: (current: Conversion) => Conversion) => {
    setLocalMap((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: updater(current) };
    });
  }, []);

  const prepareAudio = useCallback(
    async (conversion: Conversion) => {
      const opts = {
        cloudVoice: settingsRef.current.cloudVoice,
        speechRate: settingsRef.current.speechRate
      };
      await Promise.all(
        conversion.sentences.map(async (sentence, index) => {
          const status = await prepareSentenceAudio(cacheKey(conversion.id, index), sentence.text, opts);
          patchLocal(conversion.id, (current) => ({
            ...current,
            sentences: current.sentences.map((row, rowIndex) =>
              rowIndex === index ? { ...row, audioStatus: status } : row
            )
          }));
        })
      );
      setLocalMap((prev) => {
        const latest = prev[conversion.id];
        if (latest?.firestoreId) {
          void patchSentenceAudio(uid, latest.firestoreId, latest.sentences);
        }
        return prev;
      });
    },
    [patchLocal, uid]
  );

  const runConvert = useCallback(
    async (id: string, text: string) => {
      try {
        const payload = await convertToAmericanEnglish(text);
        let ready: Conversion | undefined;
        setLocalMap((prev) => {
          const current = prev[id];
          if (!current) return prev;
          ready = {
            ...current,
            ...payload,
            status: "ready",
            errorMessage: undefined
          };
          return { ...prev, [id]: ready };
        });
        if (!ready) return;
        try {
          if (ready.firestoreId) {
            await updateConversionDoc(uid, ready.firestoreId, ready);
          } else {
            const firestoreId = await createConversionDoc(uid, ready);
            patchLocal(id, (current) => ({ ...current, firestoreId }));
          }
        } catch {
          // result still usable offline in memory
        }
        void prepareAudio(ready);
      } catch (error) {
        patchLocal(id, (current) => ({
          ...current,
          status: "error",
          errorMessage: error instanceof Error ? error.message : "转换失败。"
        }));
      }
    },
    [patchLocal, prepareAudio, uid]
  );

  const startConversion = useCallback(
    (text: string): string => {
      const id = `local-${Date.now()}`;
      const draft: Conversion = {
        id,
        sourceText: text.trim(),
        sourceLang: "zh",
        rewrittenText: "",
        sentences: [],
        status: "loading",
        createdAt: Timestamp.now()
      };
      setLocalMap((prev) => ({ ...prev, [id]: draft }));
      void (async () => {
        try {
          const firestoreId = await createConversionDoc(uid, draft);
          patchLocal(id, (current) => ({ ...current, firestoreId }));
        } catch {
          // keep local only
        }
      })();
      void runConvert(id, text);
      return id;
    },
    [patchLocal, runConvert, uid]
  );

  const loadSample = useCallback((): string => {
    const id = `sample-${Date.now()}`;
    const draft: Conversion = { ...SAMPLE_CONVERSION, id, sourceText: SAMPLE_INPUT };
    setLocalMap((prev) => ({ ...prev, [id]: draft }));
    void (async () => {
      try {
        const firestoreId = await createConversionDoc(uid, draft);
        patchLocal(id, (current) => ({ ...current, firestoreId }));
      } catch {
        // keep local
      }
      void prepareAudio(draft);
    })();
    return id;
  }, [patchLocal, prepareAudio, uid]);

  const retryConversion = useCallback(
    (id: string) => {
      const current = localMap[id];
      if (!current) return;
      patchLocal(id, (row) => ({ ...row, status: "loading", errorMessage: undefined }));
      void runConvert(id, current.sourceText);
    },
    [localMap, patchLocal, runConvert]
  );

  const getConversion = useCallback(
    (id: string): Conversion | undefined => {
      return localMap[id] ?? remoteRecents.find((item) => item.id === id);
    },
    [localMap, remoteRecents]
  );

  const recents = useMemo(() => {
    const merged = new Map<string, Conversion>();
    remoteRecents.forEach((item) => merged.set(item.firestoreId ?? item.id, item));
    Object.values(localMap).forEach((item) => {
      merged.set(item.firestoreId ?? item.id, item);
    });
    return [...merged.values()]
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
      .slice(0, 12);
  }, [localMap, remoteRecents]);

  const openLookup = useCallback((target: LookupTarget) => {
    setLookup(target);
    setLookupResult(null);
    setLookupBusy(true);
    void lookupPhrase(target.phrase, target.sentence)
      .then(setLookupResult)
      .finally(() => setLookupBusy(false));
  }, []);

  const closeLookup = useCallback(() => {
    setLookup(null);
    setLookupResult(null);
    setLookupBusy(false);
  }, []);

  const findSaved = useCallback(
    (phrase: string) => wordbook.find((item) => samePhrase(item.phrase, phrase)),
    [wordbook]
  );

  const addToWordbook = useCallback(
    async (input: {
      phrase: string;
      sentence: string;
      conversionId: string;
      ipa?: string;
      senses?: string[];
    }) => {
      if (findSaved(input.phrase)) return;
      await addWordbookItem(uid, {
        phrase: input.phrase,
        ipa: input.ipa ?? "",
        senses: input.senses ?? [],
        sentenceContext: input.sentence,
        conversionId: input.conversionId
      });
    },
    [findSaved, uid]
  );

  const markReview = useCallback(
    async (item: WordbookItem, result: ReviewResult) => {
      await markWordbookReview(uid, item, result);
    },
    [uid]
  );

  const dueCount = useMemo(() => wordbook.filter((item) => isDue(item)).length, [wordbook]);

  const value = useMemo<AppStateValue>(
    () => ({
      uid,
      online,
      settings,
      setSettings: persistSettings,
      wordbook,
      dueCount,
      recents,
      getConversion,
      startConversion,
      loadSample,
      retryConversion,
      lookup,
      lookupResult,
      lookupBusy,
      openLookup,
      closeLookup,
      addToWordbook,
      findSaved,
      markReview
    }),
    [
      addToWordbook,
      closeLookup,
      dueCount,
      findSaved,
      getConversion,
      loadSample,
      lookup,
      lookupBusy,
      lookupResult,
      markReview,
      online,
      openLookup,
      persistSettings,
      recents,
      retryConversion,
      settings,
      startConversion,
      uid,
      wordbook
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState 必须在 AppStateProvider 里用");
  return value;
}
