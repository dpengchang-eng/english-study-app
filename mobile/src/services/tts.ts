import * as Speech from "expo-speech";
import type { AudioStatus } from "../types";

export async function speakAmerican(text: string): Promise<AudioStatus> {
  const trimmed = text.trim();
  if (!trimmed) return "unavailable";
  try {
    Speech.stop();
    await new Promise<void>((resolve, reject) => {
      Speech.speak(trimmed, {
        language: "en-US",
        rate: 0.95,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => reject(new Error("speech"))
      });
    });
    return "ready";
  } catch {
    return "unavailable";
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}
