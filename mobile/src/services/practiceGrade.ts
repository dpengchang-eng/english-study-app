export function normalizeAnswer(value: string): string {
  return value.toLowerCase().replace(/['’]/g, "").replace(/\s+/g, " ").trim();
}

/** Full phrase only. Do not accept one word from a multi-word phrase. */
export function acceptedAnswers(phrase: string, id: string): string[] {
  const full = normalizeAnswer(phrase);
  if (!full) return [];
  const accepted = [full];
  const fromId = normalizeAnswer(id.replace(/-/g, " "));
  if (fromId && fromId !== full && fromId.split(" ").length === full.split(" ").length) {
    accepted.push(fromId);
  }
  return accepted;
}

function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const grid: number[][] = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (__, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      grid[i][j] = Math.min(grid[i - 1][j] + 1, grid[i][j - 1] + 1, grid[i - 1][j - 1] + cost);
    }
  }
  return grid[a.length][b.length];
}

export function isCorrectGuess(guess: string, accepted: string[], expected: string): boolean {
  const value = normalizeAnswer(guess);
  if (!value) return false;
  if (accepted.includes(value)) return true;
  const expectedNorm = normalizeAnswer(expected);
  if (!expectedNorm) return false;
  if (expectedNorm.split(" ").length > 1 && value.split(" ").length !== expectedNorm.split(" ").length) {
    return false;
  }
  return expectedNorm.length >= 5 && editDistance(value, expectedNorm) <= 1;
}

export type StoredAnswer = { expected: string; accepted: string[] };

/** Memory first, then persisted session key, then the wordbook phrase. */
export function answerFromSources(
  memoryRow: StoredAnswer | undefined,
  stored: StoredAnswer | undefined,
  item: { id: string; phrase: string } | undefined
): StoredAnswer | null {
  if (memoryRow?.expected) return memoryRow;
  if (stored?.expected) return stored;
  if (item?.phrase) return { expected: item.phrase, accepted: acceptedAnswers(item.phrase, item.id) };
  return null;
}
