import { describe, expect, it } from 'vitest';
import { CURRICULUM, getUnit, splitAssessment } from '../../src/data/curriculum.js';

describe('curriculum v1', () => {
  it('has stable 48/34/33 characters and 10/8/11 units', () => {
    expect(CURRICULUM.map((step) => step.characters.length)).toEqual([48, 34, 33]);
    expect(CURRICULUM.map((step) => step.units.length)).toEqual([10, 8, 11]);
  });

  it('splits every assessment exactly once', () => {
    for (const step of CURRICULUM) {
      const ids = splitAssessment(step).flat();
      expect(ids).toHaveLength(step.characters.length);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(CURRICULUM.map((step) => splitAssessment(step).map((set) => set.length))).toEqual([
      [12, 12, 12, 12], [12, 11, 11], [11, 11, 11],
    ]);
  });

  it('defines the intended unit rewards', () => {
    expect(getUnit('seion:あ').step.reward).toBe(100);
    expect(getUnit('dakuon:小さいつ').step.reward).toBe(125);
    expect(getUnit('youon:ぴゃ').step.reward).toBe(90);
  });
});
