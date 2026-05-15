import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Menu from '../../src/components/Menu.jsx';
import { rows } from '../../src/data/romaji.js';

describe('<Menu />', () => {
  it('displays the points prop in the points badge', () => {
    render(<Menu points={42} onStart={() => {}} />);
    expect(screen.getByText('42 ぽいんと')).toBeInTheDocument();
  });

  it('renders one button for every row', () => {
    render(<Menu points={0} onStart={() => {}} />);
    for (const row of rows) {
      expect(screen.getByRole('button', { name: `${row} ぎょう` })).toBeInTheDocument();
    }
  });

  it('calls onStart with "あ" when the あ ぎょう button is clicked', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<Menu points={0} onStart={onStart} />);

    await user.click(screen.getByRole('button', { name: 'あ ぎょう' }));
    // 第2引数（mode）は MenuMode.test.jsx 側で検証する
    expect(onStart).toHaveBeenCalled();
    expect(onStart.mock.calls[0][0]).toBe('あ');
  });

  it('calls onStart with "random" when the ぜんぶ まぜまぜ button is clicked', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<Menu points={0} onStart={onStart} />);

    await user.click(screen.getByText('ぜんぶ まぜまぜ'));
    expect(onStart).toHaveBeenCalled();
    expect(onStart.mock.calls[0][0]).toBe('random');
  });

  it('shows the title and prompt copy', () => {
    render(<Menu points={0} onStart={() => {}} />);
    expect(screen.getByText('ローマじ かるた')).toBeInTheDocument();
    expect(screen.getByText('れんしゅうする ぎょうを えらんでね！')).toBeInTheDocument();
  });
});
