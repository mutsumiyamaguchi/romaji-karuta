import { useState } from 'react';
import { Lock, UserPlus, Check } from 'lucide-react';
import { initPin } from '../lib/api/mentor.js';
import { createStudent } from '../lib/api/students.js';
import { ApiError } from '../lib/apiClient.js';

// 初回セットアップ画面。
//   D1 が空の状態（PIN 未初期化 or 生徒 0 人）から、
//   メンター PIN を設定し、最初の生徒を 1 名作るまでを案内する。
//
// step 1: PIN 設定
// step 2: 1 人目の生徒を作成
//
// PIN 初期化が成功すると同時にセッション Cookie が発行されるので、
// step 2 の createStudent はそのセッションで認証が通る。
//
// props:
//   onComplete: () => Promise<void> | void — セットアップが完了したら呼ばれる
export default function SetupScreen({ onComplete }) {
  const [step, setStep] = useState('pin'); // 'pin' | 'student' | 'done'
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [studentName, setStudentName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submitPin = async () => {
    setError('');
    if (!/^\d{4}$/.test(pin)) {
      setError('PINは4けたの すうじで いれてね');
      return;
    }
    if (pin !== pin2) {
      setError('2かいめの PINが ちがうみたい');
      return;
    }
    setSubmitting(true);
    try {
      await initPin(pin);
      setStep('student');
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'PINはもう せっていされて いるよ'
          : `せっていできなかった (${e.message})`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitStudent = async () => {
    setError('');
    const name = studentName.trim();
    if (!name) {
      setError('せいとの なまえを いれてね');
      return;
    }
    setSubmitting(true);
    try {
      await createStudent({ name });
      await onComplete?.();
    } catch (e) {
      setError(`つくれなかった (${e.message})`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-50 flex items-center justify-center font-sans p-4">
      <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl border-2 border-orange-200 flex flex-col items-center gap-5">
        <div className="flex items-center gap-2 text-amber-700 text-sm font-bold">
          <span
            className={[
              'flex items-center justify-center w-6 h-6 rounded-full text-xs',
              step === 'pin'
                ? 'bg-orange-500 text-white'
                : 'bg-green-500 text-white',
            ].join(' ')}
          >
            {step === 'pin' ? '1' : <Check className="w-4 h-4" />}
          </span>
          <span>PIN設定</span>
          <span className="text-orange-200 mx-1">›</span>
          <span
            className={[
              'flex items-center justify-center w-6 h-6 rounded-full text-xs',
              step === 'student'
                ? 'bg-orange-500 text-white'
                : 'bg-orange-100 text-orange-700',
            ].join(' ')}
          >
            2
          </span>
          <span>生徒登録</span>
        </div>

        {step === 'pin' && (
          <>
            <Lock className="w-12 h-12 text-orange-500" />
            <h2 className="text-2xl font-black text-orange-900">
              はじめてのセットアップ
            </h2>
            <p className="text-sm font-bold text-amber-700 text-center">
              メンター用の 4けたPINを 決めてください。
              <br />
              生徒切替や設定変更で つかいます。
            </p>
            <input
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="PIN (4けた)"
              className="w-full px-4 py-3 rounded-2xl border-2 border-orange-300 text-2xl text-center font-bold tracking-widest"
            />
            <input
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin2}
              onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))}
              placeholder="もういちど"
              className="w-full px-4 py-3 rounded-2xl border-2 border-orange-300 text-2xl text-center font-bold tracking-widest"
            />
            {error && (
              <p className="text-sm font-bold text-red-500">{error}</p>
            )}
            <button
              disabled={submitting}
              onClick={submitPin}
              className="w-full py-3 rounded-2xl bg-orange-500 text-white font-bold active:translate-y-0.5 transition-all disabled:opacity-50"
            >
              つぎへ
            </button>
          </>
        )}

        {step === 'student' && (
          <>
            <UserPlus className="w-12 h-12 text-orange-500" />
            <h2 className="text-2xl font-black text-orange-900">
              さいしょの生徒を 登録
            </h2>
            <p className="text-sm font-bold text-amber-700 text-center">
              なまえを いれてね。
              <br />
              あとから メンター画面で 追加できます。
            </p>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="例: たろう"
              maxLength={20}
              className="w-full px-4 py-3 rounded-2xl border-2 border-orange-300 text-xl text-center font-bold"
            />
            {error && (
              <p className="text-sm font-bold text-red-500">{error}</p>
            )}
            <button
              disabled={submitting}
              onClick={submitStudent}
              className="w-full py-3 rounded-2xl bg-orange-500 text-white font-bold active:translate-y-0.5 transition-all disabled:opacity-50"
            >
              はじめる
            </button>
          </>
        )}
      </div>
    </div>
  );
}
