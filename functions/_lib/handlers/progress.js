import { errorJson, json, readJson } from '../http.js';
import {
  ASSESSMENT_COST,
  CURRICULUM,
  CURRICULUM_VERSION,
  canAccessStep,
  hasReachedStep,
  getStep,
  getUnit,
  splitAssessment,
} from '../../../src/data/curriculum.js';
import { characterId } from '../../../src/data/romaji.js';

async function studentRow(env, id) {
  return env.DB.prepare(
    'SELECT id, total_points, available_points, legacy_full_access FROM students WHERE id = ?'
  ).bind(id).first();
}

async function passedSteps(env, id) {
  const result = await env.DB.prepare(
    "SELECT step FROM assessment_progress WHERE student_id = ? AND status = 'passed' ORDER BY step"
  ).bind(id).all();
  return (result?.results ?? []).map((row) => Number(row.step));
}

function progressShape(student, passed, completions, assessments) {
  const access = CURRICULUM.flatMap((step) => step.units.map((unitId) => ({
    unitId,
    step: step.number,
    access: canAccessStep({ legacy_full_access: student.legacy_full_access, passedSteps: passed }, step.number)
      ? (step.number > 1 && !passed.includes(step.number - 1) ? 'legacy-preview' : 'available')
      : 'locked',
  })));
  return {
    curriculumVersion: CURRICULUM_VERSION,
    totalPoints: student.total_points,
    availablePoints: student.available_points,
    legacyFullAccess: Boolean(student.legacy_full_access),
    passedSteps: passed,
    practiceCompletions: completions,
    access,
    assessments,
  };
}

export async function getProgress({ env, params }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const student = await studentRow(env, params?.id);
  if (!student) return errorJson('student not found', 404);
  const [passed, completionResult, assessmentResult] = await Promise.all([
    passedSteps(env, student.id),
    env.DB.prepare('SELECT unit_id, reward FROM practice_completions WHERE student_id = ? AND curriculum_version = ? ORDER BY unit_id').bind(student.id, CURRICULUM_VERSION).all(),
    env.DB.prepare('SELECT step, status, curriculum_version, started_at, passed_at FROM assessment_progress WHERE student_id = ? ORDER BY step').bind(student.id).all(),
  ]);
  return json(progressShape(student, passed, completionResult?.results ?? [], assessmentResult?.results ?? []));
}

export async function completePractice({ request, env, params }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const student = await studentRow(env, params?.id);
  if (!student) return errorJson('student not found', 404);
  const body = await readJson(request);
  const unit = getUnit(body?.unitId);
  if (!unit) return errorJson('invalid unit', 400);
  const passed = await passedSteps(env, student.id);
  if (!canAccessStep({ legacy_full_access: student.legacy_full_access, passedSteps: passed }, unit.step.number)) {
    return errorJson('unit is locked', 403);
  }
  if (!hasReachedStep({ passedSteps: passed }, unit.step.number)) {
    return errorJson('preview practice does not earn progress', 403);
  }
  const expected = unit.characters.map(characterId).sort();
  const transcript = Array.isArray(body?.answers) ? body.answers : [];
  const submitted = transcript.map((answer) => answer?.promptCharacterId).sort();
  if (body?.mode !== 'h2r' && body?.mode !== 'r2h') return errorJson('invalid mode', 400);
  if (body?.retry === true || submitted.length !== expected.length || new Set(submitted).size !== expected.length || submitted.some((id, i) => id !== expected[i]) || transcript.some((answer) => answer?.selectedChoiceId !== answer?.promptCharacterId)) {
    return errorJson('a complete all-correct first session is required', 422);
  }
  const reward = unit.step.reward;
  const statements = [
    env.DB.prepare('INSERT OR IGNORE INTO practice_completions (student_id, curriculum_version, unit_id, reward) VALUES (?, ?, ?, ?)').bind(student.id, CURRICULUM_VERSION, unit.unitId, reward),
    env.DB.prepare('UPDATE students SET total_points = total_points + ?, available_points = available_points + ? WHERE id = ? AND changes() = 1').bind(reward, reward, student.id),
  ];
  if (unit.step.number === 3) {
    statements.push(env.DB.prepare(`UPDATE students SET total_points = total_points + 10, available_points = available_points + 10
      WHERE id = ? AND changes() = 1 AND (SELECT COUNT(*) FROM practice_completions WHERE student_id = ? AND curriculum_version = ? AND unit_id LIKE 'youon:%') = 11`).bind(student.id, student.id, CURRICULUM_VERSION));
  }
  const results = await env.DB.batch(statements);
  const latest = await studentRow(env, student.id);
  const completion = await env.DB.prepare('SELECT reward FROM practice_completions WHERE student_id = ? AND curriculum_version = ? AND unit_id = ?').bind(student.id, CURRICULUM_VERSION, unit.unitId).first();
  const firstAward = results?.[0]?.meta?.changes === 1 ? reward : 0;
  const bonus = results?.[2]?.meta?.changes === 1 ? 10 : 0;
  return json({ awarded: firstAward + bonus, reward: completion?.reward ?? 0, totalPoints: latest.total_points, availablePoints: latest.available_points });
}

export async function unlockAssessment({ env, params }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const step = getStep(params?.step);
  if (!step) return errorJson('invalid step', 400);
  const student = await studentRow(env, params?.id);
  if (!student) return errorJson('student not found', 404);
  const passed = await passedSteps(env, student.id);
  if (step.number > 1 && !passed.includes(step.number - 1)) return errorJson('previous assessment must be passed', 409);
  const existing = await env.DB.prepare('SELECT status FROM assessment_progress WHERE student_id = ? AND step = ?').bind(student.id, step.number).first();
  if (existing) return json({ status: existing.status, charged: false, totalPoints: student.total_points, availablePoints: student.available_points });
  const completionResult = await env.DB.prepare(
    'SELECT unit_id, reward FROM practice_completions WHERE student_id = ? AND curriculum_version = ? ORDER BY unit_id'
  ).bind(student.id, CURRICULUM_VERSION).all();
  const completedUnits = new Set((completionResult?.results ?? []).map((row) => row.unit_id));
  if (!step.units.every((unitId) => completedUnits.has(unitId))) {
    return errorJson('complete every practice unit before unlocking the assessment', 409);
  }
  if (student.available_points < ASSESSMENT_COST) return errorJson('not enough available points', 409);
  const results = await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO assessment_progress (student_id, step, curriculum_version, status)
      SELECT id, ?, ?, 'unlocked' FROM students WHERE id = ? AND available_points >= ?`).bind(step.number, CURRICULUM_VERSION, student.id, ASSESSMENT_COST),
    env.DB.prepare('UPDATE students SET available_points = available_points - ? WHERE id = ? AND changes() = 1 AND available_points >= ?').bind(ASSESSMENT_COST, student.id, ASSESSMENT_COST),
  ]);
  const latest = await studentRow(env, student.id);
  const unlocked = await env.DB.prepare('SELECT status FROM assessment_progress WHERE student_id = ? AND step = ?').bind(student.id, step.number).first();
  if (!unlocked) return errorJson('unable to unlock assessment', 409);
  return json({ status: unlocked.status, charged: results?.[0]?.meta?.changes === 1, totalPoints: latest.total_points, availablePoints: latest.available_points });
}

export async function startAssessment({ env, params }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const step = getStep(params?.step);
  if (!step) return errorJson('invalid step', 400);
  const progress = await env.DB.prepare('SELECT status, curriculum_version FROM assessment_progress WHERE student_id = ? AND step = ?').bind(params?.id, step.number).first();
  if (!progress) return errorJson('assessment is locked', 409);
  if (progress.curriculum_version !== CURRICULUM_VERSION) return errorJson('curriculum version mismatch', 409);
  const statements = step.characters.map((character) => env.DB.prepare(
    "INSERT OR IGNORE INTO assessment_answers (student_id, step, curriculum_version, character_id, state) VALUES (?, ?, ?, ?, 'unseen')"
  ).bind(params.id, step.number, CURRICULUM_VERSION, characterId(character)));
  statements.push(env.DB.prepare("UPDATE assessment_progress SET status = CASE WHEN status = 'unlocked' THEN 'in_progress' ELSE status END, started_at = COALESCE(started_at, datetime('now')) WHERE student_id = ? AND step = ?").bind(params.id, step.number));
  await env.DB.batch(statements);
  return assessmentState(env, params.id, step);
}

async function assessmentState(env, id, step) {
  const result = await env.DB.prepare('SELECT character_id, state FROM assessment_answers WHERE student_id = ? AND step = ? AND curriculum_version = ?').bind(id, step.number, CURRICULUM_VERSION).all();
  const stateById = Object.fromEntries((result?.results ?? []).map((row) => [row.character_id, row.state]));
  const sets = splitAssessment(step);
  let currentSet = sets.findIndex((set) => set.some((id2) => stateById[id2] !== 'correct'));
  if (currentSet < 0) currentSet = sets.length;
  const review = step.characters.filter((item) => stateById[characterId(item)] === 'review_required').map(characterId);
  const currentIds = sets[currentSet] ?? [];
  const unseen = currentIds.filter((characterId2) => stateById[characterId2] === 'unseen');
  const eligibleCharacterIds = unseen.length ? unseen : currentIds.filter((characterId2) => stateById[characterId2] === 'review_required');
  return json({ step: step.number, mode: 'h2r', attemptVersion: CURRICULUM_VERSION, curriculumVersion: CURRICULUM_VERSION, sets, currentSet, review, eligibleCharacterIds, states: stateById, passed: currentSet === sets.length });
}

export async function answerAssessment({ request, env, params }) {
  if (!env?.DB) return errorJson('DB binding is missing', 500);
  const step = getStep(params?.step);
  if (!step) return errorJson('invalid step', 400);
  const body = await readJson(request);
  const character = step.characters.find((item) => characterId(item) === body?.promptCharacterId);
  const selected = step.characters.find((item) => characterId(item) === body?.selectedChoiceId);
  if (!character || !selected || body?.attemptVersion !== CURRICULUM_VERSION) return errorJson('invalid assessment answer', 400);
  const progress = await env.DB.prepare("SELECT status, curriculum_version FROM assessment_progress WHERE student_id = ? AND step = ?").bind(params?.id, step.number).first();
  if (!progress || !['in_progress', 'passed'].includes(progress.status)) return errorJson('assessment is not in progress', 409);
  if (progress.curriculum_version !== CURRICULUM_VERSION) return errorJson('curriculum version mismatch', 409);
  const current = await env.DB.prepare('SELECT state FROM assessment_answers WHERE student_id = ? AND step = ? AND curriculum_version = ? AND character_id = ?').bind(params.id, step.number, CURRICULUM_VERSION, characterId(character)).first();
  if (!current) return errorJson('assessment has not been started', 409);
  const allStates = await env.DB.prepare('SELECT character_id, state FROM assessment_answers WHERE student_id = ? AND step = ? AND curriculum_version = ?').bind(params.id, step.number, CURRICULUM_VERSION).all();
  const stateMap = Object.fromEntries((allStates?.results ?? []).map((row) => [row.character_id, row.state]));
  const sets = splitAssessment(step);
  const currentSet = sets.find((set) => set.some((id) => stateMap[id] !== 'correct')) ?? [];
  const unseen = currentSet.filter((id) => stateMap[id] === 'unseen');
  const eligible = unseen.length ? unseen : currentSet.filter((id) => stateMap[id] === 'review_required');
  if (!eligible.includes(characterId(character))) return errorJson('character is not in the current assessment set', 409);
  const nextState = body.selectedChoiceId === body.promptCharacterId ? 'correct' : 'review_required';
  await env.DB.batch([
    env.DB.prepare("UPDATE assessment_answers SET state = CASE WHEN state = 'correct' THEN 'correct' ELSE ? END, updated_at = datetime('now') WHERE student_id = ? AND step = ? AND curriculum_version = ? AND character_id = ?").bind(nextState, params.id, step.number, CURRICULUM_VERSION, characterId(character)),
    env.DB.prepare(`UPDATE assessment_progress SET status = 'passed', passed_at = COALESCE(passed_at, datetime('now'))
      WHERE student_id = ? AND step = ? AND NOT EXISTS (SELECT 1 FROM assessment_answers WHERE student_id = ? AND step = ? AND curriculum_version = ? AND state <> 'correct')`).bind(params.id, step.number, params.id, step.number, CURRICULUM_VERSION),
  ]);
  return assessmentState(env, params.id, step);
}
