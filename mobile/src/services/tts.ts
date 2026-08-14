import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import type { AudioStatus, SpeechRatePreset } from "../types";
import { speechRateValue } from "./settings";

const cache = new Map<string, string>();
let currentSound: Audio.Sound | null = null;
let playingKey: string | null = null;

export function cacheKey(conversionId: string, sentenceIndex: number): string {
  return `${conversionId}:${sentenceIndex}`;
}

async function stopLocal(): Promise<void> {
  Speech.stop();
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      // leftover playback
    }
    currentSound = null;
  }
  playingKey = null;
}

async function synthesizeCloud(text: string, apiKey: string, rate: number): Promise<string> {
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "en-US", name: "en-US-Neural2-J" },
        audioConfig: { audioEncoding: "MP3", speakingRate: rate }
      })
    }
  );
  if (!response.ok) throw new Error(`Cloud TTS HTTP ${response.status}`);
  const payload = (await response.json()) as { audioContent?: string };
  if (!payload.audioContent) throw new Error("Cloud TTS empty");
  return `data:audio/mp3;base64,${payload.audioContent}`;
}

export async function prepareSentenceAudio(
  key: string,
  text: string,
  options: { cloudVoice: boolean; speechRate: SpeechRatePreset }
): Promise<AudioStatus> {
  if (cache.has(key)) return "ready";
  const rate = speechRateValue(options.speechRate);
  const cloudKey = process.env.EXPO_PUBLIC_GOOGLE_TTS_KEY?.trim();
  if (options.cloudVoice && cloudKey) {
    try {
      const uri = await synthesizeCloud(text, cloudKey, rate);
      cache.set(key, uri);
      return "ready";
    } catch {
      // local fallback below
    }
  }
  // expo-speech does not need a cached file; mark ready so play can start.
  cache.set(key, "local");
  return "ready";
}

export async function playPrepared(
  key: string,
  text: string,
  options: { cloudVoice: boolean; speechRate: SpeechRatePreset }
): Promise<"playing" | "unavailable"> {
  const rate = speechRateValue(options.speechRate);
  await stopLocal();
  const uri = cache.get(key);
  if (uri && uri !== "local") {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      const { sound } = await Audio.Sound.createAsync({ uri });
      currentSound = sound;
      playingKey = key;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          playingKey = null;
        }
      });
      await sound.playAsync();
      return "playing";
    } catch {
      // fall through to device voice
    }
  }
  try {
    playingKey = key;
    Speech.speak(text, {
      language: "en-US",
      pitch: 1,
      rate,
      onDone: () => {
        if (playingKey === key) playingKey = null;
      },
      onStopped: () => {
        if (playingKey === key) playingKey = null;
      }
    });
    return "playing";
  } catch {
    return "unavailable";
  }
}

export function isPlaying(key: string): boolean {
  return playingKey === key;
}

export async function stopSpeaking(): Promise<void> {
  await stopLocal();
}

export function peekCached(key: string): boolean {
  return cache.has(key);
}
