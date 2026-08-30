import { romajiList } from '../data/romaji.js';
import { pickRomaji } from './mode.js';
import { shuffle } from './shuffle.js';

const CHOICE_COUNT = 4;
const VOWEL_PATTERN = /[aiueo]$/;

export const getFinalVowel = (item) => item?.r?.match(VOWEL_PATTERN)?.[0] ?? null;

// 正解と同じstep・母音の札を優先して4択を作る。
// 「ん」のように母音がない場合と、同母音候補が不足する場合も同じstep内だけで補う。
export const generateChoices = (correctItem, items = romajiList) => {
  const otherItems = items.filter(
    (item) => item.r !== correctItem.r && item.step === correctItem.step
  );
  const vowel = getFinalVowel(correctItem);
  const sameVowelItems = vowel
    ? otherItems.filter((item) => getFinalVowel(item) === vowel)
    : [];

  const selected = shuffle(sameVowelItems).slice(0, CHOICE_COUNT - 1);
  const selectedIds = new Set(selected.map((item) => item.r));
  const fallbackItems = otherItems.filter((item) => !selectedIds.has(item.r));
  const remainingCount = CHOICE_COUNT - 1 - selected.length;
  const wrongChoices = [
    ...selected,
    ...shuffle(fallbackItems).slice(0, remainingCount),
  ];
  if (wrongChoices.length !== CHOICE_COUNT - 1) {
    throw new Error(`not enough choices in step: ${correctItem.step ?? 'unknown'}`);
  }

  return shuffle([correctItem, ...wrongChoices]).map((item) => ({
    ...item,
    rotation: Math.floor(Math.random() * 12) - 6,
    displayR: pickRomaji(item),
  }));
};
