import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { conversionSpeakable } from "../services/homeChat";
import { loadSpeechSpeed, type SpeechSpeed } from "../services/speechSpeed";
import type { Conversion } from "../types";
import { useArticleSpeech } from "./useArticleSpeech";

export function useHomeArticleListen(recents: Conversion[]): {
  listenId: string | null;
  toggleListen: (id: string) => void;
  stopListen: () => void;
} {
  const [listenId, setListenId] = useState<string | null>(null);
  const [speed, setSpeed] = useState<SpeechSpeed>(1);
  const item = recents.find((row) => row.id === listenId);
  const sentences = item ? conversionSpeakable(item) : [];
  const { mode, toggle, stop } = useArticleSpeech(sentences, () => undefined, listenId ?? "", speed);
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

  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status !== "active") stopListen();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [stopListen]);

  return { listenId, toggleListen, stopListen };
}
