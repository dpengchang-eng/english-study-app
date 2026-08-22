import { useCallback, useMemo, useState } from "react";
import { addBlank, canUseSelect, gradeFill, optionPair, removeBlank } from "../services/cloze";
import { speakQueue } from "../services/tts";
import type { BlankDraft } from "../components/RewriteBlock";
import type { PracticeMode } from "../components/PracticeToolbar";
import type { Blank, JournalCard, Sentence } from "../types";

const SELECT_TOAST = "至少需要两个不同的填空，已切换到键盘填空";

export function usePractice(
  card: JournalCard | undefined,
  setBlanks: (blanks: Blank[]) => void
) {
  const [mode, setMode] = useState<PracticeMode>("read");
  const [showingOriginal, setShowingOriginal] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [drafts, setDrafts] = useState<BlankDraft>({});
  const [filledGreen, setFilledGreen] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [selectOptions, setSelectOptions] = useState<[string, string] | null>(null);
  const [selectBlankId, setSelectBlankId] = useState<string | null>(null);

  const blanks = card?.blanks ?? [];
  const sentences: Sentence[] = card?.sentences ?? [];
  const fillEnabled = blanks.length > 0;

  const showToast = useCallback((text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const enterFill = useCallback(() => {
    if (blanks.length === 0) return;
    setMode("fill");
    setHidden(false);
    setShowingOriginal(false);
  }, [blanks.length]);

  const enterSelect = useCallback(() => {
    if (!canUseSelect(blanks)) {
      showToast(SELECT_TOAST);
      if (blanks.length > 0) {
        setMode("fill");
        setHidden(false);
        setShowingOriginal(false);
      }
      setSelectOptions(null);
      return;
    }
    const first = blanks.find((blank) => !filledGreen[blank.id]) ?? blanks[0];
    if (!first) return;
    setMode("select");
    setHidden(false);
    setShowingOriginal(false);
    setSelectBlankId(first.id);
    setSelectOptions(optionPair(blanks));
  }, [blanks, filledGreen, showToast]);

  const onCheck = useCallback(
    (blankId: string) => {
      const blank = blanks.find((item) => item.id === blankId);
      if (!blank) return;
      const value = drafts[blankId]?.value ?? "";
      const ok = gradeFill(value, blank.answer);
      setDrafts((prev) => ({
        ...prev,
        [blankId]: { value: ok ? blank.answer : value, wrong: !ok, solved: ok }
      }));
      if (ok) setFilledGreen((prev) => ({ ...prev, [blankId]: true }));
    },
    [blanks, drafts]
  );

  const onDraftChange = useCallback((blankId: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [blankId]: { value, wrong: false, solved: Boolean(prev[blankId]?.solved) }
    }));
  }, []);

  const pickSelect = useCallback(
    (value: string) => {
      if (!selectBlankId) return;
      const blank = blanks.find((item) => item.id === selectBlankId);
      if (!blank) return;
      if (gradeFill(value, blank.answer)) {
        setFilledGreen((prev) => ({ ...prev, [selectBlankId]: true }));
        setDrafts((prev) => ({ ...prev, [selectBlankId]: { value: blank.answer, wrong: false, solved: true } }));
        const next = blanks.find((item) => item.id !== selectBlankId && !filledGreen[item.id]);
        if (next) {
          setSelectBlankId(next.id);
        } else {
          setSelectBlankId(null);
        }
      }
    },
    [blanks, filledGreen, selectBlankId]
  );

  const clozeWord = useCallback(
    (sentenceId: string, start: number, end: number) => {
      if (!card) return;
      const sentence = card.sentences.find((item) => item.id === sentenceId);
      if (!sentence) return;
      setBlanks(addBlank(card.blanks, sentence, start, end));
    },
    [card, setBlanks]
  );

  const remove = useCallback(
    (blankId: string) => {
      if (!card) return;
      setBlanks(removeBlank(card.blanks, blankId));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[blankId];
        return next;
      });
    },
    [card, setBlanks]
  );

  const playAll = useCallback(() => {
    speakQueue(sentences.map((sentence) => sentence.text));
  }, [sentences]);

  const displaySentences = useMemo(() => {
    if (showingOriginal && card) {
      return [{ id: "orig", text: card.body }];
    }
    return sentences;
  }, [card, sentences, showingOriginal]);

  return {
    mode,
    setMode,
    showingOriginal,
    setShowingOriginal,
    hidden,
    setHidden,
    drafts,
    filledGreen,
    toast,
    selectOptions,
    selectBlankId,
    setSelectBlankId,
    fillEnabled,
    displaySentences,
    enterFill,
    enterSelect,
    onCheck,
    onDraftChange,
    pickSelect,
    clozeWord,
    remove,
    playAll
  };
}
