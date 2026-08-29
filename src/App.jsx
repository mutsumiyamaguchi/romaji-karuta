import { useEffect, useState } from 'react';
import { romajiList, STEPS } from './data/romaji.js';
import { shuffle } from './lib/shuffle.js';
import { MODES, LETTER_CASES } from './lib/mode.js';
import {
  getCurrentStudentId,
  setCurrentStudentId,
} from './lib/currentStudent.js';

// letterCase の永続化キー（romajiCurrentStudentId と同じ命名スタイル）
const LETTER_CASE_KEY = 'romajiLetterCase';

// localStorage から letterCase を読み込み。未保存 / SSR / 不正値は 'upper' に倒す。
const readLetterCase = () => {
  if (typeof window === 'undefined') return LETTER_CASES.upper;
  try {
    const v = window.localStorage.getItem(LETTER_CASE_KEY);
    return v === LETTER_CASES.lower ? LETTER_CASES.lower : LETTER_CASES.upper;
  } catch {
    return LETTER_CASES.upper;
  }
};
import * as studentsApi from './lib/api/students.js';
import * as pointsApi from './lib/api/points.js';
import * as progressApi from './lib/api/progress.js';
import * as mistakesApi from './lib/api/mistakes.js';
import * as mentorApi from './lib/api/mentor.js';
import Menu from './components/Menu.jsx';
import PlayContainer from './components/PlayContainer.jsx';
import Result from './components/Result.jsx';
import PinDialog from './components/PinDialog.jsx';
import MentorMenu from './components/MentorMenu.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import ErrorScreen from './components/ErrorScreen.jsx';
import SetupScreen from './components/SetupScreen.jsx';
import AssessmentMenu from './components/AssessmentMenu.jsx';
import AssessmentRun from './components/AssessmentRun.jsx';

export default function App() {
  // ロード状態
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  // 生徒
  const [students, setStudents] = useState([]);
  const [currentSid, setCurrentSid] = useState(() => getCurrentStudentId());
  const currentStudent = students.find((s) => s.id === currentSid) ?? null;

  // セッション
  const [points, setPoints] = useState(0);
  const [progress, setProgress] = useState(null);

  // 画面モード
  const [mode, setMode] = useState('menu'); // menu | playing | result | mentor
  const [playMode, setPlayMode] = useState(MODES.h2r);
  const [letterCase, setLetterCase] = useState(() => readLetterCase());
  const [gameLetterCase, setGameLetterCase] = useState(letterCase);
  const [pinOpen, setPinOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [score, setScore] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [practiceUnitId, setPracticeUnitId] = useState(null);
  const [assessmentRun, setAssessmentRun] = useState(null);
  const [lastMistakes, setLastMistakes] = useState([]);
  const [isRetry, setIsRetry] = useState(false);

  // letterCase 変更 → localStorage に保存
  const handleLetterCaseChange = (value) => {
    if (value !== LETTER_CASES.upper && value !== LETTER_CASES.lower) return;
    setLetterCase(value);
    try {
      window.localStorage.setItem(LETTER_CASE_KEY, value);
    } catch {
      // ignore
    }
  };

  // 起動時の初期化
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [initialized, list] = await Promise.all([
          mentorApi.getStatus(),
          studentsApi.listStudents(),
        ]);
        if (!alive) return;
        setStudents(list);
        if (!initialized || list.length === 0) {
          setNeedsSetup(true);
          setLoading(false);
          return;
        }
        let sid = getCurrentStudentId();
        if (!sid || !list.some((s) => s.id === sid)) {
          sid = list[0].id;
          setCurrentStudentId(sid);
        }
        setCurrentSid(sid);
        const p = await pointsApi.getPoints(sid);
        const nextProgress = await progressApi.getProgress(sid);
        if (!alive) return;
        setPoints(p);
        setProgress(nextProgress);
        setLoading(false);
      } catch (err) {
        if (!alive) return;
        setLoadError(err.message ?? 'unknown error');
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 通常ゲーム開始
  const startGame = async (
    targetRow,
    selectedMode = MODES.h2r,
    selectedLetterCase = LETTER_CASES.upper
  ) => {
    if (!progress) return;
    const allowedUnits = new Set((progress?.access ?? []).filter((item) => item.access !== 'locked').map((item) => item.unitId));
    let qs;
    // ステップ別ランダム 15 問: 各 step から 15 問抽出
    const stepForTarget =
      targetRow === 'random-seion'
        ? STEPS.seion
        : targetRow === 'random-dakuon'
          ? STEPS.dakuon
          : targetRow === 'random-youon'
            ? STEPS.youon
            : null;
    if (stepForTarget) {
      const pool = romajiList.filter((it) => it.step === stepForTarget);
      qs = shuffle(pool).slice(0, 15);
    } else if (targetRow === 'random') {
      // 後方互換: 全文字からのランダム（旧 UI 名残り用）
      qs = shuffle([...romajiList]).slice(0, 15);
    } else if (targetRow === 'weak') {
      try {
        const weakChars = await mistakesApi.getWeakCharacters(currentSid, 15);
        qs = weakChars
          .map((h) => romajiList.find((it) => it.h === h))
          .filter(Boolean);
      } catch {
        qs = [];
      }
      if (qs.length === 0) qs = shuffle([...romajiList]).slice(0, 15);
    } else {
      qs = romajiList.filter((it) => it.row === targetRow);
    }
    // row/random/weakの全入口を同じaccess policyへ通す。
    if (progress) qs = qs.filter((item) => allowedUnits.has(`${item.step}:${item.row}`));
    if (qs.length === 0) return;
    setPlayMode(selectedMode);
    setGameLetterCase(selectedLetterCase);
    setQuestions(qs);
    setScore(0);
    setEarnedPoints(0);
    setLastMistakes([]);
    setIsRetry(false);
    setPracticeUnitId(qs.length > 0 && qs.every((q) => q.row === targetRow) ? qs[0].unitId ?? `${qs[0].step}:${qs[0].row}` : null);
    setMode('playing');
  };

  // 間違えた問題だけで再プレイ（ノーポイント）
  const handleRetryWrongOnly = () => {
    if (lastMistakes.length === 0) return;
    setQuestions(lastMistakes);
    setScore(0);
    setEarnedPoints(0);
    setLastMistakes([]);
    setIsRetry(true);
    setMode('playing');
  };

  // 通常練習中は正解数だけを数える。報酬は全問終了時にサーバーが検証する。
  const handlePointsChange = () => {
    setScore((s) => s + 1);
  };

  // 再挑戦モードの正解カウント。ポイントは増やさない。
  const handleRetryCorrect = () => {
    setScore((s) => s + 1);
  };

  // PlayContainer から終了通知（mistakes を受け取る）
  const handleFinished = async (mistakes) => {
    setLastMistakes(mistakes ?? []);
    if (!isRetry && currentSid && practiceUnitId && (mistakes ?? []).length === 0) {
      try {
        const result = await progressApi.completePractice(currentSid, {
          unitId: practiceUnitId,
          answers: questions.map((question) => ({ promptCharacterId: question.r, selectedChoiceId: question.r })),
          retry: false,
          mode: playMode,
        });
        setEarnedPoints(result.awarded);
        setPoints(result.totalPoints);
      } catch {
        setEarnedPoints(0);
      }
    }
    setMode('result');
  };

  const goBackToMenu = async () => {
    setIsRetry(false);
    setLastMistakes([]);
    setMode('menu');
    if (currentSid) {
      try {
        const nextProgress = await progressApi.getProgress(currentSid);
        setPoints(nextProgress.totalPoints);
        setProgress(nextProgress);
      } catch {
        // ignore
      }
    }
  };

  const handleMentorAccess = () => setPinOpen(true);
  const handlePinSuccess = () => {
    setPinOpen(false);
    setMode('mentor');
  };
  const handleMentorClose = async () => {
    try {
      const list = await studentsApi.listStudents();
      setStudents(list);
      let sid = currentSid;
      if (!list.some((s) => s.id === sid)) {
        sid = list[0]?.id ?? null;
        setCurrentStudentId(sid);
        setCurrentSid(sid);
      }
      if (sid) {
        const p = await pointsApi.getPoints(sid);
        setPoints(p);
      } else {
        setPoints(0);
      }
    } catch {
      // ignore
    }
    setMode('menu');
  };

  const handleSelectStudent = async (id) => {
    if (id === currentSid) return;
    setCurrentStudentId(id);
    setCurrentSid(id);
    setProgress(null);
    try {
      const nextProgress = await progressApi.getProgress(id);
      setPoints(nextProgress.totalPoints);
      setProgress(nextProgress);
    } catch {
      setPoints(0);
      setProgress(null);
    }
  };

  const handleSetupComplete = async () => {
    try {
      const list = await studentsApi.listStudents();
      setStudents(list);
      if (list.length > 0) {
        const sid = list[0].id;
        setCurrentStudentId(sid);
        setCurrentSid(sid);
        const nextProgress = await progressApi.getProgress(sid);
        setPoints(nextProgress.totalPoints);
        setProgress(nextProgress);
      }
      setNeedsSetup(false);
    } catch (err) {
      setLoadError(err.message ?? 'setup completion failed');
    }
  };

  if (loading) return <LoadingScreen />;
  if (loadError)
    return (
      <ErrorScreen
        message={loadError}
        onRetry={() => window.location.reload()}
      />
    );
  if (needsSetup) return <SetupScreen onComplete={handleSetupComplete} />;

  if (mode === 'mentor') {
    return (
      <MentorMenu
        students={students}
        currentStudentId={currentSid}
        onClose={handleMentorClose}
      />
    );
  }

  if (mode === 'assessment') {
    return <AssessmentMenu progress={progress} onBack={() => setMode('menu')} onOpen={async (step, unlocked) => {
      try {
        if (!unlocked) await progressApi.unlockAssessment(currentSid, step);
        const attempt = await progressApi.startAssessment(currentSid, step);
        const nextProgress = await progressApi.getProgress(currentSid);
        setProgress(nextProgress);
        setPoints(nextProgress.totalPoints);
        setAssessmentRun({ step, state: attempt });
        setMode('assessment-run');
      } catch { /* 状態は再取得時に復帰できる */ }
    }} />;
  }

  if (mode === 'assessment-run' && assessmentRun) {
    return <AssessmentRun studentId={currentSid} step={assessmentRun.step} initialState={assessmentRun.state} letterCase={letterCase} points={points} onBack={async () => {
      const nextProgress = await progressApi.getProgress(currentSid).catch(() => progress);
      setProgress(nextProgress);
      setAssessmentRun(null);
      setMode('assessment');
    }} onPassed={async () => {
      const nextProgress = await progressApi.getProgress(currentSid);
      setProgress(nextProgress);
    }} />;
  }

  return (
    <>
      {mode === 'menu' && (
        <Menu
          points={points}
          availablePoints={progress?.availablePoints ?? points}
          progress={progress}
          currentStudent={currentStudent}
          students={students}
          onSelectStudent={handleSelectStudent}
          onStart={startGame}
          onMentorAccess={handleMentorAccess}
          onAssessment={() => setMode('assessment')}
          letterCase={letterCase}
          onLetterCaseChange={handleLetterCaseChange}
        />
      )}
      {mode === 'playing' && (
        <PlayContainer
          initialQuestions={questions}
          points={points}
          mode={playMode}
          letterCase={gameLetterCase}
          studentId={currentSid}
          isRetry={isRetry}
          onFinished={handleFinished}
          onPointsChange={isRetry ? handleRetryCorrect : handlePointsChange}
          onBack={goBackToMenu}
        />
      )}
      {mode === 'result' && (
        <Result
          score={score}
          questions={questions}
          earnedPoints={earnedPoints}
          mistakes={lastMistakes}
          isRetry={isRetry}
          onBack={goBackToMenu}
          onRetryWrongOnly={handleRetryWrongOnly}
        />
      )}
      {pinOpen && (
        <PinDialog
          onSuccess={handlePinSuccess}
          onCancel={() => setPinOpen(false)}
        />
      )}
    </>
  );
}
