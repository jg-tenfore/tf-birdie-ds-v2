import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material';
import Print from '@mui/icons-material/Print';
import Restore from '@mui/icons-material/Restore';
import PriorityHigh from '@mui/icons-material/PriorityHigh';

// A booking's actions fanned out of one trigger — the pattern Birdie avoids (see the page).
const actions = [
  { icon: <Print />, name: 'Print receipt' },
  { icon: <Restore />, name: 'Issue rain check' },
  { icon: <PriorityHigh />, name: 'Mark no-show' },
];

// Named component so useState (open) obeys react-hooks/rules-of-hooks.
function SpeedDialDemo({ direction = 'up' as const }: { direction?: 'up' | 'down' | 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  return (
    // A tall relative box gives the fanned-out actions room to render inside the story.
    <Box sx={{ position: 'relative', height: 320, width: 320 }}>
      <SpeedDial
        ariaLabel="Booking actions"
        sx={{ position: 'absolute', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
        direction={direction}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            slotProps={{ tooltip: { title: action.name } }}
            onClick={() => setOpen(false)}
          />
        ))}
      </SpeedDial>
    </Box>
  );
}

const meta = {
  title: 'Design System/Components/Actions/Speed Dial',
  id: 'components-actions-speed-dial',
  component: SpeedDialDemo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'MUI `SpeedDial`: a floating button that fans out into icon buttons whose names show only as tooltips. ' +
          'Birdie avoids it: several actions on one booking are a labelled right-click menu on the tablet and a bottom sheet ' +
          'on the handheld. Shown here so the pattern is recognisable. Hover or tap the button to reveal the actions.',
      },
    },
  },
} satisfies Meta<typeof SpeedDialDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Open the dial: three unlabelled icons. Compare the booking menu on the Menu page, which names and groups its actions. */
export const Playground: Story = {};

/** The same actions fanning out to the left instead of up. */
export const LeftDirection: Story = {
  parameters: { docs: { description: { story: 'Set `direction="left"` when the trigger sits at a screen edge and should open inward.' } } },
  render: () => <SpeedDialDemo direction="left" />,
};
