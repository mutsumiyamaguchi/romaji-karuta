import { CheckCircle2, XCircle } from 'lucide-react';

// 正解/不正解オーバーレイ
// props:
//   feedback: 'correct' | 'incorrect' | null
//   correctRomaji: string — 不正解時に表示する正解ローマ字
export default function Feedback({ feedback, correctRomaji }) {
  if (!feedback) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-10 md:p-16 text-center shadow-2xl border-8 border-white animate-bounce-short">
        {feedback === 'correct' ? (
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-40 h-40 text-green-500 mb-6 drop-shadow-md" />
            <h2 className="text-6xl md:text-7xl font-black text-green-500 tracking-wider">
              せいかい！
            </h2>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <XCircle className="w-40 h-40 text-red-500 mb-6 drop-shadow-md" />
            <h2 className="text-6xl md:text-7xl font-black text-red-500 tracking-wider mb-6">
              ざんねん！
            </h2>
            <div className="bg-red-50 p-6 rounded-2xl border-4 border-red-200">
              <p className="text-3xl md:text-4xl font-bold text-gray-700">
                せいかいは
              </p>
              <p className="text-7xl md:text-8xl font-black text-red-600 mt-4">
                {correctRomaji}
              </p>
              <p className="text-3xl md:text-4xl font-bold text-gray-700 mt-4">
                だよ！
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
