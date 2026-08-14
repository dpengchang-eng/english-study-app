import type { PracticeCard, WordbookItem } from "../types";
import { findBlankSpan } from "./srs";

export function toPracticeCard(item: WordbookItem): PracticeCard {
  const span =
    item.blankSpan.end > item.blankSpan.start
      ? item.blankSpan
      : findBlankSpan(item.sentenceContext, item.phrase);
  return {
    itemId: item.id,
    sentence: item.sentenceContext,
    blankSpan: span,
    answer: item.phrase
  };
}

export function renderCloze(card: PracticeCard): { before: string; after: string } {
  const { sentence, blankSpan } = card;
  if (blankSpan.end > blankSpan.start && blankSpan.end <= sentence.length) {
    return {
      before: sentence.slice(0, blankSpan.start),
      after: sentence.slice(blankSpan.end)
    };
  }
  return { before: sentence + "\n\n", after: "" };
}
