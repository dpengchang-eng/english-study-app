import { useEffect } from "react";

export type SpeechLang = "zh-CN" | "en-US";

type SpeechModule = {
  ExpoSpeechRecognitionModule?: {
    isRecognitionAvailable?: () => boolean;
    requestPermissionsAsync?: () => Promise<{ granted: boolean }>;
    start?: (options: Record<string, unknown>) => void;
    stop?: () => void;
    abort?: () => void;
  };
  useSpeechRecognitionEvent?: (event: string, handler: (payload: never) => void) => void;
};

function loadSpeech(): SpeechModule {
  try {
    return require("expo-speech-recognition") as SpeechModule;
  } catch {
    return {};
  }
}

const speech = loadSpeech();

export function useSpeechEvents(handlers: {
  onResult: (text: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): void {
  const hook = speech.useSpeechRecognitionEvent;
  if (hook) {
    hook("result", (event: { results?: Array<{ transcript?: string }>; isFinal?: boolean }) => {
      const text = event.results?.[0]?.transcript?.trim() ?? "";
      if (text) handlers.onResult(text, Boolean(event.isFinal));
    });
    hook("error", (event: { error?: string }) => {
      const code = event.error ?? "unknown";
      if (code === "not-allowed") {
        handlers.onError("没有麦克风或语音识别权限，请改用打字。");
      } else if (code === "no-speech") {
        handlers.onError("没有听到声音，请再说一次，或直接打字。");
      } else {
        handlers.onError("语音识别不可用，请改用打字。");
      }
    });
    hook("end", () => {
      handlers.onEnd();
    });
    return;
  }
  useEffect(() => {
    // Expo Go / web without the native module: typing still works.
  }, []);
}

export async function startListening(lang: SpeechLang): Promise<void> {
  const mod = speech.ExpoSpeechRecognitionModule;
  const available = Boolean(mod?.isRecognitionAvailable?.());
  if (!available || !mod?.start) {
    throw new Error("这台设备没有语音识别。请直接打字。");
  }
  const permission = await mod.requestPermissionsAsync?.();
  if (permission && !permission.granted) {
    throw new Error("没有语音权限。请到系统设置打开，或直接打字。");
  }
  mod.start({
    lang,
    interimResults: true,
    addsPunctuation: true,
    maxAlternatives: 1
  });
}

export function stopListening(): void {
  try {
    speech.ExpoSpeechRecognitionModule?.stop?.();
  } catch {
    // already stopped
  }
}

export function abortListening(): void {
  try {
    speech.ExpoSpeechRecognitionModule?.abort?.();
  } catch {
    stopListening();
  }
}
