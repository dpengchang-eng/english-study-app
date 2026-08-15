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

export function asLookup(raw: unknown): LookupResult {
  if (!raw || typeof raw !== "object") return emptyLookup();
  const data = raw as Record<string, unknown>;
  const ipa = typeof data.ipa === "string" ? data.ipa.trim() : "";
  const senses = Array.isArray(data.senses)
    ? data.senses.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3)
    : [];
  const simpleEn = typeof data.simpleEn === "string" ? data.simpleEn.trim() : "";
  return { ipa, senses, simpleEn };
}
