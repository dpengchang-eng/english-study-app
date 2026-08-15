import { geminiLookup } from "./geminiLookup";
import { emptyLookup, type LookupInput, type LookupResult } from "./lookupParse";

export type { LookupInput, LookupResult } from "./lookupParse";

const LOCAL: Record<string, LookupResult> = {
  coffee: { ipa: "/ˈkɔfi/", senses: ["咖啡", "咖啡豆", "咖啡色"], simpleEn: "Coffee is a hot drink." },
  grab: { ipa: "/ɡræb/", senses: ["随手拿", "赶紧去做", "抓住"], simpleEn: "Grab means to take something quickly." },
  like: { ipa: "/laɪk/", senses: ["喜欢", "像", "想要"], simpleEn: "Like means you enjoy something." },
  work: { ipa: "/wɜrk/", senses: ["行得通", "工作", "起作用"], simpleEn: "Work can mean a job, or that a plan is okay." },
  sometime: { ipa: "/ˈsʌmtaɪm/", senses: ["改天", "某个时候"], simpleEn: "Sometime means at a later time." },
  you: { ipa: "/ju/", senses: ["你", "你们"], simpleEn: "You is the person I am talking to." },
  that: { ipa: "/ðæt/", senses: ["那", "那个"], simpleEn: "That points to something we both know." },
  does: { ipa: "/dʌz/", senses: ["（助动词）做"], simpleEn: "Does helps ask a question." },
  i: { ipa: "/aɪ/", senses: ["我"], simpleEn: "I is the person who is speaking." },
  id: { ipa: "/aɪd/", senses: ["我愿意", "我会"], simpleEn: "I'd is a short way to say I would." }
};

const memory = new Map<string, LookupResult>();

function clipLookup(result: LookupResult): LookupResult {
  return {
    ipa: result.ipa,
    senses: result.senses.slice(0, 3),
    simpleEn: result.simpleEn.trim()
  };
}

function fromLocal(lemma: string): LookupResult | undefined {
  return LOCAL[lemma.toLowerCase().replace(/['’]/g, "")];
}

export async function lookupWord(input: LookupInput): Promise<LookupResult> {
  try {
    const lemma = input.lemma.trim();
    const surface = input.surface.trim();
    const key = (lemma || surface).toLowerCase();
    const cached = memory.get(key);
    if (cached) return cached;
    const local = fromLocal(key) ?? fromLocal(surface);
    if (local) {
      const clipped = clipLookup(local);
      memory.set(key, clipped);
      return clipped;
    }
    const remote = await geminiLookup({
      lemma,
      surface,
      sentenceContext: input.sentenceContext
    });
    const clipped = clipLookup(remote);
    memory.set(key, clipped);
    return clipped;
  } catch {
    return emptyLookup();
  }
}

export async function lookupPhrase(phrase: string, lemma: string, sentenceContext = ""): Promise<LookupResult> {
  return lookupWord({ lemma, surface: phrase, sentenceContext });
}

export function resetLookupMemory(): void {
  memory.clear();
}
