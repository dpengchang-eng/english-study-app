import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent
} from "expo-speech-recognition";

export type SpeechLang = "zh-CN" | "en-US";

export function useSpeechEvents(handlers: {
  onResult: (text: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): void {
  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results?.[0]?.transcript?.trim() ?? "";
    if (text) handlers.onResult(text, Boolean(event.isFinal));
  });
  useSpeechRecognitionEvent("error", (event) => {
    const code = event.error ?? "unknown";
    if (code === "not-allowed") {
      handlers.onError("没有麦克风或语音识别权限，请改用打字。");
    } else if (code === "no-speech") {
      handlers.onError("没有听到声音，请再说一次，或直接打字。");
    } else {
      handlers.onError("语音识别不可用，请改用打字。");
    }
  });
  useSpeechRecognitionEvent("end", () => {
    handlers.onEnd();
  });
}

export async function startListening(lang: SpeechLang): Promise<void> {
  const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
  if (!available) {
    throw new Error("这台设备没有语音识别。请直接打字。");
  }
  const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error("没有语音权限。请到系统设置打开，或直接打字。");
  }
  ExpoSpeechRecognitionModule.start({
    lang,
    interimResults: true,
    addsPunctuation: true,
    maxAlternatives: 1
  });
}

export function stopListening(): void {
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch {
    // already stopped
  }
}

export function abortListening(): void {
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch {
    stopListening();
  }
}
