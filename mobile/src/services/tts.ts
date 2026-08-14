import { Audio } from "expo-av";
import * as Speech from "expo-speech";

let currentSound: Audio.Sound | null = null;

async function stopAll(): Promise<void> {
  Speech.stop();
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      // ignore leftover playback
    }
    currentSound = null;
  }
}

async function speakCloudTts(text: string, apiKey: string): Promise<void> {
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: "en-US",
          name: "en-US-Neural2-J"
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 0.95
        }
      })
    }
  );
  if (!response.ok) {
    throw new Error(`Cloud TTS HTTP ${response.status}`);
  }
  const payload = (await response.json()) as { audioContent?: string };
  if (!payload.audioContent) {
    throw new Error("Cloud TTS 没有返回音频");
  }
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
  const { sound } = await Audio.Sound.createAsync({ uri: `data:audio/mp3;base64,${payload.audioContent}` });
  currentSound = sound;
  await sound.playAsync();
}

export async function speakAmericanEnglish(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await stopAll();

  const cloudKey = process.env.EXPO_PUBLIC_GOOGLE_TTS_KEY?.trim();
  if (cloudKey) {
    try {
      await speakCloudTts(trimmed, cloudKey);
      return;
    } catch {
      // Fall back to the on-device American English voice.
    }
  }

  Speech.speak(trimmed, {
    language: "en-US",
    pitch: 1,
    rate: 0.92
  });
}

export async function stopSpeaking(): Promise<void> {
  await stopAll();
}
