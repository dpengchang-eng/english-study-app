import * as Speech from "expo-speech";

export const SPEAK_FAIL_TEXT = "朗读失败，请再试一次";
export const SPEAK_EMPTY_TEXT = "没有可朗读的句子";

export type SpeakHandlers = {
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
};

let speakToken = 0;
/** True only while we want audio. Stop without this lets a queued first line start after 查词. */
let speechWanted = false;

function handlersOf(arg?: (() => void) | SpeakHandlers): SpeakHandlers {
  if (typeof arg === "function") return { onError: arg };
  return arg ?? {};
}

function speakNow(text: string, token: number, handlers: SpeakHandlers): void {
  Speech.speak(text, {
    language: "en-US",
    onStart: () => {
      if (!speechWanted) {
        try {
          Speech.stop();
        } catch {
          // ignore
        }
      }
    },
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
  const shouldStop = speechWanted;
  speechWanted = true;
  try {
    // Only stop when something is already live. Idle start + extra Speech.stop swallows sentence 1.
    if (shouldStop) Speech.stop();
    speakNow(trimmed, token, handlers);
  } catch {
    speechWanted = false;
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
  speechWanted = true;
  try {
    speakNow(trimmed, token, handlers);
  } catch {
    speechWanted = false;
    handlers.onError?.();
  }
}

export function stopSpeaking(): void {
  speechWanted = false;
  speakToken += 1;
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}
