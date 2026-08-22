export type SpeechLang = "zh-CN" | "en-US";

export type SpeechHandlers = {
  onResult: (text: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onEnd: () => void;
};

type ResultEvent = { results?: Array<{ transcript?: string }>; isFinal?: boolean };
type ErrorEvent = { error?: string };

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
const nativeEvent = speech.useSpeechRecognitionEvent;

function errorMessage(code: string): string {
  if (code === "not-allowed") return "没有麦克风或语音识别权限，请改用打字。";
  if (code === "no-speech") return "没有听到声音，请再说一次，或直接打字。";
  return "语音识别不可用，请改用打字。";
}

function useNativeSpeechEvents(handlers: SpeechHandlers): void {
  const subscribe = nativeEvent as NonNullable<SpeechModule["useSpeechRecognitionEvent"]>;
  subscribe("result", ((event: ResultEvent) => {
    const text = event.results?.[0]?.transcript?.trim() ?? "";
    if (text) handlers.onResult(text, Boolean(event.isFinal));
  }) as (payload: never) => void);
  subscribe("error", ((event: ErrorEvent) => {
    handlers.onError(errorMessage(event.error ?? "unknown"));
  }) as (payload: never) => void);
  subscribe("end", (() => {
    handlers.onEnd();
  }) as (payload: never) => void);
}

function useNoSpeechEvents(_handlers: SpeechHandlers): void {
  // Expo Go without the native module. Typing is the fallback.
}

/**
 * Chosen once at module load, so the hook call order never changes between renders.
 */
export const useSpeechEvents: (handlers: SpeechHandlers) => void = nativeEvent
  ? useNativeSpeechEvents
  : useNoSpeechEvents;

export function isSpeechAvailable(): boolean {
  return Boolean(speech.ExpoSpeechRecognitionModule?.isRecognitionAvailable?.());
}

export async function startListening(lang: SpeechLang): Promise<void> {
  const mod = speech.ExpoSpeechRecognitionModule;
  if (!isSpeechAvailable() || !mod?.start) {
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
