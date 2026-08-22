const GLOSS: Record<string, { ipa: string; senses: string[] }> = {
  awesome: { ipa: "/ˈɔːsəm/", senses: ["很棒的", "令人惊叹的"] },
  grab: { ipa: "/ɡræb/", senses: ["随手去（喝一杯、吃一点）", "抓住"] },
  pouring: { ipa: "/ˈpɔːrɪŋ/", senses: ["下着倾盆大雨"] },
  ducked: { ipa: "/dʌkt/", senses: ["躲进", "低头避开"] },
  cheaper: { ipa: "/ˈtʃiːpər/", senses: ["更便宜的"] },
  reviews: { ipa: "/rɪˈvjuːz/", senses: ["评价", "评论"] },
  collages: { ipa: "/kəˈlɑːʒɪz/", senses: ["拼贴画"] },
  switched: { ipa: "/swɪtʃt/", senses: ["改到", "换到"] },
  especially: { ipa: "/ɪˈspeʃəli/", senses: ["尤其", "特别"] },
  convenience: { ipa: "/kənˈviːniəns/", senses: ["便利"] },
  journey: { ipa: "/ˈdʒɜːrni/", senses: ["旅程", "过程"] },
  feature: { ipa: "/ˈfiːtʃər/", senses: ["功能", "特点"] },
  checking: { ipa: "/ˈtʃekɪŋ/", senses: ["检查", "确认"] },
  started: { ipa: "/ˈstɑːrtɪd/", senses: ["开始"] },
  stuff: { ipa: "/stʌf/", senses: ["事情", "东西"] },
  today: { ipa: "/təˈdeɪ/", senses: ["今天"] },
  apple: { ipa: "/ˈæpl/", senses: ["苹果"] }
};

export function lookupWord(word: string): { word: string; ipa: string; senses: string[] } {
  const key = word.toLowerCase().replace(/[^a-z']/g, "");
  const hit = GLOSS[key];
  if (hit) return { word: key || word, ...hit };
  return {
    word: key || word,
    ipa: "",
    senses: ["本地演示释义：先记这个词在本句里的用法。"]
  };
}
