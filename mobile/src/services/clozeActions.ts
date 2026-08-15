/** Sync busy + card-advance guards for 过 / 下一题. React `busy` state is too late. */

export function nextClozePosition(index: number, cardCount: number): { index: number; settled: boolean } {
  if (cardCount <= 0 || index + 1 >= cardCount) return { index, settled: true };
  return { index: index + 1, settled: false };
}

export type PassAndNextResult =
  | { status: "blocked" }
  | { status: "failed" }
  | { status: "passed"; index: number; settled: boolean };

export async function passAndNextOnce(input: {
  busyRef: { current: boolean };
  advancedIndexRef: { current: number | null };
  index: number;
  cardCount: number;
  wasCorrect: boolean;
  writeGood: () => Promise<void>;
}): Promise<PassAndNextResult> {
  if (!input.wasCorrect || input.busyRef.current || input.advancedIndexRef.current === input.index) {
    return { status: "blocked" };
  }
  input.busyRef.current = true;
  try {
    await input.writeGood();
    input.advancedIndexRef.current = input.index;
    return { status: "passed", ...nextClozePosition(input.index, input.cardCount) };
  } catch {
    return { status: "failed" };
  } finally {
    input.busyRef.current = false;
  }
}

export type FinishCardResult = { status: "blocked" } | { status: "advanced"; index: number; settled: boolean };

export function finishCardOnce(input: {
  busyRef: { current: boolean };
  advancedIndexRef: { current: number | null };
  index: number;
  cardCount: number;
}): FinishCardResult {
  if (input.busyRef.current || input.advancedIndexRef.current === input.index) {
    return { status: "blocked" };
  }
  input.advancedIndexRef.current = input.index;
  return { status: "advanced", ...nextClozePosition(input.index, input.cardCount) };
}
