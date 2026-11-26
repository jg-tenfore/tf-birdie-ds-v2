import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Box,
  Button,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { md3 } from '../../theme/tokens';
import { Stack } from '../../pos/components/Stack';
import { RoundRail } from '../../pos/components/BookingTabs';
import { RoundStatusChip } from '../../pos/components/SeatChips';
import { ROUND_STEP } from '../../pos/data/config';

// The New tee time dialog's three steps (src/pos/modals/Booking.tsx): each answer narrows the next.
const STEPS = ['Type', 'Rate', 'Details'];

const meta = {
  title: 'Design System/Components/Navigation/Stepper',
  id: 'components-navigation-stepper',
  component: Stepper,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'MUI `Stepper` — progress through a short numbered sequence, built from `Step` and `StepLabel`, driven by an ' +
          '`activeStep` index. Birdie doesn’t import it: its one stepper is drawn in the New tee time dialog (Type → Rate → ' +
          'Details), and the five-stop round rail it once had on every player became a status chip. See **In Birdie: the rail ' +
          'and the chip that replaced it**.',
      },
    },
  },
} satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A horizontal Stepper driven by Back / Next controls. */
function PlaygroundDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const last = STEPS.length - 1;
  return (
    <Box sx={{ width: 560 }}>
      <Stepper activeStep={activeStep}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={() => setActiveStep((s) => Math.min(s + 1, last))}
          disabled={activeStep === last}
        >
          {activeStep === last ? 'Create booking' : 'Next'}
        </Button>
      </Box>
    </Box>
  );
}

export const Playground: Story = {
  render: () => <PlaygroundDemo />,
};

/** A vertical Stepper with per-step content and inline controls. */
function VerticalDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const last = STEPS.length - 1;
  return (
    <Box sx={{ width: 400 }}>
      <Stepper activeStep={activeStep} orientation="vertical">
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                The “{label}” step of a new tee time.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep((s) => s - 1)}
                >
                  Back
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setActiveStep((s) => Math.min(s + 1, last))}
                >
                  {activeStep === last ? 'Create booking' : 'Continue'}
                </Button>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}

export const Vertical: Story = {
  render: () => <VerticalDemo />,
  parameters: {
    docs: { description: { story: 'A vertical Stepper with `StepContent` beneath each label.' } },
  },
};

/** A horizontal Stepper with `alternativeLabel`, which centers labels below the connector. */
export const AlternativeLabel: Story = {
  render: () => (
    <Stepper activeStep={2} alternativeLabel sx={{ width: 560 }}>
      {STEPS.map((label) => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  ),
  parameters: {
    docs: { description: { story: 'The `alternativeLabel` layout stacks each label under its step icon.' } },
  },
};

/** The retired rail and the chip that replaced it, driving one shared step. */
function RailAndChip() {
  const [step, setStep] = useState<number>(ROUND_STEP.checkedIn);
  const player = { paid: true, step, noShow: false };
  return (
    <Stack direction="row" gap={4} alignItems="flex-start" sx={{ width: 760 }}>
      <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: '#fff', boxShadow: `inset 0 0 0 1.5px ${md3.outlineVariant}` }}>
        <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: md3.onSurfaceVariant }}>
          Before · the round rail
        </Typography>
        <RoundRail state={player} onStep={setStep} />
      </Box>
      <Box sx={{ flex: 1, p: 2, minHeight: 280, borderRadius: 2, bgcolor: '#fff', boxShadow: `inset 0 0 0 1.5px ${md3.outlineVariant}` }}>
        <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: md3.onSurfaceVariant, mb: 1.25 }}>
          After · the status chip (V1 → V2)
        </Typography>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Foster, A.</Typography>
          <RoundStatusChip step={step} label="Foster, A." onStep={setStep} />
        </Stack>
      </Box>
    </Stack>
  );
}

/**
 * **In Birdie: the rail and the chip that replaced it.** Birdie's own components, side by side and sharing one value:
 * `RoundRail` (`src/pos/components/BookingTabs.tsx`), the five-stop rail that ended every player card, and
 * `RoundStatusChip` (`src/pos/components/SeatChips.tsx`), the one chip that took its place on the name line in V1 → V2
 * (Oct 1 proposal 2, approved Oct 2). A player's round is a status that can be corrected or skipped ahead, not a
 * sequence to walk, so it became a chip that opens a menu. Change either and the other follows.
 */
export const InBirdieRailAndChip: Story = {
  name: 'In Birdie: the rail and the chip that replaced it',
  parameters: { layout: 'padded' },
  render: () => <RailAndChip />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chip = canvas.getByRole('button', { name: 'Foster, A.: Checked In. Change' });
    await userEvent.click(chip);
    await userEvent.click(await canvas.findByRole('menuitem', { name: /Teed Off/ }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Foster, A.: Teed Off. Change' })).toBeTruthy());
  },
};
