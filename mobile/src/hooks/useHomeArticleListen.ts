import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { conversionSpeakable, homeListenShouldStop } from "../services/homeChat";
import {
  loadSpeechSpeed,
  peekSpeechSpeed,
  shouldApplyLoadedSpeed,
  type SpeechSpeed
} from "../services/speechSpeed";
import type { Conversion } from "../types";
import { useArticleSpeech } from "./useArticleSpeech";

export function useHomeArticleListen(recents: Conversion[]): {
  listenId: string | null;
  toggleListen: (id: string) => void;
  stopListen: () => void;
} {
  const [speed, setSpeed] = useState<SpeechSpeed>(peekSpeechSpeed);
  const [listenId, setListenId] = useState<string | null>(null);
  const item = recents.find((row) => row.id === listenId);
  const sentences = item ? conversionSpeakable(item) : [];
  const { mode, start, stop } = useArticleSpeech(sentences, () => undefined, listenId ?? "", speed);
  const pendingStart = useRef<string | null>(null);
  const playingId = useRef<string | null>(null);
  const playingRef = useRef(false);
  playingRef.current = mode === "all";

  useEffect(() => {
    let live = true;
    void loadSpeechSpeed().then((saved) => {
      if (!live || !shouldApplyLoadedSpeed(false, playingRef.current)) return;
      setSpeed(saved);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!pendingStart.current || pendingStart.current !== listenId) return;
    if (sentences.length === 0) return;
    pendingStart.current = null;
    start("all");
  }, [listenId, sentences.length, start]);

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
      if (homeListenShouldStop(listenId, id)) {
        stopListen();
        return;
      }
      stop();
      setSpeed(peekSpeechSpeed());
      pendingStart.current = id;
      setListenId(id);
    },
    [listenId, stop, stopListen]
  );

  useFocusEffect(
    useCallback(() => {
      if (shouldApplyLoadedSpeed(false, playingRef.current)) {
        setSpeed(peekSpeechSpeed());
      }
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
