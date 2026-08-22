import { DEMO_USER_ID, UNCATEGORIZED_ID, type Collection, type JournalCard } from "../types";

function at(y: number, m: number, d: number, hh: number, mm: number): number {
  return Date.UTC(y, m - 1, d, hh, mm);
}

function card(
  partial: Omit<JournalCard, "collectionId" | "images" | "blanks" | "rewriteRadio"> & {
    collectionId?: string;
    images?: string[];
    blanks?: JournalCard["blanks"];
    rewriteRadio?: JournalCard["rewriteRadio"];
  }
): JournalCard {
  return {
    collectionId: UNCATEGORIZED_ID,
    images: [],
    blanks: [],
    rewriteRadio: 1,
    ...partial
  };
}

export const DEMO_USER = { id: DEMO_USER_ID, isPro: true };

export const SEED_COLLECTIONS: Collection[] = [{ id: UNCATEGORIZED_ID, name: "未分类" }];

export const SEED_CARDS: JournalCard[] = [
  card({
    id: "c-busy-day",
    title: "忙碌日检查语言功能",
    body: "今天事情好多，我就先检查一下语言功能好不好用。怎么开始比较好？哦，真不错。这个功能挺好的，我每天都能推进自己的学习，再看看有意思的新闻。太感谢了。把这个苹果给我，我天天卖。",
    rewrite:
      "Hey, today I've got a ton of stuff to do, so I'm just checking one thing.\nHow can I get started the best way?\nOh, it's awesome.\nThis feature is really great, so now I can drive my journey every day and learn some interesting news.\nThank you so much.\nGive me this apple and I'll sell it every day.",
    sentences: [
      { id: "s0", text: "Hey, today I've got a ton of stuff to do, so I'm just checking one thing." },
      { id: "s1", text: "How can I get started the best way?" },
      { id: "s2", text: "Oh, it's awesome." },
      {
        id: "s3",
        text: "This feature is really great, so now I can drive my journey every day and learn some interesting news."
      },
      { id: "s4", text: "Thank you so much." },
      { id: "s5", text: "Give me this apple and I'll sell it every day." }
    ],
    reply: "这几句很口语。awesome 用在这里刚刚好。",
    blanks: [
      { id: "s2:9-16", sentenceId: "s2", start: 9, end: 16, answer: "awesome" },
      { id: "s5:13-18", sentenceId: "s5", start: 13, end: 18, answer: "apple" }
    ],
    createdAt: at(2026, 8, 20, 14, 55)
  }),
  card({
    id: "c-yiwu-boxes",
    title: "1688义乌购买纸箱更便宜",
    body: "在1688找义乌的纸箱，比别的地方便宜不少。",
    rewrite: "Buying cartons from Yiwu on 1688 is a lot cheaper.",
    sentences: [{ id: "s0", text: "Buying cartons from Yiwu on 1688 is a lot cheaper." }],
    reply: "这句话短、清楚，适合记进生活英语。",
    createdAt: at(2026, 8, 20, 12, 10)
  }),
  card({
    id: "c-9102-reviews",
    title: "查找9102真实中国评价对比",
    body: "想查一下 9102 在国内的真实评价，跟国外对比一下。",
    rewrite: "I'm looking up real reviews of the 9102 in China and comparing them.",
    sentences: [{ id: "s0", text: "I'm looking up real reviews of the 9102 in China and comparing them." }],
    reply: "look up 和 compare 都是很常用的说法。",
    createdAt: at(2026, 8, 19, 9, 40)
  }),
  card({
    id: "c-collage-map",
    title: "文件为拼贴非全国图",
    body: "这些文件其实是拼贴，不是全国地图。",
    rewrite: "These files are collages, not a nationwide map.",
    sentences: [{ id: "s0", text: "These files are collages, not a nationwide map." }],
    reply: "collage 这个词记一下就够用了。",
    createdAt: at(2026, 8, 18, 16, 5)
  }),
  card({
    id: "c-coffee",
    title: "约咖啡",
    body: "我想跟你约个时间喝咖啡，看看你方不方便。",
    rewrite: "I'd like to grab coffee with you sometime — does that work for you?",
    sentences: [{ id: "s0", text: "I'd like to grab coffee with you sometime — does that work for you?" }],
    reply: "grab coffee 比 have a coffee 更日常。",
    createdAt: at(2026, 7, 22, 3, 20)
  }),
  card({
    id: "c-train",
    title: "高铁改签",
    body: "下午的高铁满了，我改到晚上那班。",
    rewrite: "The afternoon high-speed train is full, so I switched to the evening one.",
    sentences: [{ id: "s0", text: "The afternoon high-speed train is full, so I switched to the evening one." }],
    reply: "switched to 很自然。",
    createdAt: at(2026, 7, 5, 8, 0)
  }),
  card({
    id: "c-market",
    title: "菜市场西红柿",
    body: "今天菜市场的西红柿特别甜。",
    rewrite: "The tomatoes at the wet market were especially sweet today.",
    sentences: [{ id: "s0", text: "The tomatoes at the wet market were especially sweet today." }],
    reply: "wet market 比 vegetable market 更地道。",
    createdAt: at(2026, 6, 18, 2, 15)
  }),
  card({
    id: "c-rain",
    title: "下班下雨",
    body: "下班的时候突然下大雨，我在便利店躲了一下。",
    rewrite: "It started pouring right as I got off work, so I ducked into a convenience store.",
    sentences: [
      { id: "s0", text: "It started pouring right as I got off work, so I ducked into a convenience store." }
    ],
    reply: "pouring 和 ducked into 都值得挖空。",
    createdAt: at(2026, 6, 8, 11, 45)
  })
];
