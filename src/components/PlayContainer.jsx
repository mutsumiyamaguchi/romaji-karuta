import { useEffect, useRef, useState } from 'react';
import { romajiList } from '../data/romaji.js';
import { shuffle } from '../lib/shuffle.js';
import { MODES, pickRomaji } from '../lib/mode.js';
import { recordMistake } from '../lib/api/mistakes.js';
import Play from './Play.jsx';

// 選択肢（札）の生成
//   正解 + ランダムな不正解 3 つを混ぜ、それぞれにカルタっぽい傾きを付与。
//   alts を持つ文字（し: si/shi など）は displayR をここで固定し、
//   セッション中に表示が揺れないようにする。
const generateChoices = (correctItem) => {
  const others = romajiList.filter((item) => item.r !== correctItem.r);
  const shuffledOthers = shuffle(others).slice(0, 3);
  return shuffle([correctItem, ...shuffledOthers]).map((c) => ({
    ...c,
    rotation: Math.floor(Math.random() * 12) - 6,
    displayR: pickRomaji(c),
  }));
};

// プレイ画面のコンテナ
//
// シンプルな進行管理: 受け取った問題を順番に消化し、全問終了で onFinished(mistakes) を呼ぶ。
// 強制リベンジ（即時/サマリー）は廃止。間違えた問題は mistakes として収集し、
// 結果画面で手動「やり直す」ボタンから別セッションで挑戦できる。
//
// props:
//   initialQuestions: 出題する問題の初期セット
//   points: 表示用の累計ポイント
//   mode: 'h2r' | 'r2h' | 'H2R'
//   studentId: そにもつ記録の宛先
//   onFinished: (mistakes: Question[]) => void  全問終了時
//   onPointsChange: (delta: number) => void     正解時。やり直しモードのときは App 側で score だけ増やすハンドラに差し替えられる。
//   onBack: () => void  もどるボタン
export default function PlayContainer({
  initialQuestions,
  points,
  mode = MODES.h2r,
  studentId,
  onFinished,
  onPointsChange,
  onBack,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mistakes, setMistakes] = useState([]);

  const currentQuestion = initialQuestions[currentIndex] ?? null;

  // 現在問題に対する札（render 中の derived state パターン）
  const [choicesForIndex, setChoicesForIndex] = useState(-1);
  const [choices, setChoices] = useState([]);
  if (currentQuestion && choicesForIndex !== currentIndex) {
    setChoicesForIndex(currentIndex);
    setChoices(generateChoices(currentQuestion));
  }

  // フィードバック表示
  const [feedback, setFeedback] = useState(null); // 'correct' | 'incorrect' | null
  const [isAnimating, setIsAnimating] = useState(false);

  // タイマー
  const advanceTimerRef = useRef(null);

  // 全問終了の通知（重複発火しないようガード）
  const finishedFiredRef = useRef(false);
  useEffect(() => {
    const isFinished = currentIndex >= initialQuestions.length;
    if (isFinished && !finishedFiredRef.current) {
      finishedFiredRef.current = true;
      onFinished?.(mistakes);
    }
  }, [currentIndex, initialQuestions.length, mistakes, onFinished]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    };
  }, []);

  const advanceAfterFeedback = () => {
    if (advanceTimerRef.current !== null) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      setFeedback(null);
      setIsAnimating(false);
      setCurrentIndex((i) => i + 1);
    }, 2000);
  };

  const handleCorrect = () => {
    setIsAnimating(true);
    setFeedback('correct');
    onPointsChange?.(10);
    advanceAfterFeedback();
  };

  const handleIncorrect = () => {
    setIsAnimating(true);
    setFeedback('incorrect');
    if (currentQuestion) {
      setMistakes((arr) => [...arr, currentQuestion]);
      if (studentId) {
        recordMistake(studentId, {
          character: currentQuestion.h,
          mode,
        }).catch(() => {});
      }
    }
    advanceAfterFeedback();
  };

  const handleBack = () => {
    if (advanceTimerRef.current !== null) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setFeedback(null);
    setIsAnimating(false);
    onBack?.();
  };

  // 終了後（onFinished 後）は描画しない。App 側で 'result' に切り替わる
  if (currentIndex >= initialQuestions.length) {
    return null;
  }

  // currentQuestion に displayR を付与（読み札と取り札の表記揃え）
  const currentChoice = choices.find((c) => c.h === currentQuestion?.h);
  const currentQWithDisplay = currentQuestion
    ? { ...currentQuestion, displayR: currentChoice?.displayR }
    : currentQuestion;

  return (
    <Play
      currentQ={currentQWithDisplay}
      currentQuestionIndex={currentIndex}
      questions={{ length: initialQuestions.length }}
      choices={choices}
      points={points}
      feedback={feedback}
      isAnimating={isAnimating}
      onCorrect={handleCorrect}
      onIncorrect={handleIncorrect}
      onBack={handleBack}
      mode={mode}
    />
  );
}
