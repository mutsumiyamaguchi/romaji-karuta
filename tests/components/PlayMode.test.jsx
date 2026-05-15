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
  ...overrides,
});

describe('<Play /> mode rendering', () => {
  describe('mode = h2r', () => {
    it('shows hiragana as the prompt and lowercase romaji on choices', () => {
      render(<Play {...baseProps({ mode: 'h2r' })} />);
      // 問題: ひらがな（ボタンには 'か' は無いので一意に取れる）
      expect(screen.getByText('か')).toBeInTheDocument();
      // 札: 小文字ローマ字
      expect(screen.getByRole('button', { name: 'ka' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'sa' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ta' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'na' })).toBeInTheDocument();
    });
  });

  describe('mode = r2h', () => {
    it('shows lowercase romaji as the prompt and hiragana on choices', () => {
      render(<Play {...baseProps({ mode: 'r2h' })} />);
      // 問題: ローマ字（小文字）— ボタンには 'ka' は無いので一意に取れる
      expect(screen.getByText('ka')).toBeInTheDocument();
      // 札: ひらがな
      expect(screen.getByRole('button', { name: 'か' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'さ' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'た' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'な' })).toBeInTheDocument();
    });
  });

  describe('mode = H2R', () => {
    it('shows hiragana as the prompt and uppercase romaji on choices', () => {
      render(<Play {...baseProps({ mode: 'H2R' })} />);
      // 問題: ひらがな
      expect(screen.getByText('か')).toBeInTheDocument();
      // 札: 大文字ローマ字
      expect(screen.getByRole('button', { name: 'KA' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SA' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'TA' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'NA' })).toBeInTheDocument();
    });
  });

  describe('correctness regardless of mode', () => {
    it('treats r-equality as the correctness check in h2r', async () => {
      const onCorrect = vi.fn();
      const onIncorrect = vi.fn();
      const user = userEvent.setup();
      render(<Play {...baseProps({ mode: 'h2r', onCorrect, onIncorrect })} />);

      await user.click(screen.getByRole('button', { name: 'ka' }));
      expect(onCorrect).toHaveBeenCalledOnce();
      expect(onIncorrect).not.toHaveBeenCalled();
    });

    it('treats r-equality as the correctness check in r2h', async () => {
      const onCorrect = vi.fn();
      const onIncorrect = vi.fn();
      const user = userEvent.setup();
      render(<Play {...baseProps({ mode: 'r2h', onCorrect, onIncorrect })} />);

      // r2h では札はひらがな表示。正解札の表示は「か」
      await user.click(screen.getByRole('button', { name: 'か' }));
      expect(onCorrect).toHaveBeenCalledOnce();
      expect(onIncorrect).not.toHaveBeenCalled();
    });

    it('treats r-equality as the correctness check in H2R', async () => {
      const onCorrect = vi.fn();
      const onIncorrect = vi.fn();
      const user = userEvent.setup();
      render(<Play {...baseProps({ mode: 'H2R', onCorrect, onIncorrect })} />);

      await user.click(screen.getByRole('button', { name: 'KA' }));
      expect(onCorrect).toHaveBeenCalledOnce();
      expect(onIncorrect).not.toHaveBeenCalled();
    });

    it('marks a wrong choice incorrect in r2h (clicking さ when answer is か)', async () => {
      const onCorrect = vi.fn();
      const onIncorrect = vi.fn();
      const user = userEvent.setup();
      render(<Play {...baseProps({ mode: 'r2h', onCorrect, onIncorrect })} />);

      await user.click(screen.getByRole('button', { name: 'さ' }));
      expect(onIncorrect).toHaveBeenCalledOnce();
      expect(onCorrect).not.toHaveBeenCalled();
    });
  });
});
