import { describe, it, expect } from 'vitest';
import { romajiList, rows, STEPS } from '../../src/data/romaji.js';

// データ構成 (2026-05-22 拡張):
//   step 'seion': 48 (清音46 + 互換 うぃ/うぇ)
//   step 'dakuon': 23 (が/ざ/だ/ば/ぱ 行、ぢ・づ 除外)
//   step 'youon': 33 (拗音 11 行 × 3、ぢゃ系 除外)
//   total: 104
const EXPECTED_TOTAL = 104;
const EXPECTED_SEION = 48;
const EXPECTED_DAKUON = 23;
const EXPECTED_YOUON = 33;

describe('romajiList', () => {
  it(`contains exactly ${EXPECTED_TOTAL} entries (seion ${EXPECTED_SEION} + dakuon ${EXPECTED_DAKUON} + youon ${EXPECTED_YOUON})`, () => {
    expect(romajiList).toHaveLength(EXPECTED_TOTAL);
  });

  it('has unique hiragana keys', () => {
    const hiraganaSet = new Set(romajiList.map(item => item.h));
    expect(hiraganaSet.size).toBe(romajiList.length);
  });

  it('has unique romaji values', () => {
    const romajiSet = new Set(romajiList.map(item => item.r));
    expect(romajiSet.size).toBe(romajiList.length);
  });

  it('each entry has h, r, row, step string fields', () => {
    for (const item of romajiList) {
      expect(typeof item.h).toBe('string');
      expect(typeof item.r).toBe('string');
      expect(typeof item.row).toBe('string');
      expect(typeof item.step).toBe('string');
    }
  });

  it('every step value is one of the STEPS constants', () => {
    const valid = new Set(Object.values(STEPS));
    for (const item of romajiList) {
      expect(valid.has(item.step)).toBe(true);
    }
  });

  it('counts entries per step correctly', () => {
    const counts = romajiList.reduce((acc, it) => {
      acc[it.step] = (acc[it.step] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts.seion).toBe(EXPECTED_SEION);
    expect(counts.dakuon).toBe(EXPECTED_DAKUON);
    expect(counts.youon).toBe(EXPECTED_YOUON);
  });

  it('includes representative kana for every seion row (snapshot of expected entries)', () => {
    // 主表記 r は訓令式優先（タイピング効率）。ヘボン式は alts に格納。
    const expected = [
      { h: 'あ', r: 'a', row: 'あ', step: 'seion' },
      { h: 'か', r: 'ka', row: 'か', step: 'seion' },
      { h: 'さ', r: 'sa', row: 'さ', step: 'seion' },
      { h: 'し', r: 'si', alts: ['shi'], row: 'さ', step: 'seion' },
      { h: 'た', r: 'ta', row: 'た', step: 'seion' },
      { h: 'ち', r: 'ti', alts: ['chi'], row: 'た', step: 'seion' },
      { h: 'つ', r: 'tu', alts: ['tsu'], row: 'た', step: 'seion' },
      { h: 'な', r: 'na', row: 'な', step: 'seion' },
      { h: 'は', r: 'ha', row: 'は', step: 'seion' },
      { h: 'ふ', r: 'hu', alts: ['fu'], row: 'は', step: 'seion' },
      { h: 'ま', r: 'ma', row: 'ま', step: 'seion' },
      { h: 'や', r: 'ya', row: 'や', step: 'seion' },
      { h: 'ら', r: 'ra', row: 'ら', step: 'seion' },
      { h: 'わ', r: 'wa', row: 'わ', step: 'seion' },
      { h: 'うぃ', r: 'wi', row: 'わ', step: 'seion' },
      { h: 'うぇ', r: 'we', row: 'わ', step: 'seion' },
      { h: 'を', r: 'wo', row: 'わ', step: 'seion' },
      { h: 'ん', r: 'nn', row: 'わ', step: 'seion' },
    ];
    for (const e of expected) {
      expect(romajiList).toContainEqual(e);
    }
  });

  it('alts contain hepburn variants for the four divergent seion kana', () => {
    const findRomaji = (h) => romajiList.find((it) => it.h === h);
    expect(findRomaji('し').alts).toEqual(['shi']);
    expect(findRomaji('ち').alts).toEqual(['chi']);
    expect(findRomaji('つ').alts).toEqual(['tsu']);
    expect(findRomaji('ふ').alts).toEqual(['fu']);
  });

  it('や row has exactly 3 entries (や/ゆ/よ)', () => {
    const yaRow = romajiList.filter(item => item.row === 'や' && item.step === 'seion');
    expect(yaRow.map(item => item.h)).toEqual(['や', 'ゆ', 'よ']);
  });

  it('わ row has exactly 5 entries (わ/うぃ/うぇ/を/ん)', () => {
    const waRow = romajiList.filter(item => item.row === 'わ' && item.step === 'seion');
    expect(waRow.map(item => item.h)).toEqual(['わ', 'うぃ', 'うぇ', 'を', 'ん']);
  });

  // ---- dakuon 検証 ----
  it('dakuon includes ga/za/ba/pa rows with 5 entries each and da row with 3 entries', () => {
    const rowCount = (label) =>
      romajiList.filter((it) => it.step === 'dakuon' && it.row === label).length;
    expect(rowCount('が')).toBe(5);
    expect(rowCount('ざ')).toBe(5);
    expect(rowCount('だ')).toBe(3);
    expect(rowCount('ば')).toBe(5);
    expect(rowCount('ぱ')).toBe(5);
  });

  it('dakuon excludes ぢ and づ (owner decision)', () => {
    expect(romajiList.find((it) => it.h === 'ぢ')).toBeUndefined();
    expect(romajiList.find((it) => it.h === 'づ')).toBeUndefined();
  });

  it('じ has zi as r and ji as alt', () => {
    const ji = romajiList.find((it) => it.h === 'じ');
    expect(ji).toBeDefined();
    expect(ji.r).toBe('zi');
    expect(ji.alts).toEqual(['ji']);
  });

  // ---- youon 検証 ----
  it('youon has 11 rows × 3 entries = 33 total', () => {
    const youon = romajiList.filter((it) => it.step === 'youon');
    expect(youon).toHaveLength(33);
    const rowsSet = new Set(youon.map((it) => it.row));
    expect(rowsSet.size).toBe(11);
  });

  it('youon excludes ぢゃ/ぢゅ/ぢょ (owner decision)', () => {
    expect(romajiList.find((it) => it.h === 'ぢゃ')).toBeUndefined();
    expect(romajiList.find((it) => it.h === 'ぢゅ')).toBeUndefined();
    expect(romajiList.find((it) => it.h === 'ぢょ')).toBeUndefined();
  });

  it('youon includes kunrei main + hepburn alts for sya/tya/zya families', () => {
    const find = (h) => romajiList.find((it) => it.h === h);
    expect(find('しゃ')).toMatchObject({ r: 'sya', alts: ['sha'] });
    expect(find('しゅ')).toMatchObject({ r: 'syu', alts: ['shu'] });
    expect(find('しょ')).toMatchObject({ r: 'syo', alts: ['sho'] });
    expect(find('ちゃ')).toMatchObject({ r: 'tya', alts: ['cha'] });
    expect(find('ちゅ')).toMatchObject({ r: 'tyu', alts: ['chu'] });
    expect(find('ちょ')).toMatchObject({ r: 'tyo', alts: ['cho'] });
    expect(find('じゃ')).toMatchObject({ r: 'zya', alts: ['ja'] });
    expect(find('じゅ')).toMatchObject({ r: 'zyu', alts: ['ju'] });
    expect(find('じょ')).toMatchObject({ r: 'zyo', alts: ['jo'] });
  });
});

describe('STEPS', () => {
  it('exposes seion / dakuon / youon identifiers', () => {
    expect(STEPS.seion).toBe('seion');
    expect(STEPS.dakuon).toBe('dakuon');
    expect(STEPS.youon).toBe('youon');
    expect(Object.keys(STEPS)).toHaveLength(3);
  });
});

describe('rows', () => {
  it('starts with the 10 seion row labels', () => {
    expect(rows.slice(0, 10)).toEqual(['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ']);
  });

  it('appends dakuon and youon row labels', () => {
    expect(rows).toContain('が');
    expect(rows).toContain('ざ');
    expect(rows).toContain('だ');
    expect(rows).toContain('ば');
    expect(rows).toContain('ぱ');
    expect(rows).toContain('きゃ');
    expect(rows).toContain('しゃ');
    expect(rows).toContain('ちゃ');
    expect(rows).toContain('にゃ');
    expect(rows).toContain('ひゃ');
    expect(rows).toContain('みゃ');
    expect(rows).toContain('りゃ');
    expect(rows).toContain('ぎゃ');
    expect(rows).toContain('じゃ');
    expect(rows).toContain('びゃ');
    expect(rows).toContain('ぴゃ');
  });

  it('every row label appears in romajiList', () => {
    for (const row of rows) {
      const entries = romajiList.filter(item => item.row === row);
      expect(entries.length).toBeGreaterThan(0);
    }
  });
});
