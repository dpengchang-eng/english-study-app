export type LookupResult = {
  ipa: string;
  senses: string[];
  simpleEn: string;
};

const LOCAL: Record<string, LookupResult> = {
  coffee: { ipa: "/ˈkɔfi/", senses: ["咖啡", "咖啡豆", "咖啡色"], simpleEn: "a hot drink from coffee beans" },
  grab: { ipa: "/ɡræb/", senses: ["随手拿", "赶紧去做", "抓住"], simpleEn: "take something quickly" },
  like: { ipa: "/laɪk/", senses: ["喜欢", "像", "想要"], simpleEn: "enjoy something, or similar to" },
  work: { ipa: "/wɜrk/", senses: ["行得通", "工作", "起作用"], simpleEn: "be OK, or do a job" },
  sometime: { ipa: "/ˈsʌmtaɪm/", senses: ["改天", "某个时候"], simpleEn: "at some later time" },
  you: { ipa: "/ju/", senses: ["你", "你们"], simpleEn: "the person I am talking to" },
  that: { ipa: "/ðæt/", senses: ["那", "那个"], simpleEn: "the thing we just talked about" },
  does: { ipa: "/dʌz/", senses: ["（助动词）做"], simpleEn: "used to ask a question" },
  i: { ipa: "/aɪ/", senses: ["我"], simpleEn: "me" },
  id: { ipa: "/aɪd/", senses: ["我愿意", "我会"], simpleEn: "I would" }
};

const memory = new Map<string, LookupResult>();

function fromLocal(lemma: string): LookupResult | undefined {
  return LOCAL[lemma.toLowerCase().replace(/['’]/g, "")];
}

export function clipLookup(result: LookupResult): LookupResult {
  return {
    ipa: result.ipa,
    senses: result.senses.slice(0, 3),
    simpleEn: (result.simpleEn ?? "").trim()
  };
}

export function parseLookupResult(raw: unknown): LookupResult | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const ipa = typeof data.ipa === "string" ? data.ipa.trim() : "";
  const senses = Array.isArray(data.senses)
    ? data.senses.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3)
    : [];
  const simpleEn = typeof data.simpleEn === "string" ? data.simpleEn.trim() : "";
  if (senses.length === 0) return null;
  return { ipa, senses, simpleEn };
}

export async function lookupPhrase(phrase: string, lemma: string): Promise<LookupResult> {
  try {
    const key = (lemma || phrase).toLowerCase().trim();
    const cached = memory.get(key);
    if (cached) return cached;
    const local = fromLocal(key) ?? fromLocal(phrase);
    if (local) {
      const clipped = clipLookup(local);
      memory.set(key, clipped);
      return clipped;
    }
    const { rewriteLookup } = await import("./geminiLookup");
    const remote = await rewriteLookup(phrase || lemma);
    if (remote) {
      const clipped = clipLookup(remote);
      memory.set(key, clipped);
      return clipped;
    }
    return { ipa: "", senses: ["暂无中文释义"], simpleEn: "" };
  } catch {
    return { ipa: "", senses: ["查词失败，请再试一次"], simpleEn: "" };
  }
}
