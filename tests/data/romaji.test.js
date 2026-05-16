import { describe, it, expect } from 'vitest';
import { romajiList, rows } from '../../src/data/romaji.js';

describe('romajiList', () => {
  it('contains exactly 48 entries (清音 + ん + うぃ/うぇ)', () => {
    expect(romajiList).toHaveLength(48);
  });

  it('has unique hiragana keys', () => {
    const hiraganaSet = new Set(romajiList.map(item => item.h));
    expect(hiraganaSet.size).toBe(romajiList.length);
  });

  it('has unique romaji values', () => {
    const romajiSet = new Set(romajiList.map(item => item.r));
    expect(romajiSet.size).toBe(romajiList.length);
  });

  it('each entry has h, r, and row string fields', () => {
    for (const item of romajiList) {
      expect(typeof item.h).toBe('string');
      expect(typeof item.r).toBe('string');
      expect(typeof item.row).toBe('string');
    }
  });

  it('includes representative kana for every row (snapshot of expected entries)', () => {
    // 主表記 r は訓令式優先（タイピング効率）。ヘボン式は alts に格納。
    const expected = [
      { h: 'あ', r: 'a', row: 'あ' },
      { h: 'か', r: 'ka', row: 'か' },
      { h: 'さ', r: 'sa', row: 'さ' },
      { h: 'し', r: 'si', alts: ['shi'], row: 'さ' },
      { h: 'た', r: 'ta', row: 'た' },
      { h: 'ち', r: 'ti', alts: ['chi'], row: 'た' },
      { h: 'つ', r: 'tu', alts: ['tsu'], row: 'た' },
      { h: 'な', r: 'na', row: 'な' },
      { h: 'は', r: 'ha', row: 'は' },
      { h: 'ふ', r: 'hu', alts: ['fu'], row: 'は' },
      { h: 'ま', r: 'ma', row: 'ま' },
      { h: 'や', r: 'ya', row: 'や' },
      { h: 'ら', r: 'ra', row: 'ら' },
      { h: 'わ', r: 'wa', row: 'わ' },
      { h: 'うぃ', r: 'wi', row: 'わ' },
      { h: 'うぇ', r: 'we', row: 'わ' },
      { h: 'を', r: 'wo', row: 'わ' },
      { h: 'ん', r: 'nn', row: 'わ' },
    ];
    for (const e of expected) {
      expect(romajiList).toContainEqual(e);
    }
  });

  it('alts contain hepburn variants for the four divergent kana', () => {
    const findRomaji = (h) => romajiList.find((it) => it.h === h);
    expect(findRomaji('し').alts).toEqual(['shi']);
    expect(findRomaji('ち').alts).toEqual(['chi']);
    expect(findRomaji('つ').alts).toEqual(['tsu']);
    expect(findRomaji('ふ').alts).toEqual(['fu']);
  });

  it('や row has exactly 3 entries (や/ゆ/よ)', () => {
    const yaRow = romajiList.filter(item => item.row === 'や');
    expect(yaRow.map(item => item.h)).toEqual(['や', 'ゆ', 'よ']);
  });

  it('わ row has exactly 5 entries (わ/うぃ/うぇ/を/ん)', () => {
    const waRow = romajiList.filter(item => item.row === 'わ');
    expect(waRow.map(item => item.h)).toEqual(['わ', 'うぃ', 'うぇ', 'を', 'ん']);
  });
});

describe('rows', () => {
  it('has 10 row labels (あ行〜わ行)', () => {
    expect(rows).toEqual(['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ']);
  });

  it('every row label appears in romajiList', () => {
    for (const row of rows) {
      const entries = romajiList.filter(item => item.row === row);
      expect(entries.length).toBeGreaterThan(0);
    }
  });
});
