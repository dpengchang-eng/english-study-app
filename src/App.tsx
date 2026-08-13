import { useEffect, useMemo, useRef, useState } from "react";
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signInAnonymously } from "firebase/auth";
import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";

type TabId = "dashboard" | "flashcards" | "quiz" | "review";
type QuizMode = "mcq" | "typing";

type Word = {
  id: string;
  english: string;
  korean: string;
  example: string;
  level: "basic" | "intermediate";
};

type WordProgress = {
  intervalDays: number;
  dueAt: string;
  streak: number;
  totalReviews: number;
  correctReviews: number;
  lastResult: "correct" | "wrong" | null;
};

type StudyStats = {
  totalSessions: number;
  totalAnswers: number;
  correctAnswers: number;
  studyDates: string[];
  streakCount: number;
  lastStudyDate: string | null;
};

type QuizQuestion = {
  wordId: string;
  prompt: string;
  answer: string;
  options: string[];
};

const STORAGE_KEY = "english-study-app-v1";

const STARTER_WORDS: Word[] = [
  { id: "w1", english: "achieve", korean: "성취하다", example: "You can achieve your goal with practice.", level: "basic" },
  { id: "w2", english: "improve", korean: "개선하다", example: "I want to improve my English speaking.", level: "basic" },
  { id: "w3", english: "schedule", korean: "일정", example: "My study schedule is every evening.", level: "basic" },
  { id: "w4", english: "confident", korean: "자신감 있는", example: "She feels confident before the test.", level: "basic" },
  { id: "w5", english: "review", korean: "복습하다", example: "Let's review yesterday's words.", level: "basic" },
  { id: "w6", english: "habit", korean: "습관", example: "Reading daily is a good habit.", level: "basic" },
  { id: "w7", english: "challenge", korean: "도전", example: "Learning pronunciation is a challenge.", level: "basic" },
  { id: "w8", english: "progress", korean: "진전", example: "You are making great progress.", level: "basic" },
  { id: "w9", english: "focus", korean: "집중하다", example: "Please focus on one sentence.", level: "basic" },
  { id: "w10", english: "practice", korean: "연습", example: "Practice makes your skills better.", level: "basic" },
  { id: "w11", english: "compare", korean: "비교하다", example: "Do not compare yourself to others.", level: "intermediate" },
  { id: "w12", english: "environment", korean: "환경", example: "A quiet environment helps study.", level: "intermediate" },
  { id: "w13", english: "opportunity", korean: "기회", example: "This class is a good opportunity.", level: "intermediate" },
  { id: "w14", english: "communicate", korean: "의사소통하다", example: "I want to communicate clearly in English.", level: "intermediate" },
  { id: "w15", english: "pronunciation", korean: "발음", example: "Her pronunciation is easy to understand.", level: "intermediate" },
  { id: "w16", english: "context", korean: "맥락", example: "Guess the meaning from the context.", level: "intermediate" },
  { id: "w17", english: "grammar", korean: "문법", example: "Grammar helps your writing accuracy.", level: "basic" },
  { id: "w18", english: "expression", korean: "표현", example: "That is a useful daily expression.", level: "intermediate" },
  { id: "w19", english: "describe", korean: "묘사하다", example: "Can you describe your hometown?", level: "basic" },
  { id: "w20", english: "conversation", korean: "대화", example: "We had a short conversation in English.", level: "basic" },
  { id: "w21", english: "translate", korean: "번역하다", example: "Try not to translate every sentence.", level: "intermediate" },
  { id: "w22", english: "memorize", korean: "암기하다", example: "It is easier to memorize with examples.", level: "intermediate" },
  { id: "w23", english: "efficient", korean: "효율적인", example: "Spaced review is an efficient method.", level: "intermediate" },
  { id: "w24", english: "repeat", korean: "반복하다", example: "Please repeat after me.", level: "basic" },
  { id: "w25", english: "fluently", korean: "유창하게", example: "He can speak fluently now.", level: "intermediate" }
];

const dayKey = (date = new Date()): string => date.toISOString().slice(0, 10);

const addMinutes = (base: Date, minutes: number): Date => {
  const next = new Date(base);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
};

const addDays = (base: Date, days: number): Date => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const createInitialProgress = (): Record<string, WordProgress> => {
  const now = new Date().toISOString();
  return Object.fromEntries(
    STARTER_WORDS.map((word) => [
      word.id,
      {
        intervalDays: 0,
        dueAt: now,
        streak: 0,
        totalReviews: 0,
        correctReviews: 0,
        lastResult: null
      }
    ])
  );
};

const createInitialStats = (): StudyStats => ({
  totalSessions: 0,
  totalAnswers: 0,
  correctAnswers: 0,
  studyDates: [],
  streakCount: 0,
  lastStudyDate: null
});

const getStreakFromDates = (dates: string[]): number => {
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  const cursor = new Date();
  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const randomFrom = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const pickOptions = (answer: string, allWords: Word[]): string[] => {
  const distractors = allWords
    .filter((word) => word.english !== answer)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((word) => word.english);
  return [answer, ...distractors].sort(() => Math.random() - 0.5);
};

const makeQuestion = (words: Word[]): QuizQuestion => {
  const chosen = randomFrom(words);
  return {
    wordId: chosen.id,
    prompt: `${chosen.korean} (${chosen.example})`,
    answer: chosen.english,
    options: pickOptions(chosen.english, words)
  };
};

const sortWordById = (a: Word, b: Word): number => Number(a.id.slice(1)) - Number(b.id.slice(1));

const withTodayStudyDate = (studyDates: string[], today: string): string[] =>
  Array.from(new Set([...studyDates, today])).sort();

const deriveStreakData = (studyDates: string[]): { streakCount: number; lastStudyDate: string | null } => ({
  streakCount: getStreakFromDates(studyDates),
  lastStudyDate: studyDates.length > 0 ? [...studyDates].sort()[studyDates.length - 1] ?? null : null
});

const toStatsFromUnknown = (raw: unknown): StudyStats => {
  const initial = createInitialStats();
  if (!raw || typeof raw !== "object") return initial;
  const candidate = raw as Partial<StudyStats>;
  const safeStudyDates = Array.isArray(candidate.studyDates)
    ? candidate.studyDates.filter((item): item is string => typeof item === "string")
    : [];
  return {
    totalSessions: typeof candidate.totalSessions === "number" ? candidate.totalSessions : 0,
    totalAnswers: typeof candidate.totalAnswers === "number" ? candidate.totalAnswers : 0,
    correctAnswers: typeof candidate.correctAnswers === "number" ? candidate.correctAnswers : 0,
    studyDates: safeStudyDates,
    streakCount: typeof candidate.streakCount === "number" ? candidate.streakCount : deriveStreakData(safeStudyDates).streakCount,
    lastStudyDate:
      typeof candidate.lastStudyDate === "string"
        ? candidate.lastStudyDate
        : deriveStreakData(safeStudyDates).lastStudyDate
  };
};

const createInitialProgressForWords = (words: Word[]): Record<string, WordProgress> => {
  const now = new Date().toISOString();
  return Object.fromEntries(
    words.map((word) => [
      word.id,
      {
        intervalDays: 0,
        dueAt: now,
        streak: 0,
        totalReviews: 0,
        correctReviews: 0,
        lastResult: null
      }
    ])
  );
};

const normalizeProgressData = (raw: unknown, fallbackDueAt: string): WordProgress => {
  if (!raw || typeof raw !== "object") {
    return {
      intervalDays: 0,
      dueAt: fallbackDueAt,
      streak: 0,
      totalReviews: 0,
      correctReviews: 0,
      lastResult: null
    };
  }
  const candidate = raw as Partial<WordProgress>;
  const lastResult =
    candidate.lastResult === "correct" || candidate.lastResult === "wrong" || candidate.lastResult === null
      ? candidate.lastResult
      : null;
  return {
    intervalDays: typeof candidate.intervalDays === "number" ? candidate.intervalDays : 0,
    dueAt: typeof candidate.dueAt === "string" ? candidate.dueAt : fallbackDueAt,
    streak: typeof candidate.streak === "number" ? candidate.streak : 0,
    totalReviews: typeof candidate.totalReviews === "number" ? candidate.totalReviews : 0,
    correctReviews: typeof candidate.correctReviews === "number" ? candidate.correctReviews : 0,
    lastResult
  };
};

const fromLegacyStorage = (
  words: Word[]
): {
  progress: Record<string, WordProgress>;
  stats: StudyStats;
} | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { progress?: Record<string, unknown>; stats?: unknown };
    const baseProgress = createInitialProgressForWords(words);
    Object.keys(baseProgress).forEach((wordId) => {
      if (parsed.progress?.[wordId]) {
        baseProgress[wordId] = normalizeProgressData(parsed.progress[wordId], baseProgress[wordId].dueAt);
      }
    });
    const baseStats = toStatsFromUnknown(parsed.stats);
    return {
      progress: baseProgress,
      stats: {
        ...baseStats,
        ...deriveStreakData(baseStats.studyDates)
      }
    };
  } catch {
    return null;
  }
};

export default function App() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Record<string, WordProgress>>(createInitialProgress);
  const [stats, setStats] = useState<StudyStats>(createInitialStats);
  const [uid, setUid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingWrites, setPendingWrites] = useState(0);

  const [flashIndex, setFlashIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [quizMode, setQuizMode] = useState<QuizMode>("mcq");
  const [quizActive, setQuizActive] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion | null>(null);
  const [typingAnswer, setTypingAnswer] = useState("");
  const [quizFeedback, setQuizFeedback] = useState<string>("");

  const [reviewActive, setReviewActive] = useState(false);
  const [reviewInput, setReviewInput] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const lastLoadedUidRef = useRef<string | null>(null);

  const isSaving = pendingWrites > 0;

  const runWrite = async (task: () => Promise<void>): Promise<void> => {
    setPendingWrites((prev) => prev + 1);
    try {
      await task();
      setLoadError(null);
    } catch {
      setLoadError("데이터 저장에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.");
    } finally {
      setPendingWrites((prev) => Math.max(0, prev - 1));
    }
  };

  const persistStats = async (userId: string, nextStats: StudyStats): Promise<void> => {
    await runWrite(async () => {
      await setDoc(
        doc(db, "users", userId),
        {
          ...nextStats,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    });
  };

  const persistProgressAndStats = async (
    userId: string,
    wordId: string,
    nextWordProgress: WordProgress,
    nextStats: StudyStats
  ): Promise<void> => {
    await runWrite(async () => {
      const batch = writeBatch(db);
      batch.set(
        doc(db, "users", userId, "progress", wordId),
        {
          ...nextWordProgress,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      batch.set(
        doc(db, "users", userId),
        {
          ...nextStats,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      await batch.commit();
    });
  };

  const seedStarterWordsIfMissing = async (): Promise<void> => {
    await Promise.all(
      STARTER_WORDS.map(async (word) => {
        const wordRef = doc(db, "words", word.id);
        const snapshot = await getDoc(wordRef);
        if (!snapshot.exists()) {
          await setDoc(wordRef, {
            english: word.english,
            korean: word.korean,
            example: word.example,
            level: word.level
          });
        }
      })
    );
  };

  const fetchWords = async (): Promise<Word[]> => {
    const wordsSnapshot = await getDocs(collection(db, "words"));
    if (wordsSnapshot.empty) return [];
    return wordsSnapshot.docs
      .map((wordDoc) => {
        const data = wordDoc.data() as Omit<Word, "id">;
        return {
          id: wordDoc.id,
          english: data.english,
          korean: data.korean,
          example: data.example,
          level: data.level
        };
      })
      .sort(sortWordById);
  };

  const initializeUserData = async (userId: string): Promise<void> => {
    setIsLoading(true);
    setLoadError(null);
    try {
      await seedStarterWordsIfMissing();

      const wordsFromDb = await fetchWords();
      const finalWords = wordsFromDb.length > 0 ? wordsFromDb : [...STARTER_WORDS].sort(sortWordById);
      setWords(finalWords);

      const userRef = doc(db, "users", userId);
      const progressRef = collection(db, "users", userId, "progress");

      const [userSnapshot, progressSnapshot] = await Promise.all([getDoc(userRef), getDocs(progressRef)]);

      let nextProgress = createInitialProgressForWords(finalWords);
      progressSnapshot.docs.forEach((progressDoc) => {
        if (!nextProgress[progressDoc.id]) return;
        nextProgress[progressDoc.id] = normalizeProgressData(progressDoc.data(), nextProgress[progressDoc.id].dueAt);
      });

      let nextStats = userSnapshot.exists() ? toStatsFromUnknown(userSnapshot.data()) : createInitialStats();
      nextStats = {
        ...nextStats,
        ...deriveStreakData(nextStats.studyDates)
      };

      // One-time migration from old localStorage data if this Firestore user has no saved state yet.
      if (!userSnapshot.exists() && progressSnapshot.empty) {
        const legacy = fromLegacyStorage(finalWords);
        if (legacy) {
          nextProgress = legacy.progress;
          nextStats = legacy.stats;

          const batch = writeBatch(db);
          Object.entries(nextProgress).forEach(([wordId, wordProgress]) => {
            batch.set(doc(db, "users", userId, "progress", wordId), {
              ...wordProgress,
              updatedAt: new Date().toISOString()
            });
          });
          batch.set(doc(db, "users", userId), {
            ...nextStats,
            migratedFromLocalStorage: true,
            updatedAt: new Date().toISOString()
          });
          await batch.commit();
          localStorage.removeItem(STORAGE_KEY);
        } else {
          await setDoc(
            doc(db, "users", userId),
            {
              ...nextStats,
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );
        }
      }

      setProgress(nextProgress);
      setStats(nextStats);
      setQuizQuestion(finalWords.length > 0 ? makeQuestion(finalWords) : null);
      setFlashIndex(0);
      setFlipped(false);
    } catch {
      setLoadError("Firebase에서 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setWords([...STARTER_WORDS].sort(sortWordById));
      setProgress(createInitialProgressForWords(STARTER_WORDS));
      setStats(createInitialStats());
      setQuizQuestion(makeQuestion(STARTER_WORDS));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setUid(user.uid);
      if (lastLoadedUidRef.current === user.uid) return;
      lastLoadedUidRef.current = user.uid;
      void initializeUserData(user.uid);
    });

    void (async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch {
        setLoadError("익명 로그인에 실패했습니다. 페이지를 새로고침해 주세요.");
        setIsLoading(false);
      }
    })();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (words.length > 0 && !quizQuestion) {
      setQuizQuestion(makeQuestion(words));
    }
  }, [words, quizQuestion]);

  const dueWordIds = useMemo(() => {
    const now = Date.now();
    return words.filter((word) => new Date(progress[word.id]?.dueAt ?? 0).getTime() <= now).map((word) => word.id);
  }, [progress, words]);

  const reviewWord = useMemo(() => words.find((word) => word.id === dueWordIds[0]) ?? null, [dueWordIds, words]);

  const learnedCount = useMemo(() => words.filter((word) => (progress[word.id]?.streak ?? 0) >= 3).length, [progress, words]);

  const today = dayKey();
  const accuracy = stats.totalAnswers > 0 ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100) : 0;
  const streak = stats.streakCount;
  const learnedRate = words.length > 0 ? (learnedCount / words.length) * 100 : 0;
  const flashWord = words.length > 0 ? words[flashIndex % words.length] : null;

  const recordSessionStart = (): void => {
    if (!uid) return;
    const nextDates = withTodayStudyDate(stats.studyDates, today);
    const nextStats: StudyStats = {
      ...stats,
      totalSessions: stats.totalSessions + 1,
      studyDates: nextDates,
      ...deriveStreakData(nextDates)
    };
    setStats(nextStats);
    void persistStats(uid, nextStats);
  };

  const buildAnsweredStats = (correct: boolean): StudyStats => {
    const nextDates = withTodayStudyDate(stats.studyDates, today);
    return {
      ...stats,
      totalAnswers: stats.totalAnswers + 1,
      correctAnswers: stats.correctAnswers + (correct ? 1 : 0),
      studyDates: nextDates,
      ...deriveStreakData(nextDates)
    };
  };

  const applyReviewResult = (wordId: string, correct: boolean): void => {
    if (!uid) return;
    const now = new Date();
    const current = progress[wordId];
    if (!current) return;

    const nextInterval = correct ? Math.max(1, Math.round((current.intervalDays || 0) * 1.9) || 1) : 0;
    const nextDue = correct ? addDays(now, nextInterval) : addMinutes(now, 20);
    const nextWordProgress: WordProgress = {
      ...current,
      intervalDays: nextInterval,
      dueAt: nextDue.toISOString(),
      streak: correct ? current.streak + 1 : 0,
      totalReviews: current.totalReviews + 1,
      correctReviews: current.correctReviews + (correct ? 1 : 0),
      lastResult: correct ? "correct" : "wrong"
    };
    const nextStats = buildAnsweredStats(correct);

    setProgress((prev) => ({
      ...prev,
      [wordId]: nextWordProgress
    }));
    setStats(nextStats);
    void persistProgressAndStats(uid, wordId, nextWordProgress, nextStats);
  };

  const nextFlashcard = (): void => {
    setFlipped(false);
    if (words.length > 0) {
      setFlashIndex((prev) => (prev + 1) % words.length);
    }
  };

  const handleFlashFeedback = (correct: boolean): void => {
    if (!flashWord) return;
    applyReviewResult(flashWord.id, correct);
    nextFlashcard();
  };

  const startQuiz = (): void => {
    if (words.length === 0) return;
    recordSessionStart();
    setQuizActive(true);
    setQuizQuestion(makeQuestion(words));
    setTypingAnswer("");
    setQuizFeedback("");
  };

  const submitQuizAnswer = (value: string): void => {
    if (!quizQuestion || words.length === 0) return;
    const normalized = value.trim().toLowerCase();
    const expected = quizQuestion.answer.toLowerCase();
    const correct = normalized === expected;
    applyReviewResult(quizQuestion.wordId, correct);
    setQuizFeedback(correct ? "정답입니다! 👍" : `아쉬워요. 정답: ${quizQuestion.answer}`);
    setQuizQuestion(makeQuestion(words));
    setTypingAnswer("");
  };

  const startReview = (): void => {
    recordSessionStart();
    setReviewActive(true);
    setReviewFeedback("");
    setReviewInput("");
  };

  const submitReviewTyping = (): void => {
    if (!reviewWord) return;
    const correct = reviewInput.trim().toLowerCase() === reviewWord.english.toLowerCase();
    applyReviewResult(reviewWord.id, correct);
    setReviewFeedback(correct ? "좋아요! 다음 단어로 넘어갑니다." : `정답은 "${reviewWord.english}" 입니다.`);
    setReviewInput("");
  };

  if (isLoading) {
    return (
      <div className="app-shell">
        <section className="panel">
          <h2>데이터 준비 중...</h2>
          <p className="hint">Firebase 인증 및 학습 데이터를 불러오고 있습니다.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-header">
        <div>
          <p className="eyebrow">English Study Loop</p>
          <h1>영어 공부 앱</h1>
          <p className="subtext">한국어 안내 + 영어 학습에 집중된 데일리 학습 루프</p>
        </div>
        <div className="badge">{today}</div>
      </header>

      {uid && <p className="hint">학습 사용자 ID: {uid.slice(0, 8)}...</p>}
      {isSaving && <p className="status">저장 중...</p>}
      {loadError && <p className="alert">{loadError}</p>}

      <nav className="tab-row">
        {[
          { id: "dashboard", label: "대시보드" },
          { id: "flashcards", label: "플래시카드" },
          { id: "quiz", label: "퀴즈" },
          { id: "review", label: "복습" }
        ].map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "tab active" : "tab"}
            onClick={() => setTab(item.id as TabId)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "dashboard" && (
        <section className="panel grid">
          <article className="metric">
            <h3>학습한 단어</h3>
            <p className="value">{learnedCount}</p>
            <p className="hint">총 {words.length}개 중 (연속 정답 3회 이상)</p>
          </article>
          <article className="metric">
            <h3>오늘 복습 대기</h3>
            <p className="value">{dueWordIds.length}</p>
            <p className="hint">복습 탭에서 바로 진행 가능</p>
          </article>
          <article className="metric">
            <h3>연속 학습일</h3>
            <p className="value">{streak}일</p>
            <p className="hint">하루라도 공부하면 유지됩니다</p>
          </article>
          <article className="metric">
            <h3>총 세션</h3>
            <p className="value">{stats.totalSessions}</p>
            <p className="hint">퀴즈/복습 시작 횟수</p>
          </article>
          <article className="metric wide">
            <h3>정답률</h3>
            <p className="value">{accuracy}%</p>
            <p className="hint">
              총 {stats.totalAnswers}문제 중 {stats.correctAnswers}개 정답
            </p>
            <div className="progress-track" aria-hidden>
              <div className="progress-fill" style={{ width: `${learnedRate}%` }} />
            </div>
          </article>
        </section>
      )}

      {tab === "flashcards" && (
        <section className="panel">
          <h2>플래시카드 학습</h2>
          <p className="hint">카드를 뒤집어 뜻/예문을 확인하고, 기억 정도를 선택하세요.</p>
          {flashWord ? (
            <>
              <button className="card" type="button" onClick={() => setFlipped((prev) => !prev)}>
                <p className="card-count">
                  {flashIndex + 1} / {words.length}
                </p>
                <h3>{flashWord.english}</h3>
                {flipped ? (
                  <div className="card-back">
                    <p className="korean">{flashWord.korean}</p>
                    <p>{flashWord.example}</p>
                    <p className="level">{flashWord.level === "basic" ? "기본 단어" : "중급 단어"}</p>
                  </div>
                ) : (
                  <p className="tap-help">탭해서 뜻 보기</p>
                )}
              </button>
              <div className="button-row">
                <button type="button" className="btn weak" onClick={() => handleFlashFeedback(false)}>
                  헷갈려요
                </button>
                <button type="button" className="btn strong" onClick={() => handleFlashFeedback(true)}>
                  기억했어요
                </button>
              </div>
            </>
          ) : (
            <div className="empty">
              <p>표시할 단어가 없습니다.</p>
            </div>
          )}
        </section>
      )}

      {tab === "quiz" && (
        <section className="panel">
          <h2>퀴즈</h2>
          <p className="hint">객관식과 타이핑 모드를 번갈아 학습하세요.</p>
          <div className="button-row">
            <button type="button" className={quizMode === "mcq" ? "toggle active" : "toggle"} onClick={() => setQuizMode("mcq")}>
              객관식
            </button>
            <button
              type="button"
              className={quizMode === "typing" ? "toggle active" : "toggle"}
              onClick={() => setQuizMode("typing")}
            >
              타이핑
            </button>
          </div>
          {!quizActive ? (
            <button type="button" className="btn strong full" onClick={startQuiz}>
              퀴즈 세션 시작
            </button>
          ) : (
            <div className="question-box">
              <p className="question-label">문제</p>
              {quizQuestion ? (
                <>
                  <p className="question">{quizQuestion.prompt}</p>
                  {quizMode === "mcq" ? (
                    <div className="options">
                      {quizQuestion.options.map((option) => (
                        <button type="button" key={option} className="option" onClick={() => submitQuizAnswer(option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        submitQuizAnswer(typingAnswer);
                      }}
                      className="typing-form"
                    >
                      <input
                        value={typingAnswer}
                        onChange={(event) => setTypingAnswer(event.target.value)}
                        placeholder="영어 단어를 입력하세요"
                      />
                      <button type="submit" className="btn strong">
                        제출
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <p className="question">문제를 불러오는 중입니다.</p>
              )}
              {quizFeedback && <p className="feedback">{quizFeedback}</p>}
            </div>
          )}
        </section>
      )}

      {tab === "review" && (
        <section className="panel">
          <h2>복습 큐</h2>
          <p className="hint">지금 복습할 단어: {dueWordIds.length}개</p>
          {!reviewActive ? (
            <button type="button" className="btn strong full" onClick={startReview}>
              복습 세션 시작
            </button>
          ) : reviewWord ? (
            <div className="question-box">
              <p className="question-label">뜻을 보고 영어 단어 입력</p>
              <p className="question">
                {reviewWord.korean} / <span className="example">{reviewWord.example}</span>
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitReviewTyping();
                }}
                className="typing-form"
              >
                <input
                  value={reviewInput}
                  onChange={(event) => setReviewInput(event.target.value)}
                  placeholder="정답 입력"
                />
                <button type="submit" className="btn strong">
                  확인
                </button>
              </form>
              <div className="button-row">
                <button type="button" className="btn weak" onClick={() => applyReviewResult(reviewWord.id, false)}>
                  모르겠어요
                </button>
                <button type="button" className="btn strong" onClick={() => applyReviewResult(reviewWord.id, true)}>
                  알고 있어요
                </button>
              </div>
              {reviewFeedback && <p className="feedback">{reviewFeedback}</p>}
            </div>
          ) : (
            <div className="empty">
              <p>지금은 복습할 단어가 없습니다. 훌륭해요! 🎉</p>
              <p>플래시카드나 퀴즈에서 새 단어를 학습해보세요.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
