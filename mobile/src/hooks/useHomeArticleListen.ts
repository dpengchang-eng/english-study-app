import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { conversionSpeakable } from "../services/homeChat";
import { loadSpeechSpeed, type SpeechSpeed } from "../services/speechSpeed";
import type { Conversion } from "../types";
import { useArticleSpeech } from "./useArticleSpeech";

export function useHomeArticleListen(
  recents: Conversion[],
  onError: () => void
): {
  listenId: string | null;
  toggleListen: (id: string) => void;
  stopListen: () => void;
} {
  const [listenId, setListenId] = useState<string | null>(null);
  const [speed, setSpeed] = useState<SpeechSpeed>(1);
  const item = recents.find((row) => row.id === listenId);
  const sentences = item ? conversionSpeakable(item) : [];
  const { mode, toggle, stop } = useArticleSpeech(sentences, onError, listenId ?? "", speed);
  const pendingStart = useRef<string | null>(null);
  const playingId = useRef<string | null>(null);

  useEffect(() => {
    void loadSpeechSpeed().then(setSpeed);
  }, []);

  useEffect(() => {
    if (!pendingStart.current || pendingStart.current !== listenId) return;
    if (sentences.length === 0) return;
    pendingStart.current = null;
    toggle("all");
  }, [listenId, sentences.length, toggle]);

  useEffect(() => {
    if (mode === "all" && listenId) playingId.current = listenId;
    if (mode === "idle" && playingId.current && playingId.current === listenId) {
      playingId.current = null;
      setListenId(null);
    }
  }, [mode, listenId]);

  const stopListen = useCallback(() => {
    pendingStart.current = null;
    playingId.current = null;
    setListenId(null);
    stop();
  }, [stop]);

  const toggleListen = useCallback(
    (id: string) => {
      if (listenId === id && mode === "all") {
        stopListen();
        return;
      }
      pendingStart.current = id;
      setListenId(id);
    },
    [listenId, mode, stopListen]
  );

  useFocusEffect(
    useCallback(() => {
      return () => stopListen();
    }, [stopListen])
  );

  return { listenId, toggleListen, stopListen };
}
