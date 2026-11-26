import type { Meta, StoryObj } from '@storybook/react-vite';
import { withEdition } from '../edition-decorator';
import { Box } from '@mui/material';
import { md3 } from '../../theme/tokens';
import { useTabletFrame } from '../../pos/device-context';
import { MobileStory } from '../pos-mobile/mobile-helpers';
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
  title: 'Design System/Components/Layout & Structure/App Chrome',
  id: 'components-layout-structure-app-chrome',
  decorators: [withEdition('current-tablet')],
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

/** The frame's size, read from the device context: the chosen device, or the design canvas. */
function FrameSize() {
  const frame = useTabletFrame();
  return (
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
      {frame.width} × {frame.height} — the frame, empty
    </Box>
  );
}

/**
 * The device frame. A fixed size per device rather than responsive — counter terminals are
 * known hardware. With no device chosen it is the 1366×840 design canvas; pick the Clover Mini
 * (1280×800) or the large display (1920×1080) on the **Device** toolbar and the frame follows.
 * A fluid layout would be a different design, not the same one scaled.
 */
export const DeviceFrame: Story = {
  render: () => (
    <Frame state={{ bookings: DEMO_BOOKINGS }}>
      <FrameSize />
    </Frame>
  ),
};

/**
 * The order panel, empty. 320px (380 on the large display), always present, shared by every
 * view. On the sheets an empty rail tucks into a 56px strip — see **Collapsed Rail** below.
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

/**
 * The rail collapsed beside the tee sheet: a 56px strip with the hamburger (opens the main nav),
 * the strip itself (expands the rail) and the cart with its count. One control, one job.
 */
export const CollapsedRail: Story = {
  render: () => (
    <Frame state={{ bookings: DEMO_BOOKINGS, view: 'tee', leftPanelCollapsed: true }}>
      <LeftPanel />
      <TeeSheetView />
    </Frame>
  ),
};

/**
 * The handheld's chrome on a root screen: status bar, a top app bar with no back arrow, the
 * scrolling body, and the navigation bar with the active destination in its pill.
 */
export const HandheldRootScreen: Story = {
  decorators: [withEdition('current-mobile')],
  render: () => <MobileStory tab="people" />,
};

/**
 * The handheld's chrome on a pushed screen: a back arrow in the top app bar and no navigation
 * bar — one step from where it came from.
 */
export const HandheldPushedScreen: Story = {
  decorators: [withEdition('current-mobile')],
  render: () => <MobileStory tab="people" stack={[{ name: 'golferDetail', golferId: 'G001' }]} />,
};
