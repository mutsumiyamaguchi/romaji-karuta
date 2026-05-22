import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Menu from '../../src/components/Menu.jsx';
import { MODE_LABELS, LETTER_CASE_LABELS } from '../../src/lib/mode.js';

// MODE_LABELS は記号（→）を含むため、テキストからボタン要素を取得する。
const getModeTab = (modeId) =>
  screen.getByText(MODE_LABELS[modeId]).closest('button');

// アルファベットの大小トグル（'ABC' / 'abc'）
const getCaseToggle = (caseId) =>
  screen.getByText(LETTER_CASE_LABELS[caseId]).closest('button');

describe('<Menu /> mode selector', () => {
  it('renders only h2r and r2h tabs (no H2R)', () => {
    render(<Menu points={0} onStart={() => {}} />);
    expect(getModeTab('h2r')).toBeInTheDocument();
    expect(getModeTab('r2h')).toBeInTheDocument();
    expect(screen.queryByText('ABC おおもじ')).not.toBeInTheDocument();
  });

  it('highlights h2r by default (aria-pressed=true)', () => {
    render(<Menu points={0} onStart={() => {}} />);
    expect(getModeTab('h2r')).toHaveAttribute('aria-pressed', 'true');
    expect(getModeTab('r2h')).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches highlight when a different tab is clicked', async () => {
    const user = userEvent.setup();
    render(<Menu points={0} onStart={() => {}} />);

    await user.click(getModeTab('r2h'));
    expect(getModeTab('r2h')).toHaveAttribute('aria-pressed', 'true');
    expect(getModeTab('h2r')).toHaveAttribute('aria-pressed', 'false');
  });

  it('passes (target, mode, letterCase) to onStart on a row button click', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<Menu points={0} onStart={onStart} />);

    // 初期 mode は h2r / letterCase は 'upper'（デフォルト prop）
    await user.click(screen.getByRole('button', { name: 'あ ぎょう' }));
    expect(onStart).toHaveBeenLastCalledWith('あ', 'h2r', 'upper');

    // r2h に切り替えてから再クリック
    await user.click(getModeTab('r2h'));
    await user.click(screen.getByRole('button', { name: 'あ ぎょう' }));
    expect(onStart).toHaveBeenLastCalledWith('あ', 'r2h', 'upper');
  });

  it('passes the selected mode for the ステップ1 button as well', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<Menu points={0} onStart={onStart} />);

    await user.click(getModeTab('r2h'));
    await user.click(screen.getByText('せいおん').closest('button'));
    expect(onStart).toHaveBeenLastCalledWith('random-seion', 'r2h', 'upper');
  });
});

describe('<Menu /> letterCase toggle', () => {
  it('renders ABC and abc toggle buttons', () => {
    render(<Menu points={0} onStart={() => {}} />);
    expect(getCaseToggle('upper')).toBeInTheDocument();
    expect(getCaseToggle('lower')).toBeInTheDocument();
  });

  it('highlights the upper toggle by default', () => {
    render(<Menu points={0} onStart={() => {}} />);
    expect(getCaseToggle('upper')).toHaveAttribute('aria-pressed', 'true');
    expect(getCaseToggle('lower')).toHaveAttribute('aria-pressed', 'false');
  });

  it('reflects the letterCase prop in aria-pressed', () => {
    render(
      <Menu points={0} onStart={() => {}} letterCase="lower" />
    );
    expect(getCaseToggle('lower')).toHaveAttribute('aria-pressed', 'true');
    expect(getCaseToggle('upper')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onLetterCaseChange when a toggle is clicked', async () => {
    const onLetterCaseChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Menu
        points={0}
        onStart={() => {}}
        letterCase="upper"
        onLetterCaseChange={onLetterCaseChange}
      />
    );

    await user.click(getCaseToggle('lower'));
    expect(onLetterCaseChange).toHaveBeenCalledWith('lower');
  });

  it('does not call onLetterCaseChange when clicking the already-active toggle', async () => {
    const onLetterCaseChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Menu
        points={0}
        onStart={() => {}}
        letterCase="upper"
        onLetterCaseChange={onLetterCaseChange}
      />
    );

    await user.click(getCaseToggle('upper'));
    expect(onLetterCaseChange).not.toHaveBeenCalled();
  });

  it('forwards letterCase to onStart when a row is clicked', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(
      <Menu points={0} onStart={onStart} letterCase="lower" />
    );

    await user.click(screen.getByRole('button', { name: 'あ ぎょう' }));
    expect(onStart).toHaveBeenLastCalledWith('あ', 'h2r', 'lower');
  });
});
