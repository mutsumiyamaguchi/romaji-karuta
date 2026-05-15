import { Star, Home } from 'lucide-react';
import Feedback from './Feedback.jsx';
import { MODES, LETTER_CASES, getPrompt, getChoiceLabel } from '../lib/mode.js';

// プレイ画面（問題表示 + 選択肢 + フィードバックオーバーレイ）
// props:
//   currentQ: { h, r, row } — 出題中の問題
//   currentQuestionIndex: number — 0-based
//   questions: array — セッションの全問題（長さ表示用）
//   choices: array — 表示する札（rotation を含む）
//   points: number — 現在の累計ポイント
//   feedback: 'correct' | 'incorrect' | null
//   isAnimating: boolean — フィードバック表示中の連打防止
//   onCorrect: (choice) => void — 正解の札がクリックされた
//   onIncorrect: (choice) => void — 不正解の札がクリックされた
//   onBack: () => void — メニューに戻る
//   mode: 'h2r' | 'r2h' — 出題モード（既定 'h2r'）
//   letterCase: 'upper' | 'lower' — アルファベット大小（既定 'upper'）
export default function Play({
  currentQ,
  currentQuestionIndex,
  questions,
  choices,
  points,
  feedback,
  isAnimating,
  onCorrect,
  onIncorrect,
  onBack,
  mode = MODES.h2r,
  letterCase = LETTER_CASES.upper,
}) {
  const handleChoiceClick = (choice) => {
    if (isAnimating) return;
    // 正解判定はモードに依らず r で比較する（内部ID 同一性）
    if (choice.r === currentQ.r) {
      onCorrect(choice);
    } else {
      onIncorrect(choice);
    }
  };

  // 問題文のクラス（モードによってサイズを調整）
  //   r2h はローマ字を出すので文字幅が広く、小さめに
  const promptClass =
    mode === MODES.r2h
      ? 'text-[8rem] leading-none font-black text-gray-800 drop-shadow-xl select-none tracking-wider'
      : 'text-[12rem] leading-none font-black text-gray-800 drop-shadow-xl select-none';

  // 札（取り札）のテキストクラス
  //   r2h はひらがな主体 / h2r はローマ字
  const choiceTextClass =
    mode === MODES.r2h
      ? 'text-6xl sm:text-8xl font-bold text-gray-800'
      : 'text-5xl sm:text-7xl font-bold text-gray-800';

  // フィードバック時に正解として表示する文字列
  const correctChoiceText = getChoiceLabel(currentQ, mode, letterCase);

  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center relative overflow-hidden font-sans">

      {/* ヘッダー情報 */}
      <div className="w-full p-4 flex justify-between items-center bg-white/50 mb-4">

        {/* 左側：もどるボタンと問題数 */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onBack}
            className="bg-white p-2 sm:px-4 sm:py-2 rounded-full shadow-sm flex items-center gap-2 border-2 border-blue-400 hover:bg-blue-50 active:translate-y-1 transition-all text-blue-500 font-bold"
            title="メニューにもどる"
          >
            <Home className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">もどる</span>
          </button>

          <div className="bg-white px-3 py-2 sm:px-4 rounded-full shadow-sm font-bold text-gray-600 text-base sm:text-lg border-2 border-gray-200">
            {currentQuestionIndex + 1} / {questions.length} もんめ
          </div>
        </div>

        {/* 右側：ポイント表示 */}
        <div className="bg-white px-3 py-2 sm:px-4 rounded-full shadow-sm flex items-center gap-1 sm:gap-2 border-2 border-yellow-300">
          <Star className="text-yellow-400 fill-yellow-400 w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-base sm:text-lg font-bold text-yellow-600">{points} ぽいんと</span>
        </div>
      </div>

      {/* 問題表示（大きく） */}
      <div className="flex-1 flex flex-col justify-center items-center w-full px-4 mb-8">
        <div className="text-2xl font-bold text-gray-500 mb-4 bg-white/50 px-6 py-2 rounded-full">
          これ なーんだ？
        </div>
        <div className={promptClass}>
          {getPrompt(currentQ, mode, letterCase)}
        </div>
      </div>

      {/* 選択肢（カルタの札） */}
      <div className="w-full max-w-4xl p-4 pb-12 flex flex-wrap justify-center gap-4 sm:gap-6">
        {choices.map((choice, idx) => (
          <button
            key={`${choice.r}-${idx}`}
            onClick={() => handleChoiceClick(choice)}
            style={{ transform: `rotate(${choice.rotation}deg)` }}
            className={`
              w-28 h-36 sm:w-40 sm:h-48 bg-white border-4 rounded-xl flex items-center justify-center
              ${choiceTextClass} transition-transform select-none
              ${isAnimating ? 'cursor-not-allowed opacity-90' : 'hover:scale-105 active:translate-y-2'}
              border-amber-500 shadow-[0_8px_0_#d97706] active:shadow-[0_0px_0_#d97706]
            `}
          >
            {getChoiceLabel(choice, mode, letterCase)}
          </button>
        ))}
      </div>

      {/* フィードバックのオーバーレイ（正解/不正解） */}
      <Feedback feedback={feedback} correctRomaji={correctChoiceText} />

      {/* ちょっとしたCSSアニメーション用のスタイル追加 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-short {
          animation: bounce-short 0.5s ease-in-out 1;
        }
      `}} />
    </div>
  );
}
