import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import { IdMeBadge } from '../../../pos/components/IdMeBadge';
import { Stack } from '../../../pos/components/Stack';
import { idMeGroups, md3 } from '../../../theme/tokens';
import type { IdMeGroup } from '../../../pos/types';
import { Screen } from '../../pos/screen-helpers';
import { adjustedParty, idMeParty, sheetWithPanel } from '../tablet-scenarios';

/**
 * Weston Edits / 3 · ID.me Badge / Tablet
 *
 * Weston mentioned "ID.me, showing their ID" among the things today's reservation screen
 * gives the counter. For now this is **a badge only**: a customer whose record carries an
 * ID.me verification shows it — with the group (military, veteran, first responder, nurse,
 * teacher) — on their player row and in the Customer tab, so a qualifying rate can be applied
 * without asking for a card. There is no verify flow yet; that waits on how Birdie presents
 * it today. Verified customers are the side table `IDME_VERIFIED` in `data/golfers.ts`.
 */
const meta = {
  title: 'Weston Edits/3 · ID.me Badge/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * On the player row: a verified booker (Farnsworth, Weston — military) shows the compact
 * badge beside their name, where the counter already looks for the member dot.
 */
export const OnThePlayerRow: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(idMeParty())} />,
};

/**
 * A verified customer linked onto a guest seat: seat 2 is Kim, David (first responder), so
 * the badge follows the *player*, not the booking — as does the rate: Kim is a member, so
 * the seat is on the member rate.
 */
export const OnALinkedGuest: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(adjustedParty())} />,
};

/** In the Customer tab the badge spells out the group. */
export const InTheCustomerTab: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(idMeParty(), 'customer')} />,
};

/**
 * Every group, both sizes. One neutral blue family so ID.me reads as *identity* — not as
 * payment state (green/red) or membership tier (the dot colours).
 */
export const AllGroups: Story = {
  render: () => (
    <Box sx={{ p: 4, bgcolor: md3.surface, minHeight: '100vh' }}>
      <Stack gap={1.5}>
        {(Object.keys(idMeGroups) as IdMeGroup[]).map((g) => (
          <Stack key={g} direction="row" alignItems="center" gap={2}>
            <Typography sx={{ width: 140, fontSize: 13, color: md3.onSurfaceVariant }}>{g}</Typography>
            <IdMeBadge group={g} compact />
            <IdMeBadge group={g} />
          </Stack>
        ))}
      </Stack>
    </Box>
  ),
};
