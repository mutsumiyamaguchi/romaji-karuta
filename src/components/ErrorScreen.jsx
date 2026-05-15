import { CloudOff } from 'lucide-react';

// 起動時の API 失敗画面。
//   オフライン or サーバ障害のとき表示する。リトライボタンでページをリロード。
export default function ErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-screen bg-yellow-50 flex items-center justify-center font-sans p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border-2 border-orange-200 shadow-xl flex flex-col items-center gap-4">
        <CloudOff className="w-16 h-16 text-orange-400" />
        <h2 className="text-2xl font-black text-orange-900">
          つながらない みたい
        </h2>
        <p className="text-sm text-amber-700">
          インターネットに つないでから、もういちど ためしてみてね。
        </p>
        {message && (
          <p className="text-xs text-slate-400 break-all">({message})</p>
        )}
        <button
          onClick={onRetry}
          className="mt-2 px-6 py-3 rounded-2xl bg-orange-500 text-white font-bold active:translate-y-0.5 transition-all"
        >
          もういちど
        </button>
      </div>
    </div>
  );
}
