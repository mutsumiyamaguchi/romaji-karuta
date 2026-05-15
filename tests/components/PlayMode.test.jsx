import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Play from '../../src/components/Play.jsx';

const makeChoices = () => [
  { h: 'か', r: 'ka', row: 'か', rotation: 0 },
  { h: 'さ', r: 'sa', row: 'さ', rotation: 1 },
  { h: 'た', r: 'ta', row: 'た', rotation: -2 },
  { h: 'な', r: 'na', row: 'な', rotation: 3 },
];

const baseProps = (overrides = {}) => ({
  currentQ: { h: 'か', r: 'ka', row: 'か' },
  currentQuestionIndex: 0,
  questions: [{ h: 'か', r: 'ka', row: 'か' }, { h: 'き', r: 'ki', row: 'か' }],
  choices: makeChoices(),
  points: 100,
  feedback: null,
  isAnimating: false,
  onCorrect: vi.fn(),
  onIncorrect: vi.fn(),
  onBack: vi.fn(),
  mode: 'h2r',
  letterCase: 'upper',
  ...overrides,
});

describe('<Play /> mode rendering', () => {
  describe('mode = h2r, letterCase = upper (default)', () => {
    it('shows hiragana as the prompt and uppercase romaji on choices', () => {
      render(<Play {...baseProps({ mode: 'h2r', letterCase: 'upper' })} />);
      // 問題: ひらがな
      expect(screen.getByText('か')).toBeInTheDocument();
      // 札: 大文字ローマ字
      expect(screen.getByRole('button', { name: 'KA' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SA' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'TA' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'NA' })).toBeInTheDocument();
    });
  });

  describe('mode = h2r, letterCase = lower', () => {
    it('shows hiragana as the prompt and lowercase romaji on choices', () => {
      render(<Play {...baseProps({ mode: 'h2r', letterCase: 'lower' })} />);
      expect(screen.getByText('か')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ka' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'sa' })).toBeInTheDocument();
    });
  });

  describe('mode = r2h, letterCase = upper', () => {
    it('shows uppercase romaji as the prompt and hiragana on choices', () => {
      render(<Play {...baseProps({ mode: 'r2h', letterCase: 'upper' })} />);
      expect(screen.getByText('KA')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'か' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'さ' })).toBeInTheDocument();
    });
  });

  describe('mode = r2h, letterCase = lower', () => {
    it('shows lowercase romaji as the prompt and hiragana on choices', () => {
      render(<Play {...baseProps({ mode: 'r2h', letterCase: 'lower' })} />);
      expect(screen.getByText('ka')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'か' })).toBeInTheDocument();
    });
  });

  describe('correctness regardless of mode / letterCase', () => {
    it('treats r-equality as the correctness check in h2r/upper', async () => {
      const onCorrect = vi.fn();
      const onIncorrect = vi.fn();
      const user = userEvent.setup();
      render(
        <Play
          {...baseProps({
            mode: 'h2r',
            letterCase: 'upper',
            onCorrect,
            onIncorrect,
          })}
        />
      );

      await user.click(screen.getByRole('button', { name: 'KA' }));
      expect(onCorrect).toHaveBeenCalledOnce();
      expect(onIncorrect).not.toHaveBeenCalled();
    });

    it('treats r-equality as the correctness check in h2r/lower', async () => {
      const onCorrect = vi.fn();
      const onIncorrect = vi.fn();
      const user = userEvent.setup();
      render(
        <Play
          {...baseProps({
            mode: 'h2r',
            letterCase: 'lower',
            onCorrect,
            onIncorrect,
          })}
        />
      );

      await user.click(screen.getByRole('button', { name: 'ka' }));
      expect(onCorrect).toHaveBeenCalledOnce();
      expect(onIncorrect).not.toHaveBeenCalled();
    });

    it('treats r-equality as the correctness check in r2h', async () => {
      const onCorrect = vi.fn();
      const onIncorrect = vi.fn();
      const user = userEvent.setup();
      render(
        <Play
          {...baseProps({
            mode: 'r2h',
            letterCase: 'lower',
            onCorrect,
            onIncorrect,
          })}
        />
      );

      // r2h では札はひらがな表示。正解札の表示は「か」
      await user.click(screen.getByRole('button', { name: 'か' }));
      expect(onCorrect).toHaveBeenCalledOnce();
      expect(onIncorrect).not.toHaveBeenCalled();
    });

    it('marks a wrong choice incorrect in r2h (clicking さ when answer is か)', async () => {
      const onCorrect = vi.fn();
      const onIncorrect = vi.fn();
      const user = userEvent.setup();
      render(
        <Play
          {...baseProps({
            mode: 'r2h',
            letterCase: 'upper',
            onCorrect,
            onIncorrect,
          })}
        />
      );

      await user.click(screen.getByRole('button', { name: 'さ' }));
      expect(onIncorrect).toHaveBeenCalledOnce();
      expect(onCorrect).not.toHaveBeenCalled();
    });
  });
});
