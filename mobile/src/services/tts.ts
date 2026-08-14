import * as Speech from "expo-speech";

export const SPEAK_FAIL_TEXT = "朗读失败，请再试一次";

/** Locked v1.1 listen: system American English. Ignore audioStatus / audioUrl. */
export function speakAmerican(text: string, onError?: () => void): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    Speech.stop();
    Speech.speak(trimmed, {
      language: "en-US",
      onError: () => onError?.()
    });
  } catch {
    onError?.();
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}
