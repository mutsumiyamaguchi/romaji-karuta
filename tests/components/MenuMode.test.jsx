import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Menu from '../../src/components/Menu.jsx';
import { MODE_LABELS } from '../../src/lib/mode.js';

// MODE_LABELS は記号（→/ABC）を含むため、テキストからボタン要素を取得する。
const getModeTab = (modeId) =>
  screen.getByText(MODE_LABELS[modeId]).closest('button');

describe('<Menu /> mode selector', () => {
  it('renders all three mode tabs', () => {
    render(<Menu points={0} onStart={() => {}} />);
    expect(getModeTab('h2r')).toBeInTheDocument();
    expect(getModeTab('r2h')).toBeInTheDocument();
    expect(getModeTab('H2R')).toBeInTheDocument();
  });

  it('highlights h2r by default (aria-pressed=true)', () => {
    render(<Menu points={0} onStart={() => {}} />);
    expect(getModeTab('h2r')).toHaveAttribute('aria-pressed', 'true');
    expect(getModeTab('r2h')).toHaveAttribute('aria-pressed', 'false');
    expect(getModeTab('H2R')).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches highlight when a different tab is clicked', async () => {
    const user = userEvent.setup();
    render(<Menu points={0} onStart={() => {}} />);

    await user.click(getModeTab('r2h'));
    expect(getModeTab('r2h')).toHaveAttribute('aria-pressed', 'true');
    expect(getModeTab('h2r')).toHaveAttribute('aria-pressed', 'false');
    expect(getModeTab('H2R')).toHaveAttribute('aria-pressed', 'false');
  });

  it('passes the currently selected mode to onStart when a row button is clicked', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<Menu points={0} onStart={onStart} />);

    // 初期 mode は h2r
    await user.click(screen.getByRole('button', { name: 'あ ぎょう' }));
    expect(onStart).toHaveBeenLastCalledWith('あ', 'h2r');

    // r2h に切り替えてから「あ ぎょう」を再度クリック
    await user.click(getModeTab('r2h'));
    await user.click(screen.getByRole('button', { name: 'あ ぎょう' }));
    expect(onStart).toHaveBeenLastCalledWith('あ', 'r2h');
  });

  it('passes the selected mode for the ぜんぶ まぜまぜ button as well', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<Menu points={0} onStart={onStart} />);

    await user.click(getModeTab('H2R'));
    await user.click(screen.getByText('ぜんぶ まぜまぜ'));
    expect(onStart).toHaveBeenLastCalledWith('random', 'H2R');
  });
});
