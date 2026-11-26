import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, InputAdornment, TextField } from '@mui/material';
import { AmountReadout, CashAmountPad } from '../../../pos/modals/CashAmountPad';
import { money } from '../../../pos/logic/cart';
import CreditCard from '@mui/icons-material/CreditCard';

const meta = {
  title: 'Design System/Components/Forms/Input Payment',
  id: 'components-forms-input-payment',
  parameters: { layout: 'centered' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const InputPayment: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: 320 }}>
      <TextField
        label="Card number"
        placeholder="1234 5678 9012 3456"
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <CreditCard />
              </InputAdornment>
            ),
          },
        }}
      />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField label="Expiry" placeholder="MM/YY" fullWidth />
        <TextField label="CVC" placeholder="123" fullWidth />
      </Box>
    </Box>
  ),
};

/**
 * How Birdie takes a payment amount: the cents keypad. `CashAmountPad` and `AmountReadout`
 * (`src/pos/modals/CashAmountPad.tsx`) — keying 2, 0, 0, 0, 0 reads $200.00. A card number is never
 * typed into Birdie; the card goes on the reader.
 */
function InBirdieCashPad() {
  const [cents, setCents] = useState('');
  return (
    <Box sx={{ width: 280, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <AmountReadout label="Cash counted" value={money(cents ? parseInt(cents, 10) / 100 : 0)} sub="$350.00 expected in the drawer" />
      <CashAmountPad cents={cents} onChange={setCents} />
    </Box>
  );
}

/** The terminal's cash pad and its readout, as the drawer dialogs use them. */
export const InBirdie: Story = {
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        story:
          'What the product renders: `AmountReadout` over `CashAmountPad`, the cents keypad the drawer dialogs share (open shift, cash drop, close shift, cash payout). Type on the keys; Clear empties it.',
      },
    },
  },
  render: () => <InBirdieCashPad />,
};
