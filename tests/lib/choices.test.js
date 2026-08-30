import { describe, expect, it } from 'vitest';
import { romajiList } from '../../src/data/romaji.js';
import { generateChoices, getFinalVowel } from '../../src/lib/choices.js';

const findByRomaji = (romaji) => romajiList.find((item) => item.r === romaji);

describe('generateChoices', () => {
  it.each([
    ['a', 'ka'],
    ['i', 'ki'],
    ['u', 'ku'],
    ['e', 'ke'],
    ['o', 'ko'],
  ])('正解の母音が%sなら4枚すべてを同じ母音に揃える', (vowel, romaji) => {
    const correctItem = findByRomaji(romaji);
    const choices = generateChoices(correctItem);

    expect(choices).toHaveLength(4);
    expect(choices.map(getFinalVowel)).toEqual([vowel, vowel, vowel, vowel]);
  });

  it('拗音でも4枚すべてを同じ母音に揃える', () => {
    const choices = generateChoices(findByRomaji('kya'));

    expect(choices).toHaveLength(4);
    expect(choices.every((item) => getFinalVowel(item) === 'a')).toBe(true);
    expect(choices.every((item) => item.step === 'youon')).toBe(true);
  });

  it('母音のない「ん」でも重複のない4択を作る', () => {
    const choices = generateChoices(findByRomaji('nn'));

    expect(choices).toHaveLength(4);
    expect(new Set(choices.map((item) => item.r)).size).toBe(4);
    expect(choices.every((item) => item.step === 'seion')).toBe(true);
  });

  it.each([
    ['ka', 'seion'],
    ['ga', 'dakuon'],
    ['kya', 'youon'],
  ])('正解%sの4枚を同じstep (%s) に限定する', (romaji, step) => {
    const choices = generateChoices(findByRomaji(romaji));
    expect(choices).toHaveLength(4);
    expect(choices.every((item) => item.step === step)).toBe(true);
  });

  it('正解を必ず1件だけ含める', () => {
    const choices = generateChoices(findByRomaji('si'));

    expect(choices.filter((item) => item.r === 'si')).toHaveLength(1);
  });

  it('同母音候補が不足しても同じstep内だけから重複なしで補う', () => {
    const items = [
      { h: 'か', r: 'ka', step: 'seion' },
      { h: 'さ', r: 'sa', step: 'seion' },
      { h: 'き', r: 'ki', step: 'seion' },
      { h: 'く', r: 'ku', step: 'seion' },
      { h: 'だ', r: 'da', step: 'dakuon' },
    ];
    const choices = generateChoices(items[0], items);

    expect(choices).toHaveLength(4);
    expect(new Set(choices.map((item) => item.r)).size).toBe(4);
    expect(choices.map((item) => item.r)).toEqual(expect.arrayContaining(['ka', 'sa', 'ki', 'ku']));
    expect(choices.every((item) => item.step === 'seion')).toBe(true);
  });

  it('同じstep内に4択分の文字がなければ別stepへfallbackしない', () => {
    const items = [
      { h: 'か', r: 'ka', step: 'seion' },
      { h: 'さ', r: 'sa', step: 'seion' },
      { h: 'だ', r: 'da', step: 'dakuon' },
      { h: 'ば', r: 'ba', step: 'dakuon' },
    ];
    expect(() => generateChoices(items[0], items)).toThrow('not enough choices in step');
  });

  it('本番カリキュラムの全文字で同じstepの重複しない4択を生成できる', () => {
    for (const item of romajiList) {
      const choices = generateChoices(item);
      expect(choices, item.h).toHaveLength(4);
      expect(new Set(choices.map((choice) => choice.r)).size, item.h).toBe(4);
      expect(choices.every((choice) => choice.step === item.step), item.h).toBe(true);
    }
  });
});
