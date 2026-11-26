import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import DateRange from '@mui/icons-material/DateRange';
import FormatListBulleted from '@mui/icons-material/FormatListBulleted';
import { Seg } from '../../pos/components/Touch';
import { PillGroup } from '../../pos/modals/ModalFrame';
import { SegmentedButton } from '../../pos/mobile/screens/people/parts';
import { mobileTheme } from '../../theme/mobile-theme';

/**
 * ToggleButtonGroup — a segmented, mutually-exclusive choice such as the tee sheet's
 * Calendar / List view. For a binary on/off setting, use the Switch instead.
 */
function ToggleDemo() {
  const [mode, setMode] = useState('cal');
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
      <ToggleButtonGroup
        exclusive
        value={mode}
        onChange={(_, v) => v && setMode(v)}
        aria-label="Tee sheet view"
      >
        <ToggleButton value="cal">
          <DateRange sx={{ mr: 1 }} /> Calendar
        </ToggleButton>
        <ToggleButton value="list">
          <FormatListBulleted sx={{ mr: 1 }} /> List
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

const meta = {
  title: 'Design System/Components/Forms/Toggle Button',
  id: 'components-forms-toggle-button',
  component: ToggleDemo,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'MUI `ToggleButtonGroup` for a segmented, mutually-exclusive choice — for example the tee sheet\'s Calendar / List view. ' +
          'Click a button to switch. For a binary on/off setting use **Switch** instead.',
      },
    },
  },
} satisfies Meta<typeof ToggleDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Toggle: Story = {};

/**
 * The segmented controls the product really draws. Tablet: `Seg` (`src/pos/components/Touch.tsx`),
 * dark when selected, on the reservation panel's player rows; and `PillGroup`
 * (`src/pos/modals/ModalFrame.tsx`), separate pills, in dialogs. Handheld: `SegmentedButton`
 * (`src/pos/mobile/screens/people/parts.tsx`), the MD3 segmented button with a check.
 */
function InBirdieToggles() {
  const [transport, setTransport] = useState<'walk' | 'ride' | 'push'>('ride');
  const [holes, setHoles] = useState<9 | 18>(18);
  const [applies, setApplies] = useState<'single' | 'range'>('single');
  const [mobileApplies, setMobileApplies] = useState<'single' | 'range'>('single');
  return (
    <Box sx={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="overline">Tablet · Seg</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Seg
            label="Holes"
            value={holes}
            options={[
              { value: 9, label: '9' },
              { value: 18, label: '18' },
            ]}
            onChange={setHoles}
          />
          <Seg
            label="Transport"
            value={transport}
            options={[
              { value: 'walk', label: 'Walk', icon: 'directions_walk' },
              { value: 'ride', label: 'Ride', icon: 'directions_car' },
              { value: 'push', label: 'Push', icon: 'shopping_cart' },
            ]}
            onChange={setTransport}
          />
        </Box>
        <Typography variant="overline" sx={{ mt: 1 }}>
          Tablet · PillGroup
        </Typography>
        <PillGroup
          label="Applies to"
          value={applies}
          options={[
            { label: 'This time only', value: 'single' },
            { label: 'A range of times', value: 'range' },
          ]}
          onChange={setApplies}
        />
      </Box>
      <ThemeProvider theme={mobileTheme}>
        <Box sx={{ width: 328, display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Typography variant="overline">Handheld · SegmentedButton</Typography>
          <SegmentedButton
            ariaLabel="Applies to"
            value={mobileApplies}
            onChange={setMobileApplies}
            options={[
              { label: 'This time', value: 'single' },
              { label: 'A range', value: 'range' },
            ]}
          />
        </Box>
      </ThemeProvider>
    </Box>
  );
}

/** Birdie's segmented controls: `Seg` and `PillGroup` on the tablet, `SegmentedButton` on the handheld. */
export const InBirdie: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "What the product renders. Tablet: `Seg` (the reservation panel's holes and transport) and `PillGroup` (the price override's Applies to). Handheld: `SegmentedButton` (the same choice on the phone's price override).",
      },
    },
  },
  render: () => <InBirdieToggles />,
};
