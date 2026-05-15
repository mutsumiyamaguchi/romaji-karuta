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
  ...overrides,
});

describe('<Play />', () => {
  it('displays the current question hiragana (currentQ.h)', () => {
    render(<Play {...baseProps()} />);
    expect(screen.getByText('か')).toBeInTheDocument();
  });

  it('renders exactly 4 choice buttons (one per choices entry)', () => {
    render(<Play {...baseProps()} />);
    // 札ボタンは選択肢 r で識別
    expect(screen.getByRole('button', { name: 'ka' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'sa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'na' })).toBeInTheDocument();
  });

  it('shows the progress indicator (n / total もんめ)', () => {
    render(<Play {...baseProps({ currentQuestionIndex: 0 })} />);
    expect(screen.getByText('1 / 2 もんめ')).toBeInTheDocument();
  });

  it('shows the points badge', () => {
    render(<Play {...baseProps({ points: 250 })} />);
    expect(screen.getByText('250 ぽいんと')).toBeInTheDocument();
  });

  it('calls onCorrect when the correct choice is clicked', async () => {
    const onCorrect = vi.fn();
    const onIncorrect = vi.fn();
    const user = userEvent.setup();
    render(<Play {...baseProps({ onCorrect, onIncorrect })} />);

    await user.click(screen.getByRole('button', { name: 'ka' }));
    expect(onCorrect).toHaveBeenCalledOnce();
    expect(onIncorrect).not.toHaveBeenCalled();
  });

  it('calls onIncorrect when a wrong choice is clicked', async () => {
    const onCorrect = vi.fn();
    const onIncorrect = vi.fn();
    const user = userEvent.setup();
    render(<Play {...baseProps({ onCorrect, onIncorrect })} />);

    await user.click(screen.getByRole('button', { name: 'sa' }));
    expect(onIncorrect).toHaveBeenCalledOnce();
    expect(onCorrect).not.toHaveBeenCalled();
  });

  it('ignores clicks while isAnimating is true', async () => {
    const onCorrect = vi.fn();
    const onIncorrect = vi.fn();
    const user = userEvent.setup();
    render(<Play {...baseProps({ onCorrect, onIncorrect, isAnimating: true })} />);

    await user.click(screen.getByRole('button', { name: 'ka' }));
    await user.click(screen.getByRole('button', { name: 'sa' }));
    expect(onCorrect).not.toHaveBeenCalled();
    expect(onIncorrect).not.toHaveBeenCalled();
  });

  it('calls onBack when the もどる button is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<Play {...baseProps({ onBack })} />);

    await user.click(screen.getByRole('button', { name: /もどる/ }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('renders the Feedback overlay when feedback is set', () => {
    render(<Play {...baseProps({ feedback: 'correct' })} />);
    expect(screen.getByText('せいかい！')).toBeInTheDocument();
  });

  it('does not render Feedback when feedback is null', () => {
    render(<Play {...baseProps({ feedback: null })} />);
    expect(screen.queryByText('せいかい！')).not.toBeInTheDocument();
    expect(screen.queryByText('ざんねん！')).not.toBeInTheDocument();
  });
});
