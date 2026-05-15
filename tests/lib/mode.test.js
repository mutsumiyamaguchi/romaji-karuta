import { describe, it, expect } from 'vitest';
import { MODES, MODE_LABELS, getPrompt, getChoiceLabel } from '../../src/lib/mode.js';

describe('mode constants', () => {
  it('exposes the three mode IDs', () => {
    expect(MODES.h2r).toBe('h2r');
    expect(MODES.r2h).toBe('r2h');
    expect(MODES.H2R).toBe('H2R');
  });

  it('exposes a label for every mode', () => {
    expect(MODE_LABELS.h2r).toBeTruthy();
    expect(MODE_LABELS.r2h).toBeTruthy();
    expect(MODE_LABELS.H2R).toBeTruthy();
    expect(Object.keys(MODE_LABELS)).toHaveLength(3);
  });
});

describe('getPrompt(item, mode)', () => {
  const item = { h: 'か', r: 'ka', row: 'か' };

  it('returns the hiragana when mode is h2r', () => {
    expect(getPrompt(item, 'h2r')).toBe('か');
  });

  it('returns the lowercase romaji when mode is r2h', () => {
    expect(getPrompt(item, 'r2h')).toBe('ka');
  });

  it('returns the hiragana when mode is H2R', () => {
    expect(getPrompt(item, 'H2R')).toBe('か');
  });
});

describe('getChoiceLabel(item, mode)', () => {
  const item = { h: 'か', r: 'ka', row: 'か' };

  it('returns the lowercase romaji when mode is h2r', () => {
    expect(getChoiceLabel(item, 'h2r')).toBe('ka');
  });

  it('returns the hiragana when mode is r2h', () => {
    expect(getChoiceLabel(item, 'r2h')).toBe('か');
  });

  it('returns the uppercased romaji when mode is H2R', () => {
    expect(getChoiceLabel(item, 'H2R')).toBe('KA');
  });

  it('uppercases multi-char romaji correctly (shi -> SHI)', () => {
    expect(getChoiceLabel({ h: 'し', r: 'shi', row: 'さ' }, 'H2R')).toBe('SHI');
  });
});
