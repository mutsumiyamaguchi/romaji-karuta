import { useState } from 'react';
import { romajiList } from './data/romaji.js';
import { shuffle } from './lib/shuffle.js';
import { getPoints, setPoints as savePoints } from './lib/pointsStorage.js';
import { getWeakKanas } from './lib/mistakesStorage.js';
import { getRevengeOptions } from './lib/settingsStorage.js';
import { MODES } from './lib/mode.js';
import Menu from './components/Menu.jsx';
import PlayContainer from './components/PlayContainer.jsx';
import Result from './components/Result.jsx';
import PinDialog from './components/PinDialog.jsx';
import MentorMenu from './components/MentorMenu.jsx';

export default function App() {
  // 画面モード: 'menu' | 'playing' | 'result' | 'mentor'
  const [mode, setMode] = useState('menu');
  const [playMode, setPlayMode] = useState(MODES.h2r);
  // 累計ポイントは localStorage から初期化（useState の lazy initializer を使い、
  // 初回レンダーから正しい値で表示する。useEffect 経由だと一瞬 0 が見えてからの
  // 更新になり、子供向けにチカチカするので避ける）
  const [points, setPointsState] = useState(() => getPoints());

  // リベンジ設定は localStorage から取得し、メンター画面を閉じたタイミングで再取得する。
  const [revengeOptions, setRevengeOptions] = useState(() => getRevengeOptions());

  // PIN 入力ダイアログ（ロゴ長押しで開く）
  const [pinOpen, setPinOpen] = useState(false);

  // セッションごとに変わるデータ
  const [questions, setQuestions] = useState([]);
  const [score, setScore] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // ゲームの開始
  //   targetRow: 'random' | 'weak' | 'あ' | 'か' | ...
  //   selectedMode: 'h2r' | 'r2h' | 'H2R'
  const startGame = (targetRow, selectedMode = MODES.h2r) => {
    let selectedQuestions;
    if (targetRow === 'random') {
      selectedQuestions = shuffle([...romajiList]).slice(0, 15);
    } else if (targetRow === 'weak') {
      // にがてだけ: F8 で記録した苦手な h からセットを組み立てる
      const weakKanas = getWeakKanas(15);
      selectedQuestions = weakKanas
        .map((h) => romajiList.find((item) => item.h === h))
        .filter(Boolean);
      // セーフティ: 念のため空ならランダム 15 問にフォールバック
      if (selectedQuestions.length === 0) {
        selectedQuestions = shuffle([...romajiList]).slice(0, 15);
      }
    } else {
      selectedQuestions = romajiList.filter((item) => item.row === targetRow);
    }

    setPlayMode(selectedMode);
    setQuestions(selectedQuestions);
    setScore(0);
    setEarnedPoints(0);
    setMode('playing');
  };

  // PlayContainer から正解時に呼ばれる（+10 加算）
  const handlePointsChange = (delta) => {
    setScore((s) => s + 1);
    setEarnedPoints((p) => p + delta);
    setPointsState((prev) => {
      const next = prev + delta;
      savePoints(next);
      return next;
    });
  };

  const handleFinished = () => {
    setMode('result');
  };

  const goBackToMenu = () => {
    setMode('menu');
  };

  const handleMentorAccess = () => {
    setPinOpen(true);
  };

  const handlePinSuccess = () => {
    setPinOpen(false);
    setMode('mentor');
  };

  const handleMentorClose = () => {
    // メンター画面で設定変更されている可能性があるので再読み込み
    setRevengeOptions(getRevengeOptions());
    setMode('menu');
  };

  return (
    <>
      {mode === 'menu' && (
        <Menu
          points={points}
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
      {mode === 'mentor' && <MentorMenu onClose={handleMentorClose} />}
      {pinOpen && (
        <PinDialog
          onSuccess={handlePinSuccess}
          onCancel={() => setPinOpen(false)}
        />
      )}
    </>
  );
}
