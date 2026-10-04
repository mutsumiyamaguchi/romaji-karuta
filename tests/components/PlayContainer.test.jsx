import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayContainer from '../../src/components/PlayContainer.jsx';
import { romajiList } from '../../src/data/romaji.js';

const question = romajiList.find((item) => item.r === 'ka');

describe('<PlayContainer /> onAnswer', () => {
  it('reports each answer with the tapped card and never reveals the correct answer', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<PlayContainer initialQuestions={[question]} points={0} onAnswer={onAnswer} onFinished={() => {}} />);
    const wrong = screen.getAllByRole('button').find((button) => /^[A-Z]+$/.test(button.textContent) && button.textContent !== 'KA');
    await user.click(wrong);
    expect(onAnswer).toHaveBeenCalledOnce();
    const [answered, choice, isCorrect] = onAnswer.mock.calls[0];
    expect(answered.r).toBe('ka');
    expect(choice.r).not.toBe('ka');
    expect(choice.step).toBe('seion');
    expect(isCorrect).toBe(false);
    expect(screen.getByText('ざんねん！')).toBeInTheDocument();
    expect(screen.queryByText('せいかいは')).not.toBeInTheDocument();
  });

  it('reports a correct answer', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<PlayContainer initialQuestions={[question]} points={0} onAnswer={onAnswer} onFinished={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'KA' }));
    expect(onAnswer.mock.calls[0][2]).toBe(true);
    expect(onAnswer.mock.calls[0][1].r).toBe('ka');
  });
});
