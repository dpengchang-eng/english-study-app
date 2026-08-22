import { Platform } from "react-native";

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

type WebRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
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
const webHandlers: { current: SpeechHandlers | null } = { current: null };
let webRec: WebRec | null = null;

function webSpeechCtor(): (new () => WebRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => WebRec;
    webkitSpeechRecognition?: new () => WebRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

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

function useWebSpeechEvents(handlers: SpeechHandlers): void {
  webHandlers.current = handlers;
}

function useNoSpeechEvents(_handlers: SpeechHandlers): void {
  // Expo Go without the native module. Typing is the fallback.
}

/**
 * Chosen once at module load, so the hook call order never changes between renders.
 * Web uses the browser Speech API because the Expo native module does not run there.
 */
export const useSpeechEvents: (handlers: SpeechHandlers) => void =
  Platform.OS === "web" ? useWebSpeechEvents : nativeEvent ? useNativeSpeechEvents : useNoSpeechEvents;

function nativeAvailable(): boolean {
  return Boolean(speech.ExpoSpeechRecognitionModule?.isRecognitionAvailable?.());
}

export function isSpeechAvailable(): boolean {
  if (nativeAvailable()) return true;
  return Platform.OS === "web" && webSpeechCtor() !== null;
}

export async function startListening(lang: SpeechLang): Promise<void> {
  const mod = speech.ExpoSpeechRecognitionModule;
  if (Platform.OS !== "web" && nativeAvailable() && mod?.start) {
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
    return;
  }

  const Ctor = webSpeechCtor();
  if (!Ctor) {
    throw new Error("这台设备没有语音识别。请直接打字。");
  }
  stopWeb();
  const rec = new Ctor();
  webRec = rec;
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (event) => {
    let text = "";
    for (let i = 0; i < event.results.length; i += 1) {
      text += event.results[i]?.[0]?.transcript ?? "";
    }
    const last = event.results[event.results.length - 1];
    webHandlers.current?.onResult(text.trim(), Boolean(last?.isFinal));
  };
  rec.onerror = (event) => {
    webHandlers.current?.onError(errorMessage(event.error ?? "unknown"));
  };
  rec.onend = () => {
    webHandlers.current?.onEnd();
  };
  rec.start();
}

function stopWeb(): void {
  try {
    webRec?.stop();
  } catch {
    try {
      webRec?.abort();
    } catch {
      // already stopped
    }
  }
  webRec = null;
}

export function stopListening(): void {
  try {
    speech.ExpoSpeechRecognitionModule?.stop?.();
  } catch {
    // already stopped
  }
  stopWeb();
}

export function abortListening(): void {
  try {
    speech.ExpoSpeechRecognitionModule?.abort?.();
  } catch {
    stopListening();
    return;
  }
  stopWeb();
}
