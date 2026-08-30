import { ArrowLeft, CheckCircle2, Lock, Play, Star } from 'lucide-react';
import { ASSESSMENT_COST, CURRICULUM } from '../data/curriculum.js';

export default function AssessmentMenu({ progress, onBack, onOpen }) {
  const statuses = new Map((progress?.assessments ?? []).map((item) => [Number(item.step), item.status]));
  const completedUnits = new Set((progress?.practiceCompletions ?? []).map((item) => item.unit_id));
  return (
    <div className="min-h-screen bg-yellow-50 p-4 text-gray-800">
      <header className="mx-auto flex max-w-3xl items-center justify-between">
        <button onClick={onBack} className="rounded-full border-2 border-blue-400 bg-white px-4 py-2 font-bold text-blue-600">
          <ArrowLeft className="mr-2 inline h-5 w-5" />もどる
        </button>
        <div className="flex gap-2 text-sm font-bold">
          <span className="rounded-full bg-white px-3 py-2 text-yellow-700">ごうけい {progress?.totalPoints ?? 0}</span>
          <span className="rounded-full bg-white px-3 py-2 text-orange-700">つかえる {progress?.availablePoints ?? 0}</span>
        </div>
      </header>
      <main className="mx-auto mt-12 max-w-3xl">
        <h1 className="mb-8 text-center text-5xl font-black text-orange-500">うでだめし</h1>
        <div className="grid gap-5 sm:grid-cols-3">
          {[1, 2, 3].map((step) => {
            const curriculumStep = CURRICULUM.find((item) => item.number === step);
            const status = statuses.get(step);
            const reached = step === 1 || progress?.passedSteps?.includes(step - 1);
            const passed = status === 'passed';
            const practiceReady = curriculumStep.units.every((unitId) => completedUnits.has(unitId));
            const hasPoints = (progress?.availablePoints ?? 0) >= ASSESSMENT_COST;
            const enabled = Boolean(status) || (reached && practiceReady && hasPoints);
            const message = passed
              ? 'ごうかく'
              : status
                ? 'つづきから'
                : !reached
                  ? 'まだ はいれないよ'
                  : !practiceReady
                    ? `まず ${curriculumStep.units.length}こ ぜんぶ クリア`
                    : !hasPoints
                      ? `あと ${ASSESSMENT_COST - (progress?.availablePoints ?? 0)}ポイント`
                      : null;
            return <button key={step} disabled={!enabled} onClick={() => onOpen(step, Boolean(status))}
              className="rounded-3xl border-4 border-orange-400 bg-white p-6 text-center shadow-[0_7px_0_#f6ad55] disabled:opacity-50">
              {passed ? <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" /> : reached ? <Play className="mx-auto mb-3 h-10 w-10 text-orange-500" /> : <Lock className="mx-auto mb-3 h-10 w-10 text-gray-400" />}
              <div className="text-2xl font-black">ステップ{step}</div>
              <div className="mt-2 text-sm font-bold">{message ?? <><Star className="inline h-4 w-4" /> {ASSESSMENT_COST}ポイントで かいほう</>}</div>
            </button>;
          })}
        </div>
      </main>
    </div>
  );
}
