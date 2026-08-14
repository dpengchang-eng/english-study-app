import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import NetInfo from "@react-native-community/netinfo";
import * as Crypto from "expo-crypto";
import { Timestamp } from "firebase/firestore";
import { SAMPLE_CONVERSION, SAMPLE_INPUT } from "../sample";
import { convertText, mapConvertOutput } from "../services/convert";
import { addWordbookItem, markWordbookReview, subscribeConversions, subscribeWordbook } from "../services/firestore";
import { lookupPhrase } from "../services/lookup";
import { loadSettings, saveSettings } from "../services/settings";
import { cacheKey, prepareSentenceAudio } from "../services/tts";
import { isDue, samePhrase } from "../services/srs";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type AudioStatus,
  type Conversion,
  type LookupResult,
  type ReviewResult,
  type SourceLang,
  type SourceType,
  type WordbookItem
} from "../types";

type LookupTarget = {
  phrase: string;
  sentence: string;
  conversionId: string;
};

export type ConversionView = Conversion & {
  sentences: Array<Conversion["sentences"][number] & { audioStatus: AudioStatus }>;
};

type AppStateValue = {
  uid: string;
  online: boolean;
  settings: AppSettings;
  setSettings: (next: AppSettings) => void;
  wordbook: WordbookItem[];
  dueCount: number;
  recents: ConversionView[];
  getConversion: (id: string) => ConversionView | undefined;
  startConversion: (text: string, options: { sourceType: SourceType; sourceLangHint?: SourceLang }) => string;
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

function withAudio(conversion: Conversion, audioByKey: Record<string, AudioStatus>): ConversionView {
  return {
    ...conversion,
    sentences: conversion.sentences.map((sentence, index) => ({
      ...sentence,
      audioStatus: audioByKey[`${conversion.firestoreId ?? conversion.id}:${sentence.id || index}`] ?? "pending"
    }))
  };
}

export function AppStateProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [wordbook, setWordbook] = useState<WordbookItem[]>([]);
  const [remoteRecents, setRemoteRecents] = useState<Conversion[]>([]);
  const [localMap, setLocalMap] = useState<Record<string, Conversion>>({});
  const [audioByKey, setAudioByKey] = useState<Record<string, AudioStatus>>({});
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

  const prepareAudio = useCallback(async (conversion: Conversion) => {
    const opts = {
      cloudVoice: settingsRef.current.cloudVoice,
      speechRate: settingsRef.current.speechRate
    };
    const id = conversion.firestoreId ?? conversion.id;
    await Promise.all(
      conversion.sentences.map(async (sentence, index) => {
        const status = await prepareSentenceAudio(cacheKey(id, index), sentence.text, opts);
        setAudioByKey((prev) => ({ ...prev, [`${id}:${sentence.id || index}`]: status }));
      })
    );
  }, []);

  const runConvert = useCallback(
    async (
      localId: string,
      text: string,
      options: { sourceType: SourceType; sourceLangHint?: SourceLang; clientRequestId: string }
    ) => {
      const output = await convertText({
        text,
        sourceType: options.sourceType,
        sourceLangHint: options.sourceLangHint,
        clientRequestId: options.clientRequestId
      });
      let ready: Conversion | undefined;
      setLocalMap((prev) => {
        const current = prev[localId];
        if (!current) return prev;
        ready = mapConvertOutput(output, {
          id: localId,
          clientRequestId: options.clientRequestId,
          sourceType: options.sourceType,
          sourceText: text,
          createdAt: current.createdAt
        });
        return { ...prev, [localId]: ready };
      });
      if (ready?.status === "ready") {
        void prepareAudio(ready);
      }
    },
    [prepareAudio]
  );

  const startConversion = useCallback(
    (text: string, options: { sourceType: SourceType; sourceLangHint?: SourceLang }): string => {
      const clientRequestId = Crypto.randomUUID();
      const draft: Conversion = {
        id: clientRequestId,
        clientRequestId,
        sourceType: options.sourceType,
        sourceText: text.trim(),
        sourceLang: options.sourceLangHint ?? "unknown",
        outputText: "",
        rewrittenText: "",
        sentences: [],
        status: "loading",
        createdAt: Timestamp.now()
      };
      setLocalMap((prev) => ({ ...prev, [clientRequestId]: draft }));
      void runConvert(clientRequestId, text, { ...options, clientRequestId });
      return clientRequestId;
    },
    [runConvert]
  );

  const loadSample = useCallback((): string => {
    const id = `sample-${Date.now()}`;
    const draft: Conversion = { ...SAMPLE_CONVERSION, id, clientRequestId: id };
    setLocalMap((prev) => ({ ...prev, [id]: draft }));
    void prepareAudio(draft);
    return id;
  }, [prepareAudio]);

  const retryConversion = useCallback(
    (id: string) => {
      const current = localMap[id];
      if (!current) return;
      const clientRequestId = Crypto.randomUUID();
      patchLocal(id, (row) => ({
        ...row,
        clientRequestId,
        status: "loading",
        errorCode: undefined,
        errorMessage: undefined
      }));
      void runConvert(id, current.sourceText, {
        sourceType: current.sourceType,
        sourceLangHint: current.sourceLang,
        clientRequestId
      });
    },
    [localMap, patchLocal, runConvert]
  );

  const getConversion = useCallback(
    (id: string): ConversionView | undefined => {
      const found = localMap[id] ?? remoteRecents.find((item) => item.id === id || item.clientRequestId === id);
      return found ? withAudio(found, audioByKey) : undefined;
    },
    [audioByKey, localMap, remoteRecents]
  );

  const recents = useMemo(() => {
    const merged = new Map<string, Conversion>();
    remoteRecents.forEach((item) => merged.set(item.firestoreId ?? item.id, item));
    Object.values(localMap).forEach((item) => {
      merged.set(item.firestoreId ?? item.id, item);
    });
    return [...merged.values()]
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
      .slice(0, 12)
      .map((item) => withAudio(item, audioByKey));
  }, [audioByKey, localMap, remoteRecents]);

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
