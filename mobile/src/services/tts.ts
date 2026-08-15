import * as Speech from "expo-speech";

export const SPEAK_FAIL_TEXT = "朗读失败，请再试一次";

export type SpeakHandlers = {
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
};

let speakToken = 0;

function handlersOf(arg?: (() => void) | SpeakHandlers): SpeakHandlers {
  if (typeof arg === "function") return { onError: arg };
  return arg ?? {};
}

function speakNow(text: string, token: number, handlers: SpeakHandlers): void {
  Speech.speak(text, {
    language: "en-US",
    onDone: () => {
      if (token === speakToken) handlers.onDone?.();
    },
    onStopped: () => {
      if (token === speakToken) handlers.onStopped?.();
    },
    onError: () => {
      if (token === speakToken) handlers.onError?.();
    }
  });
}

/** Locked v1.1 listen: system American English. Ignore audioStatus / audioUrl. */
export function speakAmerican(text: string, onErrorOrHandlers?: (() => void) | SpeakHandlers): void {
  const trimmed = text.trim();
  const handlers = handlersOf(onErrorOrHandlers);
  if (!trimmed) {
    handlers.onDone?.();
    return;
  }
  const token = ++speakToken;
  try {
    Speech.stop();
    speakNow(trimmed, token, handlers);
  } catch {
    handlers.onError?.();
  }
}

/** Next sentence after onDone. Do not stop first — that would cancel the chain. */
export function continueSpeaking(text: string, onErrorOrHandlers?: (() => void) | SpeakHandlers): void {
  const trimmed = text.trim();
  const handlers = handlersOf(onErrorOrHandlers);
  if (!trimmed) {
    handlers.onDone?.();
    return;
  }
  const token = speakToken;
  try {
    speakNow(trimmed, token, handlers);
  } catch {
    handlers.onError?.();
  }
}

export function stopSpeaking(): void {
  speakToken += 1;
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}
