import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Result from '../../src/components/Result.jsx';

const fakeQuestions = (n) => Array.from({ length: n }, (_, i) => ({ h: 'あ', r: 'a', row: 'あ', _i: i }));

describe('<Result />', () => {
  it('displays score, total question count, and earned points', () => {
    render(
      <Result
        score={12}
        questions={fakeQuestions(15)}
        earnedPoints={120}
        onBack={() => {}}
      />
    );
    expect(screen.getByText('15 もんちゅう')).toBeInTheDocument();
    expect(screen.getByText('12 もん せいかい！')).toBeInTheDocument();
    expect(screen.getByText('+120 ぽいんと')).toBeInTheDocument();
  });

  it('calls onBack when "メニューにもどる" button is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <Result
        score={5}
        questions={fakeQuestions(5)}
        earnedPoints={50}
        onBack={onBack}
      />
    );

    await user.click(screen.getByRole('button', { name: /メニューにもどる/ }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('shows the おわり！ heading', () => {
    render(
      <Result score={0} questions={fakeQuestions(0)} earnedPoints={0} onBack={() => {}} />
    );
    expect(screen.getByText('おわり！')).toBeInTheDocument();
  });
});
