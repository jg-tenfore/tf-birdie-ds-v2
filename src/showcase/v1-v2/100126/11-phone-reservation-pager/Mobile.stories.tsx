import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import { expect, waitFor } from 'storybook/test';
import { md3, radius } from '../../../../theme/tokens';
import { money } from '../../../../pos/logic/cart';
import { Icon } from '../../../../pos/components/primitives';
import { Stack } from '../../../../pos/components/Stack';
import { MobileStory, mobileMeta } from '../../../pos-mobile/mobile-helpers';
import { at18, paidParty } from '../../../weston-edits/mobile-scenarios';
import { Avatar, Chip, ProposalPhone, WhatChanged, seats, when } from '../mock-kit';

/**
 * V1 → V2 Migration / 100126 / 11 · Phone: reservation without the pager
 *
 * **Weston:** *"I think we could get rid of this. I just don't know if anyone would have enough
 * context to know like what comes next… it like takes up a line… don't worry about trying to fit all
 * 4 on one screen. That's pretty crazy."* Stepping tee time to tee time matters for a league — which
 * moves to its own group view (item 8).
 *
 * **Original** — Weston Edits' phone reservation: the "30 of 88" pager sits on its own line between
 * the title and the summary.
 *
 * **Proposal** — the pager line goes; the summary moves up, and the first player card with it.
 * Leagues and outings step through their tee times in the group view instead.
 */
const meta = {
  title: 'V1 → V2 Migration/100126/11 · Phone reservation pager',
  ...mobileMeta,
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Today: the pager takes a line of its own. */
export const Original: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="tee" stack={[{ name: 'bookingDetail', bookingId: paidParty().id }]} />,
};

/** The pager line gone; the players move up. */
export const Proposal: Story = {
  render: () => {
    const b = paidParty();
    return (
      <ProposalPhone>
        <Stack direction="row" alignItems="center" gap={1.25} sx={{ px: 1.5, pt: 1, pb: 0.5, flexShrink: 0 }}>
          <Icon name="arrow_back" size={22} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{b.name}</Typography>
            <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>{when(b).split(' · ').slice(0, 2).join(' · ')}</Typography>
          </Box>
          <Icon name="more_vert" size={22} />
        </Stack>
        <Stack direction="row" alignItems="center" gap={1} sx={{ px: 2, py: 1, flexShrink: 0 }} data-summary>
          <Chip label="PAID" tone="ok" />
          <Typography sx={{ fontSize: 13.5 }}>
            {b.players} players · {b.holes} · Riding cart
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
          {['Players', 'Financial', 'Notes', 'Activity'].map((t, i) => (
            <Box key={t} sx={{ flex: 1, textAlign: 'center', py: 1.25, fontSize: 14, fontWeight: 600, color: i === 0 ? md3.primary : md3.onSurfaceVariant, borderBottom: `2.5px solid ${i === 0 ? md3.primary : 'transparent'}` }}>
              {t}
            </Box>
          ))}
        </Stack>
        <Box sx={{ px: 1.5, pt: 1 }}>
          <WhatChanged>The tee-time pager line is gone — the summary and players move up a line.</WhatChanged>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
          {seats(b).map((s) => (
            <Stack key={s.i} direction="row" alignItems="center" gap={1.25} sx={{ p: '12px 14px', mb: 1, borderRadius: `${radius.md}px`, border: `1px solid ${md3.outlineVariant}`, bgcolor: '#fff' }}>
              <Avatar name={s.name} color={s.accent} size={40} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 15.5, fontWeight: 700 }}>{s.name}</Typography>
                <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>
                  {s.holes} holes · {money(s.price.total)}
                </Typography>
              </Box>
              <Chip label="PAID" tone="ok" />
              <Icon name="chevron_right" size={20} />
            </Stack>
          ))}
        </Box>
      </ProposalPhone>
    );
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('[data-summary]')).not.toBeNull());
    await expect(canvasElement.textContent).not.toMatch(/\d+ of \d+/);
  },
};
