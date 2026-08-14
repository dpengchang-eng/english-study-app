import { rewriteLookup } from "./geminiLookup";

export type LookupResult = {
  ipa: string;
  senses: string[];
};

const LOCAL: Record<string, LookupResult> = {
  coffee: { ipa: "/ˈkɔfi/", senses: ["咖啡", "咖啡豆", "咖啡色"] },
  grab: { ipa: "/ɡræb/", senses: ["随手拿", "赶紧去做", "抓住"] },
  like: { ipa: "/laɪk/", senses: ["喜欢", "像", "想要"] },
  work: { ipa: "/wɜrk/", senses: ["行得通", "工作", "起作用"] },
  sometime: { ipa: "/ˈsʌmtaɪm/", senses: ["改天", "某个时候"] },
  you: { ipa: "/ju/", senses: ["你", "你们"] },
  that: { ipa: "/ðæt/", senses: ["那", "那个"] },
  does: { ipa: "/dʌz/", senses: ["（助动词）做"] },
  i: { ipa: "/aɪ/", senses: ["我"] },
  id: { ipa: "/aɪd/", senses: ["我愿意", "我会"] }
};

const memory = new Map<string, LookupResult>();

function fromLocal(lemma: string): LookupResult | undefined {
  return LOCAL[lemma.toLowerCase().replace(/['’]/g, "")];
}

export async function lookupPhrase(phrase: string, lemma: string): Promise<LookupResult> {
  try {
    const key = (lemma || phrase).toLowerCase().trim();
    const cached = memory.get(key);
    if (cached) return cached;
    const local = fromLocal(key) ?? fromLocal(phrase);
    if (local) {
      const clipped = { ipa: local.ipa, senses: local.senses.slice(0, 3) };
      memory.set(key, clipped);
      return clipped;
    }
    const remote = await rewriteLookup(phrase || lemma);
    if (remote) {
      const clipped = { ipa: remote.ipa, senses: remote.senses.slice(0, 3) };
      memory.set(key, clipped);
      return clipped;
    }
    return { ipa: "", senses: ["暂无中文释义"] };
  } catch {
    return { ipa: "", senses: ["查词失败，请再试一次"] };
  }
}
