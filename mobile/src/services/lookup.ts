export type LookupResult = {
  ipa: string;
  senses: string[];
  simpleEn: string;
  pos: string;
};

const LOCAL: Record<string, LookupResult> = {
  coffee: { ipa: "/ˈkɔfi/", pos: "noun", senses: ["咖啡", "咖啡豆", "咖啡色"], simpleEn: "a hot drink from coffee beans" },
  grab: { ipa: "/ɡræb/", pos: "verb", senses: ["随手拿", "赶紧去做", "抓住"], simpleEn: "take something quickly" },
  like: { ipa: "/laɪk/", pos: "verb", senses: ["喜欢", "像", "想要"], simpleEn: "enjoy something, or similar to" },
  work: { ipa: "/wɜrk/", pos: "verb", senses: ["行得通", "工作", "起作用"], simpleEn: "be OK, or do a job" },
  sometime: { ipa: "/ˈsʌmtaɪm/", pos: "adverb", senses: ["改天", "某个时候"], simpleEn: "at some later time" },
  you: { ipa: "/ju/", pos: "pronoun", senses: ["你", "你们"], simpleEn: "the person I am talking to" },
  that: { ipa: "/ðæt/", pos: "pronoun", senses: ["那", "那个"], simpleEn: "the thing we just talked about" },
  does: { ipa: "/dʌz/", pos: "verb", senses: ["（助动词）做"], simpleEn: "used to ask a question" },
  i: { ipa: "/aɪ/", pos: "pronoun", senses: ["我"], simpleEn: "me" },
  id: { ipa: "/aɪd/", pos: "verb", senses: ["我愿意", "我会"], simpleEn: "I would" }
};

const memory = new Map<string, LookupResult>();

function fromLocal(lemma: string): LookupResult | undefined {
  return LOCAL[lemma.toLowerCase().replace(/['’]/g, "")];
}

export function clipLookup(result: LookupResult): LookupResult {
  return {
    ipa: result.ipa,
    pos: (result.pos ?? "").trim(),
    senses: result.senses.slice(0, 3),
    simpleEn: (result.simpleEn ?? "").trim()
  };
}

export function parseLookupResult(raw: unknown): LookupResult | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const ipa = typeof data.ipa === "string" ? data.ipa.trim() : "";
  const pos = typeof data.pos === "string" ? data.pos.trim() : "";
  const senses = Array.isArray(data.senses)
    ? data.senses.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3)
    : [];
  const simpleEn = typeof data.simpleEn === "string" ? data.simpleEn.trim() : "";
  if (senses.length === 0) return null;
  return { ipa, pos, senses, simpleEn };
}

export async function lookupWord(query: {
  lemma: string;
  surface: string;
  sentenceContext: string;
}): Promise<LookupResult> {
  try {
    const surface = query.surface.trim();
    const lemma = query.lemma.trim();
    const key = (surface || lemma).toLowerCase();
    const cached = memory.get(key);
    if (cached) return cached;
    const local = fromLocal(key) ?? fromLocal(lemma) ?? fromLocal(surface);
    if (local) {
      const clipped = clipLookup(local);
      memory.set(key, clipped);
      return clipped;
    }
    const { rewriteLookup } = await import("./geminiLookup");
    const remote = await rewriteLookup(query);
    if (remote) {
      const clipped = clipLookup(remote);
      memory.set(key, clipped);
      return clipped;
    }
    return { ipa: "", pos: "", senses: [], simpleEn: "" };
  } catch {
    return { ipa: "", pos: "", senses: [], simpleEn: "" };
  }
}
