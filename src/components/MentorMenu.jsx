import { useState } from 'react';
import {
  Home,
  Settings,
  ShieldCheck,
  Target,
  SlidersHorizontal,
  KeyRound,
  Download,
  LogOut,
  Trash2,
} from 'lucide-react';
import {
  getMistakesSummary,
  clearMistakes,
} from '../lib/mistakesStorage.js';
import {
  getRevengeOptions,
  setRevengeOptions,
  setPin,
} from '../lib/settingsStorage.js';

// メンター管理画面（仕様書 §F11/F12）。
//   PIN 認証後に表示される。F11（生徒選択）は当面 1 名運用想定なのでスタブ表示。
//   F8（苦手な文字）と設定（リベンジ ON/OFF、PIN 変更、CSV 出力）を提供する。
//
// props:
//   onClose: () => void — メニュー画面に戻る
export default function MentorMenu({ onClose }) {
  const [mistakes, setMistakes] = useState(() => getMistakesSummary());
  const [revenge, setRevenge] = useState(() => getRevengeOptions());
  const [pinChangeMode, setPinChangeMode] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinSaved, setPinSaved] = useState(false);

  const toggleRevenge = (key) => {
    const next = { ...revenge, [key]: !revenge[key] };
    setRevenge(next);
    setRevengeOptions(next);
  };

  const handleClearMistakes = () => {
    if (!confirm('苦手な文字をすべてクリアします。よろしいですか？')) return;
    clearMistakes();
    setMistakes([]);
  };

  const handlePinSave = () => {
    if (!/^\d{4}$/.test(newPin)) return;
    if (setPin(newPin)) {
      setPinSaved(true);
      setNewPin('');
      setTimeout(() => {
        setPinSaved(false);
        setPinChangeMode(false);
      }, 1500);
    }
  };

  const handleCsvExport = () => {
    const lines = ['hiragana,romaji_used,count'];
    for (const m of mistakes) {
      for (const [r, c] of Object.entries(m.byR)) {
        lines.push(`${m.h},${r},${c}`);
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `romaji-karuta-mistakes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-yellow-50 p-4 sm:p-8 font-sans">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onClose}
          className="bg-white px-4 py-2 rounded-2xl border-2 border-blue-400 text-blue-600 font-bold flex items-center gap-2 active:translate-y-0.5 transition-all"
        >
          <Home className="w-5 h-5" />
          戻る
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <Settings className="w-6 h-6 text-orange-900" />
          <h1 className="text-xl sm:text-2xl font-black text-orange-900">
            メンターメニュー
          </h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-100 text-amber-700 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          専用画面
        </div>
      </div>

      {/* 3 カラム */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* カラム1: 生徒選択（F11） — 1名運用想定のスタブ */}
        <section className="bg-white rounded-2xl p-6 border-2 border-orange-200">
          <h2 className="text-lg font-black text-orange-900 mb-4">生徒選択</h2>
          <div className="bg-amber-50 rounded-xl px-3 py-2 mb-4 text-sm">
            <span className="font-bold text-amber-700">現在: </span>
            <span className="font-black text-orange-900">たろう</span>
          </div>
          <p className="text-xs text-amber-700 font-bold">
            複数生徒の管理は今後追加予定です。
            <br />
            今は 1 名運用です。
          </p>
        </section>

        {/* カラム2: 苦手な文字（F8） */}
        <section className="bg-white rounded-2xl p-6 border-2 border-orange-200">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-black text-orange-900">苦手な文字</h2>
          </div>
          <p className="text-xs text-amber-700 font-bold mb-4">
            よく間違える文字 (訓令式 / ヘボン式)
          </p>
          {mistakes.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              まだ記録がありません
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {mistakes.slice(0, 10).map((m) => {
                const rDisplay = Object.entries(m.byR)
                  .map(([r, c]) => `${r}×${c}`)
                  .join(' / ');
                return (
                  <div
                    key={m.h}
                    className="flex items-center gap-3 px-3 py-2 bg-amber-50 rounded-xl"
                  >
                    <span className="text-2xl font-black text-orange-900">{m.h}</span>
                    <span className="text-xs text-amber-700">→</span>
                    <span className="text-sm font-bold text-orange-700">
                      {rDisplay}
                    </span>
                    <span className="ml-auto px-2 py-0.5 rounded-lg bg-red-100 text-red-700 text-xs font-black">
                      ×{m.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {mistakes.length > 0 && (
            <button
              onClick={handleClearMistakes}
              className="mt-4 w-full py-2 rounded-xl border-2 border-slate-300 text-slate-500 text-sm font-bold flex items-center justify-center gap-2 active:translate-y-0.5 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              全クリア
            </button>
          )}
        </section>

        {/* カラム3: 設定 */}
        <section className="bg-white rounded-2xl p-6 border-2 border-orange-200">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-black text-orange-900">設定</h2>
          </div>
          <p className="text-xs text-amber-700 font-bold mb-4">リベンジ機能</p>

          <div className="flex flex-col gap-2">
            <RevengeToggle
              label="即時リベンジ"
              hint="間違えたら即座に再出題"
              on={revenge.immediate}
              onToggle={() => toggleRevenge('immediate')}
            />
            <RevengeToggle
              label="サマリーリベンジ"
              hint="終了後にミス問題をまとめて"
              on={revenge.summary}
              onToggle={() => toggleRevenge('summary')}
            />
          </div>

          <div className="my-4 h-px bg-orange-100" />

          {pinChangeMode ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-orange-900">新しいPIN (4桁)</p>
              <input
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="px-3 py-2 rounded-xl border-2 border-orange-300 text-lg text-center font-bold tracking-widest"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPinChangeMode(false);
                    setNewPin('');
                  }}
                  className="flex-1 py-2 rounded-xl border-2 border-slate-300 text-slate-500 text-sm font-bold"
                >
                  キャンセル
                </button>
                <button
                  disabled={!/^\d{4}$/.test(newPin)}
                  onClick={handlePinSave}
                  className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-50"
                >
                  保存
                </button>
              </div>
              {pinSaved && (
                <p className="text-xs text-green-600 font-bold text-center">
                  保存しました
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setPinChangeMode(true)}
              className="w-full px-3 py-2 rounded-xl border border-orange-200 bg-white flex items-center gap-2 active:translate-y-0.5 transition-all"
            >
              <KeyRound className="w-4 h-4 text-orange-900" />
              <span className="text-sm font-bold text-orange-900">PIN変更</span>
              <span className="ml-auto text-xs text-slate-400">›</span>
            </button>
          )}

          <button
            onClick={handleCsvExport}
            disabled={mistakes.length === 0}
            className="mt-2 w-full px-3 py-2 rounded-xl border border-orange-200 bg-white flex items-center gap-2 active:translate-y-0.5 transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4 text-orange-900" />
            <span className="text-sm font-bold text-orange-900">記録をCSV出力</span>
            <span className="ml-auto text-xs text-slate-400">›</span>
          </button>

          <button
            onClick={onClose}
            className="mt-3 w-full py-2 rounded-xl bg-amber-100 border-2 border-amber-400 text-amber-700 font-black text-sm flex items-center justify-center gap-2 active:translate-y-0.5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            メンターモード終了
          </button>
        </section>
      </div>
    </div>
  );
}

function RevengeToggle({ label, hint, on, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 px-3 py-3 rounded-xl bg-amber-50 active:translate-y-0.5 transition-all"
    >
      <div className="flex-1 text-left">
        <p className="text-sm font-black text-orange-900">{label}</p>
        <p className="text-xs text-amber-700 font-bold">{hint}</p>
      </div>
      <div
        className={[
          'w-12 h-7 rounded-full flex items-center transition-colors',
          on ? 'bg-orange-500 justify-end' : 'bg-slate-300 justify-start',
        ].join(' ')}
      >
        <div className="w-5 h-5 rounded-full bg-white m-1" />
      </div>
    </button>
  );
}
