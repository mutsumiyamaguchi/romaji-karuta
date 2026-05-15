import { Star, Home, Award, RotateCcw } from 'lucide-react';

// 結果画面
// props:
//   score: number — 正解数
//   questions: array — 出題された問題リスト（長さ表示に使う）
//   earnedPoints: number — このセッションで得たポイント
//   mistakes: array — 間違えた問題（{ h, r, row }）。空でなければ「やり直す」ボタンを出す
//   isRetry: boolean — 直前のセッションがやり直し（ノーポイント）モードだったか
//   onBack: () => void — メニューに戻る
//   onRetryWrongOnly: () => void — 間違えた問題だけで再プレイ
export default function Result({
  score,
  questions,
  earnedPoints,
  mistakes = [],
  isRetry = false,
  onBack,
  onRetryWrongOnly,
}) {
  const hasMistakes = mistakes.length > 0;
  return (
    <div className="min-h-screen bg-orange-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl text-center max-w-md w-full border-8 border-orange-300">
        <Award className="w-32 h-32 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-5xl font-black text-orange-500 mb-6">おわり！</h2>

        <div className="text-3xl font-bold text-gray-700 mb-6 space-y-4">
          <p>{questions.length} もんちゅう</p>
          <p className="text-4xl text-red-500">{score} もん せいかい！</p>
        </div>

        {!isRetry && (
          <div className="bg-yellow-100 rounded-2xl p-4 mb-6 flex justify-center items-center gap-3">
            <Star className="text-yellow-500 fill-yellow-500 w-8 h-8" />
            <span className="text-3xl font-bold text-yellow-600">
              +{earnedPoints} ぽいんと
            </span>
          </div>
        )}

        {isRetry && (
          <div className="bg-orange-50 rounded-2xl p-3 mb-6 text-sm font-bold text-orange-700">
            やりなおしモードは ぽいんとが ふえないよ
          </div>
        )}

        {hasMistakes && (
          <button
            onClick={onRetryWrongOnly}
            className="w-full bg-orange-400 border-4 border-orange-600 rounded-2xl py-4 mb-3 shadow-[0_6px_0_#c2410c] active:shadow-[0_0px_0_#c2410c] active:translate-y-2 transition-all flex items-center justify-center text-white text-xl font-bold gap-2"
          >
            <RotateCcw className="w-7 h-7" />
            まちがえた {mistakes.length} もん やりなおす
          </button>
        )}

        <button
          onClick={onBack}
          className="w-full bg-blue-400 border-4 border-blue-600 rounded-2xl py-4 shadow-[0_6px_0_#2563eb] active:shadow-[0_0px_0_#2563eb] active:translate-y-2 transition-all flex items-center justify-center text-white text-2xl font-bold"
        >
          <Home className="w-8 h-8 mr-2" />
          メニューにもどる
        </button>
      </div>
    </div>
  );
}
