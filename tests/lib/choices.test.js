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
  });

  it('母音のない「ん」でも重複のない4択を作る', () => {
    const choices = generateChoices(findByRomaji('nn'));

    expect(choices).toHaveLength(4);
    expect(new Set(choices.map((item) => item.r)).size).toBe(4);
  });

  it('正解を必ず1件だけ含める', () => {
    const choices = generateChoices(findByRomaji('si'));

    expect(choices.filter((item) => item.r === 'si')).toHaveLength(1);
  });

  it('同母音候補が不足すると全体から重複なしで補う', () => {
    const items = [
      { h: 'か', r: 'ka' },
      { h: 'さ', r: 'sa' },
      { h: 'き', r: 'ki' },
      { h: 'く', r: 'ku' },
    ];
    const choices = generateChoices(items[0], items);

    expect(choices).toHaveLength(4);
    expect(new Set(choices.map((item) => item.r)).size).toBe(4);
    expect(choices.map((item) => item.r)).toEqual(expect.arrayContaining(['ka', 'sa', 'ki', 'ku']));
  });
});
