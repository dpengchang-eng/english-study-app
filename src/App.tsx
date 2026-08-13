import { useEffect, useMemo, useState } from "react";

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
  studyDates: []
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

export default function App() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [progress, setProgress] = useState<Record<string, WordProgress>>(createInitialProgress);
  const [stats, setStats] = useState<StudyStats>(createInitialStats);

  const [flashIndex, setFlashIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [quizMode, setQuizMode] = useState<QuizMode>("mcq");
  const [quizActive, setQuizActive] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion>(makeQuestion(STARTER_WORDS));
  const [typingAnswer, setTypingAnswer] = useState("");
  const [quizFeedback, setQuizFeedback] = useState<string>("");

  const [reviewActive, setReviewActive] = useState(false);
  const [reviewInput, setReviewInput] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { progress?: Record<string, WordProgress>; stats?: StudyStats };
      const mergedProgress = createInitialProgress();
      if (parsed.progress) {
        Object.keys(mergedProgress).forEach((key) => {
          if (parsed.progress?.[key]) {
            mergedProgress[key] = parsed.progress[key];
          }
        });
      }
      setProgress(mergedProgress);
      setStats(parsed.stats ?? createInitialStats());
    } catch {
      setProgress(createInitialProgress());
      setStats(createInitialStats());
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress, stats }));
  }, [progress, stats]);

  const dueWordIds = useMemo(() => {
    const now = Date.now();
    return STARTER_WORDS.filter((word) => new Date(progress[word.id]?.dueAt ?? 0).getTime() <= now).map((word) => word.id);
  }, [progress]);

  const reviewWord = useMemo(() => STARTER_WORDS.find((word) => word.id === dueWordIds[0]) ?? null, [dueWordIds]);

  const learnedCount = useMemo(
    () => STARTER_WORDS.filter((word) => (progress[word.id]?.streak ?? 0) >= 3).length,
    [progress]
  );

  const today = dayKey();
  const accuracy = stats.totalAnswers > 0 ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100) : 0;
  const streak = getStreakFromDates(stats.studyDates);
  const flashWord = STARTER_WORDS[flashIndex % STARTER_WORDS.length];

  const recordSessionStart = (): void => {
    setStats((prev) => ({
      ...prev,
      totalSessions: prev.totalSessions + 1,
      studyDates: Array.from(new Set([...prev.studyDates, today])).sort()
    }));
  };

  const recordAnswer = (correct: boolean): void => {
    setStats((prev) => ({
      ...prev,
      totalAnswers: prev.totalAnswers + 1,
      correctAnswers: prev.correctAnswers + (correct ? 1 : 0),
      studyDates: Array.from(new Set([...prev.studyDates, today])).sort()
    }));
  };

  const applyReviewResult = (wordId: string, correct: boolean): void => {
    const now = new Date();
    setProgress((prev) => {
      const current = prev[wordId];
      const nextInterval = correct ? Math.max(1, Math.round((current.intervalDays || 0) * 1.9) || 1) : 0;
      const nextDue = correct ? addDays(now, nextInterval) : addMinutes(now, 20);
      return {
        ...prev,
        [wordId]: {
          ...current,
          intervalDays: nextInterval,
          dueAt: nextDue.toISOString(),
          streak: correct ? current.streak + 1 : 0,
          totalReviews: current.totalReviews + 1,
          correctReviews: current.correctReviews + (correct ? 1 : 0),
          lastResult: correct ? "correct" : "wrong"
        }
      };
    });
    recordAnswer(correct);
  };

  const nextFlashcard = (): void => {
    setFlipped(false);
    setFlashIndex((prev) => (prev + 1) % STARTER_WORDS.length);
  };

  const handleFlashFeedback = (correct: boolean): void => {
    applyReviewResult(flashWord.id, correct);
    nextFlashcard();
  };

  const startQuiz = (): void => {
    recordSessionStart();
    setQuizActive(true);
    setQuizQuestion(makeQuestion(STARTER_WORDS));
    setTypingAnswer("");
    setQuizFeedback("");
  };

  const submitQuizAnswer = (value: string): void => {
    const normalized = value.trim().toLowerCase();
    const expected = quizQuestion.answer.toLowerCase();
    const correct = normalized === expected;
    applyReviewResult(quizQuestion.wordId, correct);
    setQuizFeedback(correct ? "정답입니다! 👍" : `아쉬워요. 정답: ${quizQuestion.answer}`);
    setQuizQuestion(makeQuestion(STARTER_WORDS));
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
            <p className="hint">총 {STARTER_WORDS.length}개 중 (연속 정답 3회 이상)</p>
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
              <div className="progress-fill" style={{ width: `${(learnedCount / STARTER_WORDS.length) * 100}%` }} />
            </div>
          </article>
        </section>
      )}

      {tab === "flashcards" && (
        <section className="panel">
          <h2>플래시카드 학습</h2>
          <p className="hint">카드를 뒤집어 뜻/예문을 확인하고, 기억 정도를 선택하세요.</p>
          <button className="card" type="button" onClick={() => setFlipped((prev) => !prev)}>
            <p className="card-count">
              {flashIndex + 1} / {STARTER_WORDS.length}
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
