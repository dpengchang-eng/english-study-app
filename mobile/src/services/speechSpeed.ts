import AsyncStorage from "@react-native-async-storage/async-storage";

export const SPEECH_SPEEDS = [0.75, 1, 1.25, 1.5] as const;
export type SpeechSpeed = (typeof SPEECH_SPEEDS)[number];

const STORAGE_KEY = "didao-speech-speed-v1";

export function parseSpeechSpeed(value: unknown): SpeechSpeed {
  const n = typeof value === "number" ? value : Number(value);
  return SPEECH_SPEEDS.find((speed) => speed === n) ?? 1;
}

export function nextSpeechSpeed(current: SpeechSpeed): SpeechSpeed {
  const index = SPEECH_SPEEDS.indexOf(parseSpeechSpeed(current));
  return SPEECH_SPEEDS[(index + 1) % SPEECH_SPEEDS.length] ?? 1;
}

export function speechSpeedLabel(speed: SpeechSpeed): string {
  return `语速 ${parseSpeechSpeed(speed)}x`;
}

/**
 * expo-speech iOS multiplies `rate` by AVSpeechUtteranceDefaultSpeechRate (1 = default).
 * Android TextToSpeech uses 1 as default. Same multipliers sound slower/faster on both.
 */
export function expoSpeechRate(speed: SpeechSpeed, os: "ios" | "android" | "web" | string = "ios"): number {
  const mapped = parseSpeechSpeed(speed);
  if (os === "ios" || os === "android" || os === "web") return mapped;
  return mapped;
}

export async function loadSpeechSpeed(): Promise<SpeechSpeed> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return parseSpeechSpeed(raw == null ? 1 : Number(raw));
  } catch {
    return 1;
  }
}

export async function saveSpeechSpeed(speed: SpeechSpeed): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(parseSpeechSpeed(speed)));
  } catch {
    // ignore
  }
}
