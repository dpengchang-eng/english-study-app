import * as Speech from "expo-speech";

/** Locked v1.1 listen: system American English. Ignore audioStatus / audioUrl. */
export function speakAmerican(text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    Speech.stop();
    Speech.speak(trimmed, { language: "en-US" });
  } catch {
    // Expo Go still launches if speech is missing
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}
