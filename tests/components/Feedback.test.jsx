import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Feedback from '../../src/components/Feedback.jsx';

describe('<Feedback />', () => {
  it('renders nothing when feedback is null', () => {
    const { container } = render(<Feedback feedback={null} correctRomaji="ka" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows せいかい！ when feedback is "correct"', () => {
    render(<Feedback feedback="correct" correctRomaji="ka" />);
    expect(screen.getByText('せいかい！')).toBeInTheDocument();
    expect(screen.queryByText('ざんねん！')).not.toBeInTheDocument();
  });

  it('shows ざんねん！ without revealing the correct answer when feedback is "incorrect"', () => {
    render(<Feedback feedback="incorrect" correctRomaji="shi" />);
    expect(screen.getByText('ざんねん！')).toBeInTheDocument();
    expect(screen.queryByText('shi')).not.toBeInTheDocument();
    expect(screen.queryByText('せいかいは')).not.toBeInTheDocument();
  });
});
