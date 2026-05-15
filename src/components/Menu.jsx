import { useRef, useState } from 'react';
import { Star, Flame } from 'lucide-react';
import { rows } from '../data/romaji.js';
import { MODES, MODE_LABELS } from '../lib/mode.js';
import { getWeakKanas } from '../lib/mistakesStorage.js';

// ロゴ長押し（メンター画面の隠し導線）の発動時間
const LONG_PRESS_MS = 3000;

// メニュー画面
// props:
//   points: number — 現在の累計ポイント
//   onStart: (target: string, mode: string) => void
//     target: 'random' | 'weak' | か行ラベル（'あ' 等）
//     mode: 'h2r' | 'r2h' | 'H2R'
//   onMentorAccess: () => void — ロゴ長押し検知時（PINダイアログを開く）
export default function Menu({ points, onStart, onMentorAccess }) {
  const [mode, setMode] = useState(MODES.h2r);
  const longPressTimerRef = useRef(null);
  const weakAvailable = getWeakKanas(1).length > 0;

  const handleStart = (target) => {
    onStart(target, mode);
  };

  const startLongPress = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      onMentorAccess?.();
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const tabClass = (isActive) =>
    [
      'flex-1 min-w-0 px-4 py-2.5 rounded-2xl font-bold text-sm sm:text-base transition-all',
      isActive
        ? 'bg-orange-500 text-white shadow-[0_3px_0_#c2410c]'
        : 'bg-transparent text-orange-700',
    ].join(' ');

  return (
    <div className="min-h-screen bg-yellow-50 text-gray-800 font-sans p-4 flex flex-col items-center justify-center">
      {/* ポイント表示 */}
      <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full shadow-md flex items-center gap-2 border-2 border-yellow-400">
        <Star className="text-yellow-400 fill-yellow-400 w-6 h-6" />
        <span className="text-xl font-bold text-yellow-600">{points} ぽいんと</span>
      </div>

      {/* モードタブ（中央、均等幅） */}
      <div
        className="w-full max-w-2xl mb-6 p-1.5 bg-white rounded-full border-2 border-orange-200 flex gap-2"
        role="tablist"
        aria-label="出題モード"
      >
        {Object.values(MODES).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={tabClass(mode === m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* ロゴ + キャプション（長押しでメンター画面） */}
      <div
        className="text-center mb-8 select-none cursor-pointer"
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
      >
        <h1 className="text-5xl md:text-7xl font-black text-orange-500 mb-4 drop-shadow-sm tracking-wider">
          ローマじ かるた
        </h1>
        <p className="text-xl md:text-2xl text-orange-700 font-bold">
          れんしゅうする ぎょうを えらんでね！
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 w-full max-w-3xl mb-6">
        {rows.map((row) => (
          <button
            key={row}
            onClick={() => handleStart(row)}
            className="bg-white border-4 border-orange-400 rounded-2xl py-4 shadow-[0_6px_0_#f6ad55] active:shadow-[0_0px_0_#f6ad55] active:translate-y-2 transition-all flex items-center justify-center text-3xl font-bold text-orange-600 hover:bg-orange-50"
          >
            {row} ぎょう
          </button>
        ))}
      </div>

      {/* CTA: ぜんぶまぜまぜ + にがてだけ */}
      <div className="w-full max-w-2xl flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => handleStart('random')}
          className="flex-1 bg-gradient-to-r from-red-400 to-pink-500 border-4 border-pink-600 rounded-3xl py-5 shadow-[0_8px_0_#be185d] active:shadow-[0_0px_0_#be185d] active:translate-y-2 transition-all flex flex-col items-center justify-center text-white"
        >
          <span className="text-2xl sm:text-3xl font-black mb-1">ぜんぶ まぜまぜ</span>
          <span className="text-sm font-bold bg-white/30 px-3 py-1 rounded-full">
            ランダム 15もん
          </span>
        </button>
        <button
          onClick={() => weakAvailable && handleStart('weak')}
          disabled={!weakAvailable}
          className="flex-1 bg-gradient-to-r from-orange-400 to-orange-600 border-4 border-orange-700 rounded-3xl py-5 shadow-[0_8px_0_#9a3412] active:shadow-[0_0px_0_#9a3412] active:translate-y-2 transition-all flex flex-col items-center justify-center text-white disabled:opacity-60 disabled:active:translate-y-0 disabled:active:shadow-[0_8px_0_#9a3412]"
          title={weakAvailable ? '苦手な文字から出題' : 'まだ にがては ないよ！'}
        >
          <span className="text-2xl sm:text-3xl font-black mb-1 flex items-center gap-2">
            <Flame className="w-7 h-7" />
            にがて だけ
          </span>
          <span className="text-sm font-bold bg-white/30 px-3 py-1 rounded-full">
            {weakAvailable ? 'そにもつ から しゅつだい' : 'まだ にがて は ないよ'}
          </span>
        </button>
      </div>
    </div>
  );
}
