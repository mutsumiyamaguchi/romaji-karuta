import { useEffect, useState } from 'react';
import { romajiList } from './data/romaji.js';
import { shuffle } from './lib/shuffle.js';
import { MODES } from './lib/mode.js';
import {
  getCurrentStudentId,
  setCurrentStudentId,
} from './lib/currentStudent.js';
import * as studentsApi from './lib/api/students.js';
import * as pointsApi from './lib/api/points.js';
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

export default function App() {
  // ロード状態
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  // 生徒
  const [students, setStudents] = useState([]);
  const [currentSid, setCurrentSid] = useState(() => getCurrentStudentId());
  const currentStudent = students.find((s) => s.id === currentSid) ?? null;

  // セッション・設定
  const [points, setPoints] = useState(0);
  const [revengeOptions, setRevengeOptions] = useState({
    immediate: true,
    summary: true,
  });

  // 画面モード
  const [mode, setMode] = useState('menu'); // menu | playing | result | mentor
  const [playMode, setPlayMode] = useState(MODES.h2r);
  const [pinOpen, setPinOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [score, setScore] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // 起動時の初期化
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [initialized, list, config] = await Promise.all([
          mentorApi.getStatus(),
          studentsApi.listStudents(),
          mentorApi.getConfig(),
        ]);
        if (!alive) return;
        setRevengeOptions(config);
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
        if (!alive) return;
        setPoints(p);
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

  // ゲーム開始
  const startGame = async (targetRow, selectedMode = MODES.h2r) => {
    let qs;
    if (targetRow === 'random') {
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
    setPlayMode(selectedMode);
    setQuestions(qs);
    setScore(0);
    setEarnedPoints(0);
    setMode('playing');
  };

  // 正解時 (delta=10)。サーバ加算は楽観 UI で待たない。
  const handlePointsChange = (delta) => {
    setScore((s) => s + 1);
    setEarnedPoints((p) => p + delta);
    setPoints((p) => p + delta);
    if (currentSid) {
      pointsApi.addPoints(currentSid, delta).catch(() => {
        // サーバ加算失敗は静かに無視（メニューに戻ったときに再取得で整合）
      });
    }
  };

  const handleFinished = () => setMode('result');

  const goBackToMenu = async () => {
    setMode('menu');
    // セッションのポイントとサーバの点数を整合させる（加算失敗があった場合）
    if (currentSid) {
      try {
        const p = await pointsApi.getPoints(currentSid);
        setPoints(p);
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
    // 生徒削除/追加 / 設定変更 / PIN変更 の可能性 → 全部リフレッシュ
    try {
      const [list, config] = await Promise.all([
        studentsApi.listStudents(),
        mentorApi.getConfig(),
      ]);
      setStudents(list);
      setRevengeOptions(config);
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
    try {
      const p = await pointsApi.getPoints(id);
      setPoints(p);
    } catch {
      setPoints(0);
    }
  };

  const handleSetupComplete = async () => {
    // セットアップ画面で initPin + createStudent が完了している前提でリロード
    try {
      const list = await studentsApi.listStudents();
      setStudents(list);
      if (list.length > 0) {
        const sid = list[0].id;
        setCurrentStudentId(sid);
        setCurrentSid(sid);
        const p = await pointsApi.getPoints(sid);
        setPoints(p);
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
        revengeOptions={revengeOptions}
        onClose={handleMentorClose}
      />
    );
  }

  return (
    <>
      {mode === 'menu' && (
        <Menu
          points={points}
          currentStudent={currentStudent}
          students={students}
          onSelectStudent={handleSelectStudent}
          onStart={startGame}
          onMentorAccess={handleMentorAccess}
        />
      )}
      {mode === 'playing' && (
        <PlayContainer
          initialQuestions={questions}
          points={points}
          mode={playMode}
          revengeOptions={revengeOptions}
          studentId={currentSid}
          onFinished={handleFinished}
          onPointsChange={handlePointsChange}
          onBack={goBackToMenu}
        />
      )}
      {mode === 'result' && (
        <Result
          score={score}
          questions={questions}
          earnedPoints={earnedPoints}
          onBack={goBackToMenu}
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
