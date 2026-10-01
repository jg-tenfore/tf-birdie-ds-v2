import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import { expect, waitFor } from 'storybook/test';
import { md3, radius } from '../../../../theme/tokens';
import { Icon } from '../../../../pos/components/primitives';
import { Stack } from '../../../../pos/components/Stack';
import { Screen, atVenue } from '../../../pos/screen-helpers';
import { ProposalTerminal } from '../mock-kit';

/**
 * V1 → V2 Migration / 100126 / 6 · Empty rail collapsed by default
 *
 * **Weston:** *"It'll probably have to indicate, like, how you close it. Like, Click to collapse."* …
 * *"I just think by default… just collapsed if there's nothing in it. Unless you deliberately open it.
 * Like, should just be the default behavior."* Justin: *"like first time, like we have onboarding…
 * even like a little reminder."*
 *
 * **Original** — the register opens with the rail out: an empty order, Walk-in and Reserve tee time,
 * and the totals at $0.00 — a third of the screen for nothing.
 *
 * **Proposal** — with nothing on the order the rail **starts collapsed**, and says so the first time:
 * a one-time hint points at it. Opened on purpose, it carries a visible **Collapse** control rather
 * than relying on someone knowing to tap "No items added yet".
 */
const meta = {
  title: 'V1 → V2 Migration/100126/6 · Empty rail collapsed by default',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const register = (collapsed: boolean) => atVenue('eighteen', { view: 'pos', leftPanelCollapsed: collapsed, cart: [] });

/** Today: the empty rail is open. */
export const Original: Story = {
  render: () => <Screen edition="v1v2" initialState={register(false)} />,
};

function Hint({ children, sx }: { children: React.ReactNode; sx: object }) {
  return (
    <Box data-rail-hint sx={{ position: 'absolute', zIndex: 1500, maxWidth: 260, p: '10px 12px', borderRadius: `${radius.md}px`, bgcolor: md3.onSurface, color: '#fff', fontSize: 12.5, lineHeight: 1.45, boxShadow: '0 6px 18px rgba(0,0,0,.25)', ...sx }}>
      {children}
    </Box>
  );
}

/** Empty order: the rail starts collapsed, with a one-time hint. */
export const Proposal: Story = {
  render: () => (
    <ProposalTerminal backdrop={register(true)}>
      <Hint sx={{ left: 84, top: 400 }}>
        <Stack direction="row" gap={1} alignItems="flex-start">
          <Icon name="chevron_left" size={18} />
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 800 }}>The order is empty, so it's tucked away</Typography>
            <Typography sx={{ fontSize: 12, opacity: 0.85, mt: 0.25 }}>Tap the rail to open it. It opens by itself as soon as something is added.</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 800, mt: 0.75, textDecoration: 'underline' }}>Got it</Typography>
          </Box>
        </Stack>
      </Hint>
    </ProposalTerminal>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-rail-hint]')).not.toBeNull());
  },
};

/** Opened on purpose: a visible Collapse control at the top of the rail. */
export const ProposalOpenedOnPurpose: Story = {
  name: 'Proposal · opened on purpose',
  render: () => (
    <ProposalTerminal backdrop={register(false)}>
      <Box sx={{ position: 'absolute', left: 300, top: 236, zIndex: 1500 }}>
        <Stack
          data-collapse-control
          direction="row"
          alignItems="center"
          gap={0.5}
          sx={{ px: 1.25, py: 0.625, borderRadius: `${radius.xl}px`, bgcolor: '#fff', border: `1.5px solid ${md3.outlineVariant}`, fontSize: 12.5, fontWeight: 700, boxShadow: '0 2px 6px rgba(0,0,0,.12)' }}
        >
          <Icon name="chevron_left" size={16} /> Collapse
        </Stack>
      </Box>
    </ProposalTerminal>
  ),
};
