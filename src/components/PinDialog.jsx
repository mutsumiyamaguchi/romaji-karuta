import { useState } from 'react';
import { Lock, Delete, Check } from 'lucide-react';
import { verifyPin } from '../lib/settingsStorage.js';

// PIN 入力ダイアログ（メンター画面の入口）。
//   ロゴ長押しで開く。4 桁のテンキー入力で verify する。
//
// props:
//   onSuccess: () => void — PIN 認証成功時に呼ばれる
//   onCancel: () => void  — キャンセル / 背景タップで閉じる
export default function PinDialog({ onSuccess, onCancel }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (d) => {
    if (pin.length >= 4) return;
    setError(false);
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      // 軽い遅延を入れて、4 つ目のドットが点灯した状態を見せてから判定
      setTimeout(() => {
        if (verifyPin(next)) {
          onSuccess?.();
        } else {
          setError(true);
          setPin('');
        }
      }, 200);
    }
  };

  const handleDelete = () => {
    setError(false);
    setPin((p) => p.slice(0, -1));
  };

  const dotClass = (filled) =>
    [
      'w-12 h-14 rounded-xl border-2 flex items-center justify-center transition-colors',
      filled ? 'border-orange-500 bg-orange-50' : 'border-orange-200 bg-orange-50/50',
    ].join(' ');

  const keyClass =
    'w-20 h-16 rounded-2xl bg-orange-50 border-2 border-orange-200 text-2xl font-bold text-orange-900 active:translate-y-1 active:bg-orange-100 transition-all';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl border-2 border-orange-200 flex flex-col items-center gap-5">
        <Lock className="w-10 h-10 text-orange-500" />
        <h2 className="text-2xl font-black text-orange-900">メンター せんよう</h2>
        <p className="text-sm font-bold text-orange-700">
          4けたの あんしょうばんごうを いれてね
        </p>

        <div className="flex gap-3 my-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={dotClass(i < pin.length)}>
              {i < pin.length && (
                <div className="w-3.5 h-3.5 rounded-full bg-orange-500" />
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm font-bold text-red-500">
            ちがう みたい。もういちど！
          </p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleDigit(String(n))}
              className={keyClass}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDelete}
            className="w-20 h-16 rounded-2xl bg-amber-100 border-2 border-amber-300 text-amber-900 active:translate-y-1 transition-all flex items-center justify-center"
            aria-label="削除"
          >
            <Delete className="w-7 h-7" />
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className={keyClass}
          >
            0
          </button>
          <button
            type="button"
            disabled={pin.length !== 4}
            onClick={() => {
              if (verifyPin(pin)) onSuccess?.();
              else {
                setError(true);
                setPin('');
              }
            }}
            className="w-20 h-16 rounded-2xl bg-orange-500 border-2 border-orange-700 text-white active:translate-y-1 transition-all flex items-center justify-center disabled:opacity-50"
            aria-label="OK"
          >
            <Check className="w-8 h-8" />
          </button>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 text-sm font-bold mt-1 px-4 py-2"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
