// 起動時のローディング表示。
//   API 呼び出し（生徒一覧 / 設定 / ポイント）が完了するまでの数百ミリ秒を埋める。
export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-yellow-50 flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
        <p className="text-orange-700 font-bold">よみこみちゅう…</p>
      </div>
    </div>
  );
}
