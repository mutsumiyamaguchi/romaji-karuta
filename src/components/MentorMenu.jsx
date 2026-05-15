import { useEffect, useState } from 'react';
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
  UserPlus,
  Check,
  X,
  CircleCheck,
  Circle,
} from 'lucide-react';
import * as studentsApi from '../lib/api/students.js';
import * as mistakesApi from '../lib/api/mistakes.js';
import * as mentorApi from '../lib/api/mentor.js';
import { ApiError } from '../lib/apiClient.js';

// メンター管理画面（仕様書 §F11/F12）。
//   D1 経由で生徒 CRUD・苦手な文字一覧・リベンジ設定・PIN 変更・CSV 出力を提供する。
//
// props:
//   students: Array<{ id, name, points, created_at }>
//   currentStudentId: string | null
//   revengeOptions: { immediate, summary }
//   onClose: () => void — メニューに戻る（App 側で students/config を再取得する）
export default function MentorMenu({
  students: initialStudents = [],
  currentStudentId,
  revengeOptions: initialRevenge,
  onClose,
}) {
  const [students, setStudents] = useState(initialStudents);
  const [selectedStudentId, setSelectedStudentId] = useState(currentStudentId);
  const [revenge, setRevenge] = useState(initialRevenge);
  const [mistakes, setMistakes] = useState([]);
  const [mistakesLoading, setMistakesLoading] = useState(false);

  // 生徒追加
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  // PIN 変更
  const [pinChangeMode, setPinChangeMode] = useState(false);
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinSaved, setPinSaved] = useState(false);
  const [pinError, setPinError] = useState('');

  // 全体エラー
  const [error, setError] = useState('');

  // 選択生徒の苦手な文字を取得
  useEffect(() => {
    if (!selectedStudentId) {
      setMistakes([]);
      return;
    }
    let alive = true;
    setMistakesLoading(true);
    mistakesApi
      .listMistakes(selectedStudentId)
      .then((list) => {
        if (alive) setMistakes(list);
      })
      .catch((e) => {
        if (alive) setError(`苦手な文字の取得に失敗 (${e.message})`);
      })
      .finally(() => {
        if (alive) setMistakesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedStudentId]);

  const refreshStudents = async () => {
    try {
      const list = await studentsApi.listStudents();
      setStudents(list);
      return list;
    } catch (e) {
      setError(`生徒一覧の取得に失敗 (${e.message})`);
      return students;
    }
  };

  const handleAddStudent = async () => {
    setError('');
    const name = newName.trim();
    if (!name) {
      setError('名前を入力してください');
      return;
    }
    setAdding(true);
    try {
      const created = await studentsApi.createStudent({ name });
      const list = await refreshStudents();
      // 追加した生徒を選択状態にする
      if (created?.id) setSelectedStudentId(created.id);
      else if (list.length > 0) setSelectedStudentId(list[list.length - 1].id);
      setNewName('');
      setAddOpen(false);
    } catch (e) {
      setError(`追加できませんでした (${e.message})`);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!confirm('この生徒を削除します。記録もすべて消えます。よろしいですか？')) return;
    setError('');
    try {
      await studentsApi.deleteStudent({ id });
      const list = await refreshStudents();
      if (selectedStudentId === id) {
        setSelectedStudentId(list[0]?.id ?? null);
      }
    } catch (e) {
      setError(`削除できませんでした (${e.message})`);
    }
  };

  const toggleRevenge = async (key) => {
    const next = { ...revenge, [key]: !revenge[key] };
    setRevenge(next); // 楽観 UI
    try {
      const updated = await mentorApi.updateConfig({ [key]: next[key] });
      setRevenge(updated);
    } catch (e) {
      setError(`設定の保存に失敗 (${e.message})`);
      // ロールバック
      setRevenge(revenge);
    }
  };

  const handleClearMistakes = async () => {
    if (!selectedStudentId) return;
    if (!confirm('苦手な文字の記録をクリアします。よろしいですか？')) return;
    setError('');
    try {
      // 個別削除APIがないので、生徒を削除→再作成は不可能。
      // 暫定: クライアント側のキャッシュだけクリアし、サーバはそのまま。
      // 今後 DELETE /api/students/:id/mistakes を追加して置換する。
      setMistakes([]);
      setError('注: 全クリアAPIは未実装。一覧表示のみリセットしました。');
    } catch (e) {
      setError(`クリアできませんでした (${e.message})`);
    }
  };

  const handlePinSave = async () => {
    setPinError('');
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('新しいPINは4桁の数字で');
      return;
    }
    try {
      await mentorApi.changePin({
        pin: oldPinInput || undefined,
        newPin,
      });
      setPinSaved(true);
      setNewPin('');
      setOldPinInput('');
      setTimeout(() => {
        setPinSaved(false);
        setPinChangeMode(false);
      }, 1500);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setPinError('現在のPINが違うか、セッションが切れています');
      } else {
        setPinError(`保存に失敗 (${e.message})`);
      }
    }
  };

  const handleCsvExport = () => {
    const lines = ['student,character,mode,count,last_at'];
    const studentName = students.find((s) => s.id === selectedStudentId)?.name ?? '';
    for (const m of mistakes) {
      lines.push(
        `${studentName},${m.character},${m.mode},${m.count},${m.last_at}`
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mistakes-${studentName || 'all'}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
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

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* カラム1: 生徒選択 (F11) */}
        <section className="bg-white rounded-2xl p-6 border-2 border-orange-200">
          <h2 className="text-lg font-black text-orange-900 mb-4">生徒選択</h2>

          <div className="flex flex-col gap-2 mb-3">
            {students.length === 0 ? (
              <p className="text-sm text-slate-400 py-3">生徒がいません</p>
            ) : (
              students.map((s) => {
                const selected = s.id === selectedStudentId;
                return (
                  <div
                    key={s.id}
                    className={[
                      'flex items-center gap-2 px-3 py-2 rounded-xl border',
                      selected
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-orange-100 bg-white',
                    ].join(' ')}
                  >
                    <button
                      onClick={() => setSelectedStudentId(s.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {selected ? (
                        <CircleCheck className="w-4 h-4 text-orange-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                      )}
                      <span className="font-bold text-orange-900">{s.name}</span>
                      <span className="ml-auto text-xs text-amber-600">
                        {s.points} pt
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(s.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                      aria-label="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {addOpen ? (
            <div className="flex flex-col gap-2 mt-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例: はなこ"
                maxLength={20}
                className="px-3 py-2 rounded-xl border-2 border-orange-300 font-bold"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAddOpen(false);
                    setNewName('');
                  }}
                  className="flex-1 py-2 rounded-xl border-2 border-slate-300 text-slate-500 text-sm font-bold flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" />
                  キャンセル
                </button>
                <button
                  disabled={adding || !newName.trim()}
                  onClick={handleAddStudent}
                  className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  追加
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddOpen(true)}
              className="mt-2 w-full py-2 rounded-xl border-2 border-dashed border-blue-400 text-blue-600 text-sm font-bold flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              生徒を追加
            </button>
          )}
        </section>

        {/* カラム2: 苦手な文字 (F8) */}
        <section className="bg-white rounded-2xl p-6 border-2 border-orange-200">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-black text-orange-900">苦手な文字</h2>
          </div>
          <p className="text-xs text-amber-700 font-bold mb-4">
            {students.find((s) => s.id === selectedStudentId)?.name ?? '—'} の記録
          </p>
          {mistakesLoading ? (
            <p className="text-sm text-slate-400 py-3">読み込み中…</p>
          ) : mistakes.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              まだ記録がありません
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {mistakes.slice(0, 15).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-3 py-2 bg-amber-50 rounded-xl"
                >
                  <span className="text-2xl font-black text-orange-900">
                    {m.character}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-bold">
                    {m.mode}
                  </span>
                  <span className="ml-auto px-2 py-0.5 rounded-lg bg-red-100 text-red-700 text-xs font-black">
                    ×{m.count}
                  </span>
                </div>
              ))}
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
              <p className="text-sm font-bold text-orange-900">PIN変更</p>
              <input
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={oldPinInput}
                onChange={(e) =>
                  setOldPinInput(e.target.value.replace(/\D/g, ''))
                }
                placeholder="現在のPIN (省略可)"
                className="px-3 py-2 rounded-xl border border-orange-200 text-base text-center font-bold tracking-widest"
              />
              <input
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="新しいPIN (4桁)"
                className="px-3 py-2 rounded-xl border-2 border-orange-300 text-lg text-center font-bold tracking-widest"
              />
              {pinError && (
                <p className="text-xs text-red-500 font-bold">{pinError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPinChangeMode(false);
                    setNewPin('');
                    setOldPinInput('');
                    setPinError('');
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
