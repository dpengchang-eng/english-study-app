import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  indexById,
  nextPlayIndex,
  resolveStartIndex,
  speakableItems,
  type ArticlePlayMode
} from "../services/articleSpeech";
import { continueSpeaking, speakAmerican, stopSpeaking, type SpeakHandlers } from "../services/tts";

export type ArticleSpeechMode = ArticlePlayMode | "idle";

export function useArticleSpeech(
  sentences: Array<{ id: string; text: string }>,
  onError: () => void,
  resetKey?: string
): {
  mode: ArticleSpeechMode;
  playingId: string | null;
  toggle: (mode: Exclude<ArticlePlayMode, "once" | "loopOne">) => void;
  playOnce: (id: string) => void;
  loopOne: (id: string) => void;
  stop: () => void;
} {
  const items = speakableItems(sentences);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const selectedIdRef = useRef<string | null>(null);
  const sessionRef = useRef(0);
  const [mode, setMode] = useState<ArticleSpeechMode>("idle");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    setMode("idle");
    setPlayingId(null);
    stopSpeaking();
  }, []);

  const speakAt = useCallback((session: number, playMode: ArticlePlayMode, index: number, interrupt: boolean) => {
    const list = itemsRef.current;
    const item = list[index];
    if (!item || session !== sessionRef.current) return;
    selectedIdRef.current = item.id;
    setPlayingId(item.id);
    setMode(playMode);
    const handlers: SpeakHandlers = {
      onError: () => {
        if (session !== sessionRef.current) return;
        sessionRef.current += 1;
        setMode("idle");
        setPlayingId(null);
        onErrorRef.current();
      },
      onDone: () => {
        if (session !== sessionRef.current) return;
        const next = nextPlayIndex(playMode, index, list.length);
        if (next == null) {
          sessionRef.current += 1;
          setMode("idle");
          setPlayingId(null);
          return;
        }
        speakAt(session, playMode, next, false);
      }
    };
    if (interrupt) speakAmerican(item.text, handlers);
    else continueSpeaking(item.text, handlers);
  }, []);

  const start = useCallback(
    (playMode: ArticlePlayMode, selectedId?: string | null) => {
      const list = itemsRef.current;
      const selectedIndex = indexById(list, selectedId ?? selectedIdRef.current);
      const index = resolveStartIndex(playMode, list.length, selectedIndex);
      if (index == null) return;
      sessionRef.current += 1;
      stopSpeaking();
      speakAt(sessionRef.current, playMode, index, true);
    },
    [speakAt]
  );

  const toggle = useCallback(
    (playMode: Exclude<ArticlePlayMode, "once" | "loopOne">) => {
      if (mode === playMode) {
        stop();
        return;
      }
      start(playMode);
    },
    [mode, start, stop]
  );

  const playOnce = useCallback(
    (id: string) => {
      if (mode === "once" && playingId === id) {
        stop();
        return;
      }
      start("once", id);
    },
    [mode, playingId, start, stop]
  );

  const loopOne = useCallback(
    (id: string) => {
      if (mode === "loopOne" && playingId === id) {
        stop();
        return;
      }
      start("loopOne", id);
    },
    [mode, playingId, start, stop]
  );

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

  return { mode, playingId, toggle, playOnce, loopOne, stop };
}
