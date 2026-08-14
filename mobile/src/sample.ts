import type { ConversionResult } from "./types";

export const SAMPLE_INPUT = "我想跟你约个时间喝咖啡，看看你方不方便。";

export const SAMPLE_CONVERSION: ConversionResult = {
  sourceText: SAMPLE_INPUT,
  sourceLang: "zh",
  rewrittenText: "I'd like to grab coffee with you sometime — does that work for you?",
  sentences: [
    {
      text: "I'd like to grab coffee with you sometime — does that work for you?",
      words: [
        { word: "I'd", definition: "I would; a natural spoken contraction.", zh: "我想" },
        { word: "like", definition: "used to make a polite request or wish.", zh: "想要" },
        { word: "to", definition: "marks the verb that follows.", zh: "（不定式）" },
        { word: "grab", definition: "informal: get or do something quickly, here meet for coffee.", zh: "随便喝一杯" },
        { word: "coffee", definition: "a coffee drink, or a casual meetup over coffee.", zh: "咖啡" },
        { word: "with", definition: "together with someone.", zh: "和" },
        { word: "you", definition: "the person being spoken to.", zh: "你" },
        { word: "sometime", definition: "at an unspecified time in the future.", zh: "找个时间" },
        { word: "does", definition: "helps form a yes/no question.", zh: "（助动词）" },
        { word: "that", definition: "refers to the suggested plan.", zh: "那样" },
        { word: "work", definition: "be convenient or possible.", zh: "方便；行得通" },
        { word: "for", definition: "from the point of view of someone.", zh: "对……来说" },
        { word: "you", definition: "the person being asked.", zh: "你" }
      ]
    }
  ]
};
