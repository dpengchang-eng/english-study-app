import * as Speech from "expo-speech";

let token = 0;

export function stopSpeaking(): void {
  token += 1;
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}

export function speakEnglish(text: string, onDone?: () => void): void {
  const trimmed = text.trim();
  if (!trimmed) {
    onDone?.();
    return;
  }
  const current = ++token;
  try {
    Speech.stop();
    Speech.speak(trimmed, {
      language: "en-US",
      rate: 0.92,
      onDone: () => {
        if (current === token) onDone?.();
      },
      onStopped: () => {
        if (current === token) onDone?.();
      },
      onError: () => {
        if (current === token) onDone?.();
      }
    });
  } catch {
    onDone?.();
  }
}

export function speakQueue(lines: string[]): void {
  const pending = lines.map((line) => line.trim()).filter(Boolean);
  const play = (index: number): void => {
    if (index >= pending.length) return;
    speakEnglish(pending[index] ?? "", () => play(index + 1));
  };
  play(0);
}
