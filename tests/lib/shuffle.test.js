import { describe, it, expect } from 'vitest';
import { shuffle } from '../../src/lib/shuffle.js';

describe('shuffle', () => {
  it('returns an array of the same length', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
  });

  it('preserves all original elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result.slice().sort()).toEqual(input.slice().sort());
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5];
    const snapshot = [...input];
    shuffle(input);
    expect(input).toEqual(snapshot);
  });

  it('returns a new array instance (not the same reference)', () => {
    const input = [1, 2, 3];
    const result = shuffle(input);
    expect(result).not.toBe(input);
  });

  it('handles empty array', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('handles single element array', () => {
    expect(shuffle([42])).toEqual([42]);
  });

  it('works with object elements', () => {
    const input = [{ h: 'あ', r: 'a' }, { h: 'い', r: 'i' }];
    const result = shuffle(input);
    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining(input));
  });
});
