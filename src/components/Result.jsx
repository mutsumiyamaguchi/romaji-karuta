import { Star, Home, Award } from 'lucide-react';

// 結果画面
// props:
//   score: number — 正解数
//   questions: array — 出題された問題リスト（長さ表示に使う）
//   earnedPoints: number — このセッションで得たポイント
//   onBack: () => void — メニューに戻る
export default function Result({ score, questions, earnedPoints, onBack }) {
  return (
    <div className="min-h-screen bg-orange-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl text-center max-w-md w-full border-8 border-orange-300">
        <Award className="w-32 h-32 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-5xl font-black text-orange-500 mb-6">おわり！</h2>

        <div className="text-3xl font-bold text-gray-700 mb-6 space-y-4">
          <p>{questions.length} もんちゅう</p>
          <p className="text-4xl text-red-500">
            {score} もん せいかい！
          </p>
        </div>

        <div className="bg-yellow-100 rounded-2xl p-4 mb-8 flex justify-center items-center gap-3">
          <Star className="text-yellow-500 fill-yellow-500 w-8 h-8" />
          <span className="text-3xl font-bold text-yellow-600">+{earnedPoints} ぽいんと</span>
        </div>

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
