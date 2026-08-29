import { characterId, romajiList, STEPS, unitId } from './romaji.js';

export const CURRICULUM_VERSION = 'v1';
export const ASSESSMENT_COST = 1000;

const definitions = [
  { number: 1, key: STEPS.seion, reward: 100, setSizes: [12, 12, 12, 12] },
  { number: 2, key: STEPS.dakuon, reward: 125, setSizes: [12, 11, 11] },
  { number: 3, key: STEPS.youon, reward: 90, completionBonus: 10, setSizes: [11, 11, 11] },
];

export const CURRICULUM = Object.freeze(definitions.map((definition) => {
  const characters = romajiList.filter((item) => item.step === definition.key);
  const units = [...new Set(characters.map(unitId))];
  return Object.freeze({ ...definition, characters, units });
}));

export function getStep(step) {
  const number = Number(step);
  return Number.isInteger(number) ? CURRICULUM.find((item) => item.number === number) ?? null : null;
}

export function getUnit(unitId) {
  for (const step of CURRICULUM) {
    if (step.units.includes(unitId)) {
      return { step, unitId, characters: step.characters.filter((item) => `${item.step}:${item.row}` === unitId) };
    }
  }
  return null;
}

export function splitAssessment(step) {
  const groups = [];
  let offset = 0;
  for (const size of step.setSizes) {
    groups.push(step.characters.slice(offset, offset + size).map(characterId));
    offset += size;
  }
  return groups;
}

export function canAccessStep(progress, stepNumber) {
  return Boolean(progress.legacy_full_access) || stepNumber === 1 || progress.passedSteps.includes(stepNumber - 1);
}
