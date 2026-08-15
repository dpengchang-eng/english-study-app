export type LookupInput = {
  lemma: string;
  surface: string;
  sentenceContext: string;
};

export type LookupResult = {
  ipa: string;
  senses: string[];
  simpleEn: string;
};

export function emptyLookup(): LookupResult {
  return { ipa: "", senses: [], simpleEn: "" };
}

/** Fold whitespace so simpleEn is one line. */
export function oneLineSimpleEn(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Empty ipa/senses/simpleEn is a failed or blank lookup — do not keep it in memory. */
export function shouldRememberLookup(result: LookupResult): boolean {
  return Boolean(result.ipa || result.senses.length > 0 || result.simpleEn);
}

/** Same lemma in another sentence is a different lookup. */
export function lookupCacheKey(input: LookupInput): string {
  const lemma = input.lemma.trim().toLowerCase();
  const surface = input.surface.trim().toLowerCase();
  const sentence = input.sentenceContext.trim().toLowerCase();
  return `${surface || lemma}\n${sentence}`;
}

export function asLookup(raw: unknown): LookupResult {
  if (!raw || typeof raw !== "object") return emptyLookup();
  const data = raw as Record<string, unknown>;
  const ipa = typeof data.ipa === "string" ? data.ipa.trim() : "";
  const senses = Array.isArray(data.senses)
    ? data.senses.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3)
    : [];
  const simpleEn = typeof data.simpleEn === "string" ? oneLineSimpleEn(data.simpleEn) : "";
  return { ipa, senses, simpleEn };
}
