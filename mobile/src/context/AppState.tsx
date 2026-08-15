import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import NetInfo from "@react-native-community/netinfo";
import * as Crypto from "expo-crypto";
import { makeSampleConversion } from "../sample";
import { convertText, mapConvertOutput } from "../services/convert";
import { applyConversionSync, applyConvertResult, loadRecents, mergeRecent, mergeRemoteRecents, saveRecents } from "../services/history";
import { loadRemoteConversions } from "../services/persist";
import type { Conversion, ConvertErrorCode, SourceLang, SourceType } from "../types";

type AppStateValue = {
  uid: string;
  online: boolean;
  recents: Conversion[];
  getConversion: (id: string) => Conversion | undefined;
  startConversion: (text: string, options: { sourceType: SourceType; sourceLangHint?: SourceLang }) => string;
  convertAgain: (id: string) => string | undefined;
  loadSample: () => string;
  failIfLoading: (id: string, errorCode: ConvertErrorCode) => void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({
  uid,
  linked = false,
  children
}: {
  uid: string;
  linked?: boolean;
  children: ReactNode;
}) {
  const [online, setOnline] = useState(true);
  const [recents, setRecents] = useState<Conversion[]>([]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return unsub;
  }, []);

  useEffect(() => {
    let live = true;
    void loadRecents(uid).then((local) => {
      if (!live) return;
      setRecents(local);
      void loadRemoteConversions(uid).then((remote) => {
        if (!live || remote.length === 0) return;
        setRecents((prev) => {
          const next = mergeRemoteRecents(prev, remote);
          void saveRecents(uid, next);
          return next;
        });
      });
    });
    return () => {
      live = false;
    };
  }, [uid, linked]);

  const upsert = useCallback(
    (item: Conversion) => {
      setRecents((prev) => {
        const next = mergeRecent(prev, item);
        void saveRecents(uid, next);
        return next;
      });
    },
    [uid]
  );

  const runConvert = useCallback(
    async (
      localId: string,
      text: string,
      options: { sourceType: SourceType; sourceLangHint?: SourceLang; clientRequestId: string; createdAt: number }
    ) => {
      const output = await convertText({
        uid,
        text,
        sourceType: options.sourceType,
        sourceLangHint: options.sourceLangHint,
        clientRequestId: options.clientRequestId
      });
      setRecents((prev) => {
        const next = applyConvertResult(
          prev,
          mapConvertOutput(output, {
            id: localId,
            clientRequestId: options.clientRequestId,
            sourceType: options.sourceType,
            sourceText: text,
            createdAt: options.createdAt
          })
        );
        if (next === prev) return prev;
        void saveRecents(uid, next);
        return next;
      });
      if (output.status === "ready") {
        void (output.persistResult ?? Promise.resolve(undefined)).then((cloudId) => {
          setRecents((prev) => {
            const next = applyConversionSync(
              prev,
              localId,
              options.clientRequestId,
              cloudId ? "synced" : "error"
            );
            if (next === prev) return prev;
            void saveRecents(uid, next);
            return next;
          });
        });
      }
    },
    [uid]
  );

  const loadSample = useCallback((): string => {
    const sample = makeSampleConversion();
    upsert(sample);
    return sample.id;
  }, [upsert]);

  const startConversion = useCallback(
    (text: string, options: { sourceType: SourceType; sourceLangHint?: SourceLang }): string => {
      const clientRequestId = Crypto.randomUUID();
      const createdAt = Date.now();
      const draft: Conversion = {
        id: clientRequestId,
        clientRequestId,
        sourceType: options.sourceType,
        sourceText: text.trim(),
        sourceLang: options.sourceLangHint,
        sentences: [],
        status: "loading",
        createdAt,
        threadAt: createdAt
      };
      upsert(draft);
      void runConvert(clientRequestId, draft.sourceText, {
        ...options,
        clientRequestId,
        createdAt: draft.createdAt
      });
      return clientRequestId;
    },
    [runConvert, upsert]
  );

  const convertAgain = useCallback(
    (id: string): string | undefined => {
      const current = recents.find((item) => item.id === id);
      if (!current) return undefined;
      const hint =
        current.sourceLang === "zh" || current.sourceLang === "en" || current.sourceLang === "mixed"
          ? current.sourceLang
          : undefined;
      const clientRequestId = Crypto.randomUUID();
      const createdAt = Date.now();
      const draft: Conversion = {
        id: current.id,
        clientRequestId,
        sourceType: current.sourceType,
        sourceText: current.sourceText,
        sourceLang: hint,
        sentences: [],
        status: "loading",
        createdAt,
        threadAt: current.threadAt ?? current.createdAt
      };
      upsert(draft);
      void runConvert(current.id, draft.sourceText, {
        sourceType: draft.sourceType,
        sourceLangHint: hint,
        clientRequestId,
        createdAt
      });
      return current.id;
    },
    [recents, runConvert, upsert]
  );

  const failIfLoading = useCallback(
    (id: string, errorCode: ConvertErrorCode) => {
      setRecents((prev) => {
        const current = prev.find((item) => item.id === id);
        if (!current || current.status !== "loading") return prev;
        const next = mergeRecent(prev, { ...current, status: "failed", errorCode });
        void saveRecents(uid, next);
        return next;
      });
    },
    [uid]
  );

  const getConversion = useCallback(
    (id: string): Conversion | undefined => recents.find((item) => item.id === id),
    [recents]
  );

  const value = useMemo<AppStateValue>(
    () => ({
      uid,
      online,
      recents,
      getConversion,
      startConversion,
      convertAgain,
      loadSample,
      failIfLoading
    }),
    [convertAgain, failIfLoading, getConversion, loadSample, online, recents, startConversion, uid]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState 必须在 AppStateProvider 里用");
  return value;
}
