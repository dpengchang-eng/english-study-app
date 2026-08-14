import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_SETTINGS, type AppSettings, type QuizSize, type SpeechRatePreset } from "../types";

const KEY = "didao-settings-v1";

export function speechRateValue(preset: SpeechRatePreset): number {
  if (preset === "slow") return 0.78;
  if (preset === "fast") return 1.08;
  return 0.92;
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const quizSize: QuizSize = parsed.quizSize === 5 || parsed.quizSize === 15 ? parsed.quizSize : 10;
    const speechRate: SpeechRatePreset =
      parsed.speechRate === "slow" || parsed.speechRate === "fast" ? parsed.speechRate : "normal";
    return {
      quizSize,
      speechRate,
      cloudVoice: parsed.cloudVoice !== false
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(uid: string, settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  try {
    await setDoc(doc(db, "users", uid, "settings", "didao"), settings, { merge: true });
    await setDoc(
      doc(db, "users", uid),
      {
        settings: {
          ttsRate: speechRateValue(settings.speechRate),
          ttsVoiceHint: settings.cloudVoice ? "en-US-Neural2-J" : "device-en-US"
        },
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch {
    // local settings still apply
  }
}
