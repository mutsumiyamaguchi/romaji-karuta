import { describe, it, expect } from 'vitest';
import {
  MODES,
  MODE_LABELS,
  LETTER_CASES,
  LETTER_CASE_LABELS,
  getPrompt,
  getChoiceLabel,
} from '../../src/lib/mode.js';

describe('mode constants', () => {
  it('exposes only h2r and r2h mode IDs', () => {
    expect(MODES.h2r).toBe('h2r');
    expect(MODES.r2h).toBe('r2h');
    expect(Object.keys(MODES)).toHaveLength(2);
    expect(MODES.H2R).toBeUndefined();
  });

  it('exposes a label for every mode', () => {
    expect(MODE_LABELS.h2r).toBeTruthy();
    expect(MODE_LABELS.r2h).toBeTruthy();
    expect(Object.keys(MODE_LABELS)).toHaveLength(2);
  });
});

describe('letter case constants', () => {
  it('exposes upper and lower variants', () => {
    expect(LETTER_CASES.upper).toBe('upper');
    expect(LETTER_CASES.lower).toBe('lower');
    expect(Object.keys(LETTER_CASES)).toHaveLength(2);
  });

  it('exposes labels for each variant', () => {
    expect(LETTER_CASE_LABELS.upper).toBe('ABC');
    expect(LETTER_CASE_LABELS.lower).toBe('abc');
  });
});

describe('getPrompt(item, mode, letterCase)', () => {
  const item = { h: 'か', r: 'ka', row: 'か' };

  it('returns the hiragana when mode is h2r regardless of letterCase', () => {
    expect(getPrompt(item, 'h2r', 'upper')).toBe('か');
    expect(getPrompt(item, 'h2r', 'lower')).toBe('か');
  });

  it('returns uppercase romaji when mode is r2h and letterCase is upper', () => {
    expect(getPrompt(item, 'r2h', 'upper')).toBe('KA');
  });

  it('returns lowercase romaji when mode is r2h and letterCase is lower', () => {
    expect(getPrompt(item, 'r2h', 'lower')).toBe('ka');
  });

  it('defaults to upper when letterCase is omitted (r2h)', () => {
    expect(getPrompt(item, 'r2h')).toBe('KA');
  });

  it('uppercases multi-char romaji correctly in r2h (shi -> SHI)', () => {
    const shi = { h: 'し', r: 'shi', row: 'さ' };
    expect(getPrompt(shi, 'r2h', 'upper')).toBe('SHI');
    expect(getPrompt(shi, 'r2h', 'lower')).toBe('shi');
  });
});

describe('getChoiceLabel(item, mode, letterCase)', () => {
  const item = { h: 'か', r: 'ka', row: 'か' };

  it('returns hiragana when mode is r2h regardless of letterCase', () => {
    expect(getChoiceLabel(item, 'r2h', 'upper')).toBe('か');
    expect(getChoiceLabel(item, 'r2h', 'lower')).toBe('か');
  });

  it('returns uppercase romaji when mode is h2r and letterCase is upper', () => {
    expect(getChoiceLabel(item, 'h2r', 'upper')).toBe('KA');
  });

  it('returns lowercase romaji when mode is h2r and letterCase is lower', () => {
    expect(getChoiceLabel(item, 'h2r', 'lower')).toBe('ka');
  });

  it('defaults to upper when letterCase is omitted (h2r)', () => {
    expect(getChoiceLabel(item, 'h2r')).toBe('KA');
  });

  it('uppercases multi-char romaji correctly in h2r (shi -> SHI)', () => {
    expect(getChoiceLabel({ h: 'し', r: 'shi', row: 'さ' }, 'h2r', 'upper')).toBe('SHI');
  });
});
