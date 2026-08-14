import { requireOptionalNativeModule } from "expo";
import { useEffect, useRef } from "react";

export type SpeechLang = "zh-CN" | "en-US";

type SpeechNative = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: {
    lang: SpeechLang;
    interimResults: boolean;
    addsPunctuation: boolean;
    maxAlternatives: number;
  }) => void;
  stop: () => void;
  abort: () => void;
  addListener: (event: string, listener: (event: unknown) => void) => { remove: () => void };
};

function getSpeechNative(): SpeechNative | null {
  try {
    return requireOptionalNativeModule<SpeechNative>("ExpoSpeechRecognition");
  } catch {
    return null;
  }
}

/** False in Expo Go — the native module is not in that client. */
export function isSpeechAvailable(): boolean {
  const native = getSpeechNative();
  if (!native) return false;
  try {
    return native.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export function useSpeechEvents(handlers: {
  onResult: (text: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const native = getSpeechNative();
    if (!native) return;

    const resultSub = native.addListener("result", (event) => {
      const row = event as { results?: Array<{ transcript?: string }>; isFinal?: boolean };
      const text = row.results?.[0]?.transcript?.trim() ?? "";
      if (text) handlersRef.current.onResult(text, Boolean(row.isFinal));
    });
    const errorSub = native.addListener("error", (event) => {
      const code = (event as { error?: string }).error ?? "unknown";
      if (code === "not-allowed") {
        handlersRef.current.onError("没有麦克风或语音识别权限，请改用打字。");
      } else if (code === "no-speech") {
        handlersRef.current.onError("没有听到声音，请再说一次，或直接打字。");
      } else {
        handlersRef.current.onError("语音识别不可用，请改用打字。");
      }
    });
    const endSub = native.addListener("end", () => {
      handlersRef.current.onEnd();
    });

    return () => {
      resultSub.remove();
      errorSub.remove();
      endSub.remove();
    };
  }, []);
}

export async function startListening(lang: SpeechLang): Promise<void> {
  const native = getSpeechNative();
  if (!native) return;
  try {
    if (!native.isRecognitionAvailable()) return;
    const permission = await native.requestPermissionsAsync();
    if (!permission.granted) return;
    native.start({
      lang,
      interimResults: true,
      addsPunctuation: true,
      maxAlternatives: 1
    });
  } catch {
    // Expo Go or missing native module — typing still works
  }
}

export function stopListening(): void {
  try {
    getSpeechNative()?.stop();
  } catch {
    // already stopped or missing
  }
}

export function abortListening(): void {
  try {
    getSpeechNative()?.abort();
  } catch {
    stopListening();
  }
}
