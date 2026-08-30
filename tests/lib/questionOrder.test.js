import { afterEach, describe, expect, it, vi } from 'vitest';
import { orderRetryQuestions, orderRowQuestions } from '../../src/lib/questionOrder.js';

const questions = [
  { h: 'あ', r: 'a', row: 'あ' },
  { h: 'い', r: 'i', row: 'あ' },
  { h: 'う', r: 'u', row: 'あ' },
  { h: 'か', r: 'ka', row: 'か' },
];

afterEach(() => vi.restoreAllMocks());

describe('question ordering', () => {
  it('shuffles a row without mutating the curriculum order', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const snapshot = [...questions];
    const ordered = orderRowQuestions(questions, 'あ');

    expect(ordered.map((item) => item.r)).toEqual(['i', 'u', 'a']);
    expect(questions).toEqual(snapshot);
    expect(ordered).toEqual(expect.arrayContaining(questions.slice(0, 3)));
  });

  it('reshuffles wrong answers for retry without changing the input', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const mistakes = questions.slice(0, 3);
    const ordered = orderRetryQuestions(mistakes);

    expect(ordered.map((item) => item.r)).toEqual(['i', 'u', 'a']);
    expect(mistakes.map((item) => item.r)).toEqual(['a', 'i', 'u']);
  });

  it('keeps a single-character unit usable', () => {
    expect(orderRetryQuestions([questions[0]])).toEqual([questions[0]]);
  });
});
