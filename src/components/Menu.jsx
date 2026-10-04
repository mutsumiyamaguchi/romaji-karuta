import { useEffect, useRef, useState } from 'react';
import { Star, Flame, ChevronDown, Lock, User, CheckCircle2 } from 'lucide-react';
import { rows, romajiList, STEPS } from '../data/romaji.js';
import { CURRICULUM } from '../data/curriculum.js';

// ステップ別ボタンの表示メタ。
// 件数表示はデータから動的に計算する（データ変更時に追従させるため）。
const STEP_BUTTONS = [
  {
    step: STEPS.seion,
    target: 'random-seion',
    title: 'ステップ1',
    subtitle: 'せいおん',
  },
  {
    step: STEPS.dakuon,
    target: 'random-dakuon',
    title: 'ステップ2',
    subtitle: 'だくおん・はんだくおん・小文字',
  },
  {
    step: STEPS.youon,
    target: 'random-youon',
    title: 'ステップ3',
    subtitle: 'ようおん',
  },
];

const STEP_COUNTS = STEP_BUTTONS.reduce((acc, b) => {
  acc[b.step] = romajiList.filter((it) => it.step === b.step).length;
  return acc;
}, {});
import {
  MODES,
  MODE_LABELS,
  LETTER_CASES,
  LETTER_CASE_LABELS,
} from '../lib/mode.js';
import { getWeakCharacters } from '../lib/api/mistakes.js';

// ロゴ長押し（メンター画面の隠し導線）の発動時間
const LONG_PRESS_MS = 3000;

// メニュー画面
// props:
//   points: number — 現在の累計ポイント
//   currentStudent: { id, name } | null
//   students: Array<{ id, name, points }>
//   onSelectStudent: (id) => void
//   onStart: (target, mode, letterCase) => void
//   onMentorAccess: () => void — ロゴ長押し検知時（PINダイアログを開く）
//   letterCase: 'upper' | 'lower' — アルファベット大小（親 App から渡される）
//   onLetterCaseChange: (value) => void — letterCase 切替コールバック
//   selectedStep / onSelectedStepChange — 表示中の学習ステップ。親が持つと、練習から戻っても選択が保たれる。
export default function Menu({
  points,
  availablePoints = points,
  progress,
  currentStudent,
  students = [],
  onSelectStudent,
  onStart,
  onMentorAccess,
  onAssessment,
  letterCase = LETTER_CASES.upper,
  onLetterCaseChange,
  selectedStep: controlledStep,
  onSelectedStepChange,
}) {
  const [mode, setMode] = useState(MODES.h2r);
  // 親から渡されない場合（単体利用）は内部で保持する。
  const [internalStep, setInternalStep] = useState(STEPS.seion);
  const selectedStep = controlledStep ?? internalStep;
  const setSelectedStep = (step) => {
    setInternalStep(step);
    onSelectedStepChange?.(step);
  };
  const [weakAvailable, setWeakAvailable] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const longPressTimerRef = useRef(null);

  // 現在の生徒の苦手な文字が 1 件以上あるか確認（にがてだけボタンの enable 判定）
  // setState は必ず非同期コールバック経由で呼ぶ（react-hooks/set-state-in-effect）
  useEffect(() => {
    let alive = true;
    const sid = currentStudent?.id;
    (async () => {
      if (!sid) {
        if (alive) setWeakAvailable(false);
        return;
      }
      try {
        const arr = await getWeakCharacters(sid, 1);
        if (alive) setWeakAvailable(arr.length > 0);
      } catch {
        if (alive) setWeakAvailable(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [currentStudent?.id]);

  const handleStart = (target) => onStart(target, mode, letterCase);

  const handleLetterCaseClick = (next) => {
    if (next === letterCase) return;
    onLetterCaseChange?.(next);
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

  // アルファベット大小トグルのクラス（モードタブと同じ視覚言語）
  const caseToggleClass = (isActive) =>
    [
      'min-w-0 px-6 py-2 rounded-2xl font-bold text-sm sm:text-base transition-all',
      isActive
        ? 'bg-orange-500 text-white shadow-[0_3px_0_#c2410c]'
        : 'bg-transparent text-orange-700',
    ].join(' ');

  const selectedStepButton = STEP_BUTTONS.find((item) => item.step === selectedStep);
  const visibleRows = rows.filter((row) =>
    romajiList.some((item) => item.row === row && item.step === selectedStep)
  );
  const accessForRow = (row) => {
    const item = romajiList.find((entry) => entry.row === row && entry.step === selectedStep);
    return progress === undefined
      ? 'available'
      : progress?.access?.find((entry) => entry.unitId === `${item?.step}:${row}`)?.access ?? 'locked';
  };
  const selectedStepLocked = visibleRows.every((row) => accessForRow(row) === 'locked');
  // ポイント獲得済み（初回全問正解済み）の行。progress が無い場合は表示しない。
  const completedUnits = new Set((progress?.practiceCompletions ?? []).map((item) => item.unit_id));
  const selectedReward = CURRICULUM.find((item) => item.key === selectedStep)?.reward ?? 0;
  const isRowCleared = (row) => completedUnits.has(`${selectedStep}:${row}`);
  const clearedCount = visibleRows.filter(isRowCleared).length;
  const showClearStatus = Boolean(progress) && !selectedStepLocked && !visibleRows.some((row) => accessForRow(row) === 'legacy-preview');
  const selectedStepPreview = visibleRows.some((row) => accessForRow(row) === 'legacy-preview');

  return (
    <div className="min-h-screen bg-yellow-50 text-gray-800 font-sans p-4 flex flex-col items-center justify-center">
      {/* 通常フローのヘッダー。狭幅では折り返し、下のモードタブを覆わない。 */}
      <header
        className="mb-3 flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        data-testid="menu-header"
      >
        {/* 生徒名バッジ + ピッカー */}
        <div className="relative z-10 min-w-0 self-start" data-testid="student-picker">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="flex max-w-full items-center gap-2 rounded-full border-2 border-orange-300 bg-white px-4 py-2 shadow-md transition-all active:translate-y-0.5"
          >
            <User className="h-5 w-5 shrink-0 text-orange-500" />
            <span className="max-w-[70vw] truncate text-base font-bold text-orange-700 sm:max-w-64">
              {currentStudent?.name ?? '生徒なし'}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-orange-400" />
          </button>
          {pickerOpen && (
            <div className="absolute left-0 top-12 z-20 w-56 rounded-2xl border-2 border-orange-200 bg-white py-2 shadow-xl">
              {students.length === 0 ? (
                <p className="px-4 py-2 text-sm text-slate-400">
                  生徒が ありません
                </p>
              ) : (
                students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onSelectStudent?.(s.id);
                      setPickerOpen(false);
                    }}
                    className={[
                      'w-full px-4 py-2 text-left flex items-center gap-2 transition-colors',
                      s.id === currentStudent?.id
                        ? 'bg-orange-50 text-orange-700 font-bold'
                        : 'text-slate-700 hover:bg-orange-50',
                    ].join(' ')}
                  >
                    <User className="w-4 h-4" />
                    <span className="flex-1">{s.name}</span>
                    <span className="text-xs text-amber-600">
                      {s.points} pt
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ポイント表示 */}
        <div
          className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border-2 border-yellow-400 bg-white px-4 py-2 shadow-md sm:w-auto sm:rounded-full"
          data-testid="points-badge"
        >
          <Star className="h-6 w-6 shrink-0 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-bold text-yellow-700">ごうけい {points}</span>
          <span className="text-sm font-bold text-orange-700">つかえる {availablePoints}</span>
        </div>
      </header>

      {/* モードタブ */}
      <div
        className="w-full max-w-2xl mb-3 p-1.5 bg-white rounded-full border-2 border-orange-200 flex gap-2"
        role="tablist"
        aria-label="出題モード"
        data-testid="mode-tabs"
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

      {/* アルファベット大小トグル */}
      <div
        className="w-full max-w-2xl mb-6 flex items-center justify-center gap-3"
        aria-label="アルファベットの大きさ"
      >
        <span className="text-sm sm:text-base font-bold text-orange-700">
          アルファベット
        </span>
        <div className="p-1.5 bg-white rounded-full border-2 border-orange-200 flex gap-2">
          {Object.values(LETTER_CASES).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={letterCase === c}
              aria-label={
                c === LETTER_CASES.upper ? 'おおもじ' : 'こもじ'
              }
              onClick={() => handleLetterCaseClick(c)}
              className={caseToggleClass(letterCase === c)}
            >
              {LETTER_CASE_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* ロゴ + キャプション（長押しでメンター） */}
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

      {/* 学習ステップ切替。未解放タブも選べるが、行はロック表示する。 */}
      <div
        className="mb-5 flex w-full max-w-3xl gap-2 rounded-3xl border-2 border-orange-200 bg-white p-2"
        role="tablist"
        aria-label="学習ステップ"
      >
        {STEP_BUTTONS.map((item) => {
          const active = selectedStep === item.step;
          return (
            <button
              key={item.step}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedStep(item.step)}
              className={[
                'flex-1 rounded-2xl px-2 py-3 text-sm font-black transition-all sm:text-base',
                active
                  ? 'bg-orange-500 text-white shadow-[0_4px_0_#c2410c]'
                  : 'bg-orange-50 text-orange-700',
              ].join(' ')}
            >
              <span className="block">{item.title}</span>
              <span className="mt-1 block text-xs sm:text-sm">{item.subtitle}</span>
            </button>
          );
        })}
      </div>

      {selectedStepLocked && (
        <div className="mb-5 flex w-full max-w-3xl items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-center font-bold text-slate-600">
          <Lock className="h-5 w-5" />
          前のステップの うでだめしに ごうかくすると かいほう！
        </div>
      )}
      {selectedStepPreview && (
        <div className="mb-5 w-full max-w-3xl rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-bold text-blue-700">
          さきどりれんしゅう中は ポイントは つかないよ
        </div>
      )}

      {showClearStatus && (
        <div
          className="mb-4 flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm font-bold sm:text-base"
          data-testid="clear-status"
        >
          <span className="rounded-full bg-green-100 px-4 py-1.5 text-green-700">
            クリア {clearedCount} / {visibleRows.length}
          </span>
          {clearedCount < visibleRows.length ? (
            <span className="text-orange-700">
              ぜんもん せいかいで <Star className="inline h-4 w-4 fill-yellow-400 text-yellow-400" /> +{selectedReward} の ぎょうが のこっているよ
            </span>
          ) : (
            <span className="text-green-700">ぜんぶ クリア！ うでだめしに ちょうせん できるよ</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 w-full max-w-3xl mb-6">
        {visibleRows.map((row) => {
          const access = accessForRow(row);
          const cleared = showClearStatus && isRowCleared(row);
          const pending = showClearStatus && !cleared && access === 'available';
          return (
          <button
            key={row}
            disabled={access === 'locked'}
            onClick={() => access !== 'locked' && handleStart(row)}
            data-cleared={showClearStatus ? String(cleared) : undefined}
            className={[
              'border-4 rounded-2xl py-4 active:translate-y-2 transition-all flex flex-col items-center justify-center text-3xl font-bold disabled:opacity-40',
              cleared
                ? 'bg-green-50 border-green-500 text-green-700 shadow-[0_6px_0_#22c55e] active:shadow-[0_0px_0_#22c55e] hover:bg-green-100'
                : 'bg-white border-orange-400 text-orange-600 shadow-[0_6px_0_#f6ad55] active:shadow-[0_0px_0_#f6ad55] hover:bg-orange-50',
            ].join(' ')}
          >
            {row} ぎょう
            {cleared && (
              <span className="mt-1 flex items-center gap-1 rounded-full bg-green-500 px-3 py-0.5 text-xs text-white">
                <CheckCircle2 className="h-4 w-4" />クリア
              </span>
            )}
            {pending && (
              <span className="mt-1 flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-0.5 text-xs text-yellow-700">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />+{selectedReward}
              </span>
            )}
            {access === 'legacy-preview' && <span className="text-xs">さきどりれんしゅう</span>}
            {access === 'locked' && <span className="text-xs">ロック</span>}
          </button>
        );})}
      </div>

      {/* 選択中ステップからランダム15問 */}
      <button
        disabled={selectedStepLocked}
        onClick={() => !selectedStepLocked && handleStart(selectedStepButton.target)}
        className="mb-4 flex w-full max-w-3xl flex-col items-center justify-center rounded-3xl border-4 border-pink-600 bg-gradient-to-r from-red-400 to-pink-500 py-5 text-white shadow-[0_8px_0_#be185d] transition-all active:translate-y-2 active:shadow-[0_0px_0_#be185d] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_8px_0_#be185d]"
      >
        <span className="text-xl font-black sm:text-2xl">
          {selectedStepButton.subtitle} から ランダム15もん
        </span>
        <span className="mt-1 rounded-full bg-white/30 px-3 py-1 text-xs font-bold sm:text-sm">
          {STEP_COUNTS[selectedStep]}もん から 15もん
        </span>
      </button>

      <div className="w-full max-w-2xl flex justify-center">
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
      <button onClick={onAssessment} className="mt-4 w-full max-w-2xl rounded-3xl border-4 border-blue-600 bg-blue-400 py-5 text-2xl font-black text-white shadow-[0_8px_0_#2563eb]">うでだめし</button>
    </div>
  );
}
