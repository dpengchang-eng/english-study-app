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

/** Landing pin is one-shot. Later dayIds refreshes must not wipe user toggles. */
export type ReviewPinState = {
  pinned: string[] | null;
  checked: string[];
  consumed: boolean;
};

export function applyReviewPinEffect(state: ReviewPinState, dayIds: string): ReviewPinState {
  if (state.pinned) {
    return { pinned: null, checked: [...state.pinned], consumed: true };
  }
  if (state.consumed) {
    return { pinned: null, checked: state.checked, consumed: true };
  }
  return { pinned: null, checked: dayIds ? dayIds.split("\0") : [], consumed: false };
}

export function toggleReviewChecked(state: ReviewPinState, id: string): ReviewPinState {
  const next = new Set(state.checked);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return { pinned: null, checked: [...next], consumed: true };
}

export function resetReviewPinForDay(dayIds: string): ReviewPinState {
  return { pinned: null, checked: dayIds ? dayIds.split("\0") : [], consumed: false };
}
