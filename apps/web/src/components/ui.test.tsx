import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, ErrorState, Field, Input, ProgressBar } from './ui';

/**
 * Component tests query the page the way a user (or screen reader) would - by label text and
 * role - not by CSS classes. If these pass, the accessibility wiring is real.
 */
describe('Field', () => {
  it('connects the label, hint and error to the input', () => {
    render(
      <Field label="Phone" hint="10 digits" error="Enter a valid number">
        {(a) => <Input {...a} />}
      </Field>,
    );
    const input = screen.getByLabelText('Phone');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid number');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid number');
  });

  it('shows the hint when there is no error', () => {
    render(
      <Field label="Phone" hint="10 digits">
        {(a) => <Input {...a} />}
      </Field>,
    );
    expect(screen.getByLabelText('Phone')).toHaveAccessibleDescription('10 digits');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ProgressBar', () => {
  it('exposes its value to assistive technology and caps at 100%', () => {
    render(<ProgressBar value={150} max={100} label="Occupancy" />);
    const bar = screen.getByRole('progressbar', { name: 'Occupancy' });
    expect(bar).toHaveAttribute('aria-valuenow', '150');
    expect(bar.firstElementChild).toHaveStyle({ width: '100%' });
  });
});

describe('Button', () => {
  it('is disabled and busy while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('ErrorState', () => {
  it('shows the message and a retry button', async () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new Error('Network down')} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network down');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
