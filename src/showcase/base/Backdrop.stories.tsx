import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Backdrop, Box, Button, CircularProgress, Typography } from '@mui/material';

/**
 * Native MUI `Backdrop` used as a busy screen: a full-screen dim with a spinner
 * that blocks everything. Shown so it is recognisable; Birdie avoids it (see the
 * page). Click the dimmed area to dismiss.
 */
function BackdropDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Show busy backdrop
      </Button>
      <Backdrop
        open={open}
        onClick={() => setOpen(false)}
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
}

/**
 * Backdrop with a labelled message beneath the spinner. Clearer than a bare
 * spinner, and still not a Birdie pattern: the counter keeps working.
 */
function BackdropMessageDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Show with a message
      </Button>
      <Backdrop
        open={open}
        onClick={() => setOpen(false)}
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          <CircularProgress color="inherit" />
          <Typography variant="body1">Working…</Typography>
        </Box>
      </Backdrop>
    </Box>
  );
}

const meta = {
  title: 'Design System/Components/Feedback & Status/Backdrop',
  id: 'components-feedback-status-backdrop',
  component: BackdropDemo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Native MUI `Backdrop` — a full-screen dimming layer. As a busy screen (these stories) it is avoided in Birdie; ' +
          'the dim behind dialogs and panels comes from Dialog and the panels\' own scrims. ' +
          'Press the button to open it, then click the dimmed area to dismiss.',
      },
    },
  },
} satisfies Meta<typeof BackdropDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive — click **Show busy backdrop** to raise it, then click anywhere to close it. */
export const Playground: Story = {
  render: () => <BackdropDemo />,
};

/** A spinner paired with a **Working…** label. */
export const WithMessage: Story = {
  parameters: {
    docs: { description: { story: 'Backdrop with a custom message under the spinner for longer tasks.' } },
  },
  render: () => <BackdropMessageDemo />,
};
