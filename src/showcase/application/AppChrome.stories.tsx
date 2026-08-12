import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { md3, shell } from '../../theme/tokens';
import { PosShell } from '../../pos/PosApp';
import { PosProvider } from '../../pos/state/PosProvider';
import { LeftPanel } from '../../pos/components/LeftPanel';
import { TeeSheetView } from '../../pos/components/TeeSheetView';
import { PosView } from '../../pos/components/PosView';
import { DEMO_BOOKINGS, paidFoursome, withLoadedBooking, withWalkInOrder } from '../pos/screen-helpers';

/**
 * Components / App Chrome
 *
 * The three structural pieces of the application shell, in isolation: the device frame,
 * the persistent order panel, and the two view bodies that swap inside it.
 *
 * Isolating them is worth doing because the shell is the design's central decision — one
 * fixed frame, one persistent panel, two interchangeable bodies. Everything else hangs
 * off that.
 */
const meta = {
  title: 'Components/Layout & Structure/App Chrome',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function Frame({ children, state }: { children: React.ReactNode; state?: object }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: md3.scrim,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
      }}
    >
      <PosProvider initialState={state as never}>
        <PosShell>{children}</PosShell>
      </PosProvider>
    </Box>
  );
}

/**
 * The device frame. Fixed at 1366×840 rather than responsive — this is a counter terminal
 * with known hardware, and the prototype assumes those dimensions throughout. A fluid
 * layout would be a different design, not the same one scaled.
 */
export const DeviceFrame: Story = {
  render: () => (
    <Frame state={{ bookings: DEMO_BOOKINGS }}>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: md3.outline,
          fontSize: 13,
        }}
      >
        {shell.width} × {shell.height} — the frame, empty
      </Box>
    </Frame>
  ),
};

/**
 * The order panel, empty. 320px, always present, shared by both views. It collapses to
 * zero on the tee sheet to give the grid full width, then springs back on return.
 */
export const OrderPanelEmpty: Story = {
  render: () => (
    <Frame state={{ bookings: DEMO_BOOKINGS }}>
      <LeftPanel />
      <Box sx={{ flex: 1, bgcolor: md3.surface }} />
    </Frame>
  ),
};

/**
 * The order panel with a walk-in order on it — per-player pricing blocks, guest chips, and
 * the totals footer.
 */
export const OrderPanelWithOrder: Story = {
  render: () => (
    <Frame state={withWalkInOrder()}>
      <LeftPanel />
      <Box sx={{ flex: 1, bgcolor: md3.surface }} />
    </Frame>
  ),
};

/** The order panel with a tee-sheet booking loaded, showing the reservation summary card. */
export const OrderPanelLoadedBooking: Story = {
  render: () => (
    <Frame state={withLoadedBooking(paidFoursome())}>
      <LeftPanel />
      <Box sx={{ flex: 1, bgcolor: md3.surface }} />
    </Frame>
  ),
};

/** The register body: top bar, search, category buttons, item grid. */
export const RegisterBody: Story = {
  render: () => (
    <Frame state={{ bookings: DEMO_BOOKINGS, currentCategory: 'RENTALS' }}>
      <PosView />
    </Frame>
  ),
};

/** The tee sheet body: toolbar and grid, at full width with the panel collapsed. */
export const TeeSheetBody: Story = {
  render: () => (
    <Frame state={{ bookings: DEMO_BOOKINGS, view: 'tee', leftPanelCollapsed: true }}>
      <TeeSheetView />
    </Frame>
  ),
};
