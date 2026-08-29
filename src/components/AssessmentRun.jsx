import { useMemo, useState } from 'react';
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

  const finishRound = async (mistakes) => {
    const wrong = new Set((mistakes ?? []).map((item) => item.r));
    try {
      let latest = state;
      for (const question of questions) {
        const selectedChoiceId = wrong.has(question.r)
          ? romajiList.find((item) => item.step === question.step && item.r !== question.r)?.r
          : question.r;
        latest = await progressApi.answerAssessment(studentId, step, { attemptVersion: state.attemptVersion, promptCharacterId: question.r, selectedChoiceId });
      }
      setState(latest);
      if (latest.passed) onPassed?.();
      else setRound((value) => value + 1);
    } catch (err) {
      setError(err.message ?? 'うでだめしを ほぞんできませんでした');
    }
  };

  if (state.passed) return <div className="min-h-screen bg-green-50 p-8 text-center"><h1 className="mt-24 text-5xl font-black text-green-600">ごうかく！</h1><button onClick={onBack} className="mt-10 rounded-2xl bg-blue-500 px-8 py-4 font-bold text-white">うでだめしへ もどる</button></div>;
  if (error) return <div className="min-h-screen bg-yellow-50 p-8 text-center"><p className="mt-24 font-bold text-red-600">{error}</p><button onClick={async () => { try { const resumed = await progressApi.startAssessment(studentId, step); setState(resumed); setError(''); setRound((value) => value + 1); } catch (err) { setError(err.message ?? 'さいかいできませんでした'); } }} className="mt-8 rounded-2xl bg-orange-500 px-8 py-4 font-bold text-white">もういちど ためす</button><button onClick={onBack} className="ml-3 mt-8 rounded-2xl bg-blue-500 px-8 py-4 font-bold text-white">もどる</button></div>;
  return <PlayContainer key={`${step}-${round}`} initialQuestions={questions} points={points} mode={MODES.h2r} letterCase={letterCase} studentId={null} onFinished={finishRound} onPointsChange={() => {}} onBack={onBack} />;
}
