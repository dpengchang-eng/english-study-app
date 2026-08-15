import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { rootNav } from "../navigation/rootNav";
import {
  decideListenAction,
  indexById,
  missingPlayItemAction,
  nextPlayIndex,
  resolveStartIndex,
  speakableItems,
  type ArticlePlayMode,
  type ArticleSpeechMode,
  type ListenRequest
} from "../services/articleSpeech";
import { continueSpeaking, speakAmerican, stopSpeaking, type SpeakHandlers } from "../services/tts";

export type { ArticleSpeechMode };

export function useArticleSpeech(
  sentences: Array<{ id: string; text: string }>,
  onError: () => void,
  resetKey?: string
): {
  mode: ArticleSpeechMode;
  playingId: string | null;
  canSpeak: boolean;
  toggle: (mode: Exclude<ArticlePlayMode, "once" | "loopOne">) => boolean;
  playOnce: (id: string) => boolean;
  loopOne: (id: string) => boolean;
  stop: () => void;
} {
  const items = speakableItems(sentences);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const selectedIdRef = useRef<string | null>(null);
  const sessionRef = useRef(0);
  const modeRef = useRef<ArticleSpeechMode>("idle");
  const playingIdRef = useRef<string | null>(null);
  const [mode, setMode] = useState<ArticleSpeechMode>("idle");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    modeRef.current = "idle";
    playingIdRef.current = null;
    setMode("idle");
    setPlayingId(null);
    stopSpeaking();
  }, []);

  const speakAt = useCallback((session: number, playMode: ArticlePlayMode, index: number, interrupt: boolean) => {
    const list = itemsRef.current;
    const item = list[index];
    const gate = missingPlayItemAction(item, session, sessionRef.current);
    if (gate === "skip") return;
    if (gate === "stop" || !item) {
      stop();
      return;
    }
    selectedIdRef.current = item.id;
    playingIdRef.current = item.id;
    modeRef.current = playMode;
    setPlayingId(item.id);
    setMode(playMode);
    const handlers: SpeakHandlers = {
      onError: () => {
        if (session !== sessionRef.current) return;
        sessionRef.current += 1;
        modeRef.current = "idle";
        playingIdRef.current = null;
        setMode("idle");
        setPlayingId(null);
        onErrorRef.current();
      },
      onDone: () => {
        if (session !== sessionRef.current) return;
        const next = nextPlayIndex(playMode, index, list.length);
        if (next == null) {
          sessionRef.current += 1;
          modeRef.current = "idle";
          playingIdRef.current = null;
          setMode("idle");
          setPlayingId(null);
          return;
        }
        speakAt(session, playMode, next, false);
      }
    };
    if (interrupt) speakAmerican(item.text, handlers);
    else continueSpeaking(item.text, handlers);
  }, [stop]);

  const start = useCallback(
    (playMode: ArticlePlayMode, selectedId?: string | null) => {
      const list = itemsRef.current;
      const selectedIndex = indexById(list, selectedId ?? selectedIdRef.current);
      const index = resolveStartIndex(playMode, list.length, selectedIndex);
      if (index == null) return false;
      sessionRef.current += 1;
      modeRef.current = playMode;
      playingIdRef.current = list[index].id;
      setMode(playMode);
      setPlayingId(list[index].id);
      // speakAmerican stops at most once. A second Speech.stop() here swallows sentence 1.
      speakAt(sessionRef.current, playMode, index, true);
      return true;
    },
    [speakAt]
  );

  const apply = useCallback(
    (request: ListenRequest) => {
      const decision = decideListenAction(modeRef.current, playingIdRef.current, request);
      if (decision.action === "stop") {
        stop();
        return true;
      }
      return start(decision.mode, decision.id);
    },
    [start, stop]
  );

  const toggle = useCallback(
    (playMode: Exclude<ArticlePlayMode, "once" | "loopOne">) => apply({ kind: playMode }),
    [apply]
  );

  const playOnce = useCallback((id: string) => apply({ kind: "once", id }), [apply]);

  const loopOne = useCallback((id: string) => apply({ kind: "loopOne", id }), [apply]);

  const resetRef = useRef(resetKey);
  useEffect(() => {
    if (resetRef.current === resetKey) return;
    resetRef.current = resetKey;
    stop();
  }, [resetKey, stop]);

  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status !== "active") stop();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [stop]);

  useFocusEffect(
    useCallback(() => {
      return () => stop();
    }, [stop])
  );

  useEffect(() => {
    const stopIfOverlay = () => {
      if (!rootNav.isReady()) return;
      const name = rootNav.getCurrentRoute()?.name;
      if (name === "Lookup" || name === "Cloze") stop();
    };
    const unsub = rootNav.addListener("state", stopIfOverlay);
    stopIfOverlay();
    return unsub;
  }, [stop]);

  return { mode, playingId, canSpeak: items.length > 0, toggle, playOnce, loopOne, stop };
}
