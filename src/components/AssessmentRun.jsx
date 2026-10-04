import { useMemo, useRef, useState } from 'react';
import { romajiList } from '../data/romaji.js';
import * as progressApi from '../lib/api/progress.js';
import { MODES } from '../lib/mode.js';
import PlayContainer from './PlayContainer.jsx';

function pendingIds(state) {
  return state.eligibleCharacterIds ?? [];
}

export default function AssessmentRun({ studentId, step, initialState, letterCase, points, onBack, onPassed }) {
  const [state, setState] = useState(initialState);
  const [round, setRound] = useState(0);
  const [error, setError] = useState('');
  const questions = useMemo(() => pendingIds(state).map((id) => romajiList.find((item) => item.r === id)).filter(Boolean), [state]);

  // 1問ごとにサーバーへ保存する。順序を守るため直列に送り、最新の応答と失敗を保持する。
  // 出題中に state を更新すると問題リストが作り直されるため、反映はラウンド終了時だけ行う。
  const saveChainRef = useRef(Promise.resolve());
  const latestRef = useRef(null);
  const saveErrorRef = useRef(null);

  const handleAnswer = (question, choice, isCorrect) => {
    // 誤答は同じステップ内の別の文字として送る（サーバーは同一ステップの文字だけ受け付ける）。
    const selectedChoiceId = isCorrect
      ? question.r
      : choice?.step === question.step && choice.r !== question.r
        ? choice.r
        : romajiList.find((item) => item.step === question.step && item.r !== question.r)?.r;
    const attemptVersion = state.attemptVersion;
    saveChainRef.current = saveChainRef.current.then(async () => {
      if (saveErrorRef.current) return;
      try {
        latestRef.current = await progressApi.answerAssessment(studentId, step, { attemptVersion, promptCharacterId: question.r, selectedChoiceId });
      } catch (err) {
        saveErrorRef.current = err;
      }
    });
  };

  const resetSaves = () => {
    saveChainRef.current = Promise.resolve();
    latestRef.current = null;
    saveErrorRef.current = null;
  };

  const finishRound = async () => {
    await saveChainRef.current;
    const failure = saveErrorRef.current;
    const latest = latestRef.current;
    resetSaves();
    if (failure || !latest) {
      setError(failure?.message ?? 'うでだめしを ほぞんできませんでした');
      return;
    }
    setState(latest);
    if (latest.passed) onPassed?.();
    else setRound((value) => value + 1);
  };

  const handleBack = async () => {
    // 送信中の回答を待ってから戻る（戻った直後の「つづきから」に反映させる）。
    await saveChainRef.current;
    onBack?.();
  };

  if (state.passed) return <div className="min-h-screen bg-green-50 p-8 text-center"><h1 className="mt-24 text-5xl font-black text-green-600">ごうかく！</h1><button onClick={onBack} className="mt-10 rounded-2xl bg-blue-500 px-8 py-4 font-bold text-white">うでだめしへ もどる</button></div>;
  if (error) return <div className="min-h-screen bg-yellow-50 p-8 text-center"><p className="mt-24 font-bold text-red-600">{error}</p><button onClick={async () => { try { const resumed = await progressApi.startAssessment(studentId, step); setState(resumed); setError(''); setRound((value) => value + 1); } catch (err) { setError(err.message ?? 'さいかいできませんでした'); } }} className="mt-8 rounded-2xl bg-orange-500 px-8 py-4 font-bold text-white">もういちど ためす</button><button onClick={onBack} className="ml-3 mt-8 rounded-2xl bg-blue-500 px-8 py-4 font-bold text-white">もどる</button></div>;
  return <PlayContainer key={`${step}-${round}`} initialQuestions={questions} points={points} mode={MODES.h2r} letterCase={letterCase} studentId={null} onFinished={finishRound} onAnswer={handleAnswer} onPointsChange={() => {}} onBack={handleBack} />;
}
