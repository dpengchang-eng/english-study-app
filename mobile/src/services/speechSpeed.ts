import AsyncStorage from "@react-native-async-storage/async-storage";

export const SPEECH_SPEEDS = [0.75, 1, 1.25, 1.5] as const;
export type SpeechSpeed = (typeof SPEECH_SPEEDS)[number];

const STORAGE_KEY = "didao-speech-speed-v1";

type KeyStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

let cached: SpeechSpeed | undefined;

export function parseSpeechSpeed(value: unknown): SpeechSpeed {
  const n = typeof value === "number" ? value : Number(value);
  return SPEECH_SPEEDS.find((speed) => speed === n) ?? 1;
}

export function speedFromStorage(raw: string | null | undefined): SpeechSpeed {
  if (raw == null || raw === "") return 1;
  return parseSpeechSpeed(Number(raw));
}

export function nextSpeechSpeed(current: SpeechSpeed): SpeechSpeed {
  const index = SPEECH_SPEEDS.indexOf(parseSpeechSpeed(current));
  return SPEECH_SPEEDS[(index + 1) % SPEECH_SPEEDS.length] ?? 1;
}

export function speechSpeedLabel(speed: SpeechSpeed): string {
  return `语速 ${parseSpeechSpeed(speed)}x`;
}

export function peekSpeechSpeed(): SpeechSpeed {
  return cached ?? 1;
}

export function rememberSpeechSpeed(speed: SpeechSpeed): SpeechSpeed {
  cached = parseSpeechSpeed(speed);
  return cached;
}

export function resetSpeechSpeedCache(): void {
  cached = undefined;
}

/**
 * expo-speech iOS multiplies `rate` by AVSpeechUtteranceDefaultSpeechRate (1 = default).
 * Android TextToSpeech uses 1 as default. Same multipliers sound slower/faster on both.
 */
export function expoSpeechRate(speed: SpeechSpeed, _os: "ios" | "android" | "web" | string = "ios"): number {
  return parseSpeechSpeed(speed);
}

export async function loadSpeechSpeed(store: KeyStore = AsyncStorage): Promise<SpeechSpeed> {
  if (cached != null) return cached;
  try {
    const raw = await store.getItem(STORAGE_KEY);
    if (cached != null) return cached;
    cached = speedFromStorage(raw);
    return cached;
  } catch {
    if (cached != null) return cached;
    cached = 1;
    return 1;
  }
}

export async function saveSpeechSpeed(speed: SpeechSpeed, store: KeyStore = AsyncStorage): Promise<void> {
  rememberSpeechSpeed(speed);
  try {
    await store.setItem(STORAGE_KEY, String(cached));
  } catch {
    // ignore
  }
}
