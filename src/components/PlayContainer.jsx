import { useEffect, useMemo, useRef, useState } from 'react';
import { romajiList } from '../data/romaji.js';
import { shuffle } from '../lib/shuffle.js';
import { useRevenge } from '../lib/useRevenge.js';
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
    rotation: Math.floor(Math.random() * 12) - 6, // -6度から+5度
    displayR: pickRomaji(c),
  }));
};

// プレイ画面のコンテナ
//
// props:
//   initialQuestions, points, mode, revengeOptions, onFinished, onPointsChange, onBack: 既存通り
//   studentId: 現在の生徒 ID。recordMistake API を呼ぶときの subject。
export default function PlayContainer({
  initialQuestions,
  points,
  mode = MODES.h2r,
  revengeOptions,
  studentId,
  onFinished,
  onPointsChange,
  onBack,
}) {
  // リベンジオプションのデフォルト（仕様書 §4.3 両方 ON）
  const options = useMemo(
    () => ({ immediate: true, summary: true, ...(revengeOptions ?? {}) }),
    [revengeOptions]
  );

  const revenge = useRevenge(initialQuestions, options);

  // 現在問題に対する札（表示用）
  //   React 公式の「derive state during render」パターン: 直前のキー値（currentIndex）を
  //   state として保持し、変わった瞬間にレンダー中で setState する。
  //   ref を render 中に触ると新しい ESLint ルール（react-hooks/refs）で弾かれるので、
  //   refs ではなく state で前回値を覚える。
  const [choicesForIndex, setChoicesForIndex] = useState(-1);
  const [choices, setChoices] = useState([]);
  if (revenge.currentQuestion && choicesForIndex !== revenge.currentIndex) {
    setChoicesForIndex(revenge.currentIndex);
    setChoices(generateChoices(revenge.currentQuestion));
  }

  // フィードバック表示
  const [feedback, setFeedback] = useState(null); // 'correct' | 'incorrect' | null
  const [isAnimating, setIsAnimating] = useState(false);

  // メイン → サマリーフェーズの「もういっかい！」演出
  //   こちらも同じパターン: 前回フェーズを state で保持して比較する
  const [prevPhase, setPrevPhase] = useState(revenge.phase);
  const [phaseAnnouncement, setPhaseAnnouncement] = useState(false);
  if (prevPhase !== revenge.phase) {
    setPrevPhase(revenge.phase);
    if (prevPhase === 'main' && revenge.phase === 'summary') {
      setPhaseAnnouncement(true);
    }
  }

  // タイマー（コンポーネントアンマウントで安全にクリアできるよう ref で保持）
  const advanceTimerRef = useRef(null);
  const announcementTimerRef = useRef(null);

  // 「もういっかい！」演出のタイマー（1.5 秒で自動消去）
  //   phaseAnnouncement が true になった瞬間に消去用のタイマーをセットする。
  //   このタイマーは「外部システム（DOM 上の表示）」を時間で消すので
  //   effect 内 setState は許容される（タイマーコールバックは effect 外で実行される）。
  useEffect(() => {
    if (!phaseAnnouncement) return undefined;
    announcementTimerRef.current = setTimeout(() => {
      announcementTimerRef.current = null;
      setPhaseAnnouncement(false);
    }, 1500);
    return () => {
      if (announcementTimerRef.current !== null) {
        clearTimeout(announcementTimerRef.current);
        announcementTimerRef.current = null;
      }
    };
  }, [phaseAnnouncement]);

  // 全問終了で onFinished を発火（重複発火しないようガード）
  //   こちらも「外部（親 App）に通知する」効果なので effect で扱うのが適切
  const finishedFiredRef = useRef(false);
  useEffect(() => {
    if (revenge.isFinished && !finishedFiredRef.current) {
      finishedFiredRef.current = true;
      onFinished?.(revenge.getMistakeSummary());
    }
  }, [revenge.isFinished, revenge, onFinished]);

  // アンマウント時にタイマーを片付け
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
      if (announcementTimerRef.current !== null) {
        clearTimeout(announcementTimerRef.current);
        announcementTimerRef.current = null;
      }
    };
  }, []);

  // 2.5 秒後に handleResult を呼んで次の問題へ
  const advanceAfterFeedback = (isCorrect) => {
    if (advanceTimerRef.current !== null) {
      clearTimeout(advanceTimerRef.current);
    }
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      setFeedback(null);
      setIsAnimating(false);
      revenge.handleResult(isCorrect);
    }, 2500);
  };

  // 札クリック
  const handleCorrect = () => {
    setIsAnimating(true);
    setFeedback('correct');
    onPointsChange?.(10);
    advanceAfterFeedback(true);
  };

  const handleIncorrect = () => {
    setIsAnimating(true);
    setFeedback('incorrect');
    // F8: そにもつリストへの記録（fire-and-forget）
    if (studentId && revenge.currentQuestion) {
      recordMistake(studentId, {
        character: revenge.currentQuestion.h,
        mode,
      }).catch(() => {
        // 失敗は静かに無視（プレイは継続）
      });
    }
    advanceAfterFeedback(false);
  };

  // メニューに戻る（タイマーをキャンセルしてから親に通知）
  const handleBack = () => {
    if (advanceTimerRef.current !== null) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (announcementTimerRef.current !== null) {
      clearTimeout(announcementTimerRef.current);
      announcementTimerRef.current = null;
    }
    setFeedback(null);
    setIsAnimating(false);
    setPhaseAnnouncement(false);
    onBack?.();
  };

  // 終了（onFinished 後）は描画しない。App 側で 'result' に切り替わる
  if (revenge.isFinished) {
    return null;
  }

  // 「もういっかい！」演出オーバーレイ
  //   Play の上に被せる軽量な表示。新規コンポーネントを切り出すほどではないので
  //   ここでインラインに描画する。子供向けに大きく分かりやすく。
  if (phaseAnnouncement) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-10 md:p-16 text-center shadow-2xl border-8 border-pink-300">
          <h2 className="text-5xl md:text-6xl font-black text-pink-500 tracking-wider">
            まちがえた もんだいを
          </h2>
          <h2 className="text-5xl md:text-6xl font-black text-pink-500 tracking-wider mt-4">
            もういっかい！
          </h2>
        </div>
      </div>
    );
  }

  // Play へ委譲（presentational）
  // currentQuestion に displayR を付与: choices 側で確定した表示用ローマ字を共有する。
  // これにより「読み札と取り札のローマ字表記がずれる」ことを防ぐ。
  const currentChoice = choices.find((c) => c.h === revenge.currentQuestion?.h);
  const currentQWithDisplay = revenge.currentQuestion
    ? { ...revenge.currentQuestion, displayR: currentChoice?.displayR }
    : revenge.currentQuestion;

  return (
    <Play
      currentQ={currentQWithDisplay}
      currentQuestionIndex={revenge.currentIndex}
      questions={{ length: revenge.totalCount }}
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
