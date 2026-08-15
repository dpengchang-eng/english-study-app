export type ReviewFocus = {
  dayKey: string;
  checkedIds: string[];
};

let pending: ReviewFocus | null = null;

/** One-shot: 放回复习 lands on that Seoul day with those ids checked. */
export function queueReviewFocus(focus: ReviewFocus): void {
  pending = { dayKey: focus.dayKey, checkedIds: [...focus.checkedIds] };
}

export function takeReviewFocus(): ReviewFocus | null {
  const next = pending;
  pending = null;
  return next;
}
