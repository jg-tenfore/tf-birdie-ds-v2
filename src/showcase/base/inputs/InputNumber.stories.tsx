import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { CountStepper } from '../../../pos/components/restaurant/HostControls';
import { Stepper } from '../../../pos/mobile/screens/restaurant/parts';
import { mobileTheme } from '../../../theme/mobile-theme';

const meta = {
  title: 'Design System/Components/Forms/Input Number',
  id: 'components-forms-input-number',
  component: TextField,
  tags: ['autodocs'],
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InputNumber: Story = {
  render: () => (
    <TextField
      type="number"
      label="Quantity"
      defaultValue={1}
      slotProps={{ htmlInput: { min: 0, max: 99, step: 1 } }}
    />
  ),
};

/**
 * Counts as the product takes them: stepped, not typed. Tablet: `CountStepper`
 * (`src/pos/components/restaurant/HostControls.tsx`), − / count / + at 44px. Handheld: `Stepper`
 * (`src/pos/mobile/screens/restaurant/parts.tsx`), the same at 48dp.
 */
function InBirdieSteppers() {
  const [party, setParty] = useState(4);
  const [guests, setGuests] = useState(2);
  return (
    <Box sx={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Box sx={{ width: 300, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="overline">Tablet · CountStepper</Typography>
        <CountStepper label="Party" unit="guests" value={party} onChange={setParty} max={20} />
      </Box>
      <ThemeProvider theme={mobileTheme}>
        <Box sx={{ width: 328, display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Typography variant="overline">Handheld · Stepper</Typography>
          <Stepper label="Guests" value={guests} onChange={setGuests} unit={(n) => `${n} guest${n === 1 ? '' : 's'}`} />
        </Box>
      </ThemeProvider>
    </Box>
  );
}

/** Birdie's steppers: the tablet's `CountStepper` and the handheld's `Stepper`. */
export const InBirdie: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "What the product renders for a count: the tablet's `CountStepper` (44px, the reservation and new-tab dialogs) and the handheld's `Stepper` (48dp, new tab and the dish screen). Both stop at their minimum and maximum.",
      },
    },
  },
  render: () => <InBirdieSteppers />,
};
