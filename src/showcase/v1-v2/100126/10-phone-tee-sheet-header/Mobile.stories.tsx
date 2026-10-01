import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import { expect, waitFor } from 'storybook/test';
import { md3, payBadges, radius } from '../../../../theme/tokens';
import { DEMO_TODAY } from '../../../../pos/data/bookings';
import { formatTimeLabel, toDateStr } from '../../../../pos/data/courses';
import { venueBookings } from '../../../../pos/data/venues';
import { Icon } from '../../../../pos/components/primitives';
import { Stack } from '../../../../pos/components/Stack';
import { MobileStory, mobileMeta } from '../../../pos-mobile/mobile-helpers';
import { at18 } from '../../../weston-edits/mobile-scenarios';
import { ProposalPhone, WhatChanged } from '../mock-kit';

/**
 * V1 → V2 Migration / 100126 / 10 · Phone: tee sheet header collapses on scroll
 *
 * **Weston, on the phone:** *"it'd be nice if like once you start scrolling, if you could collapse…
 * at least these like 3 lines."* Justin: *"Do you want to just keep the time or like the day?"*
 * Weston: *"Yeah, I'd keep the day so then you could just click that and go to a different date if
 * you need to, or click the arrows."*
 *
 * V1 → V2 is tablet-only, so the Original is Weston Edits' phone — the screen in Justin's screenshot.
 *
 * **Original** — the date picker, the week strip and the course chips stay pinned above the list,
 * about a third of the screen, however far you scroll.
 *
 * **Proposal** — once the list scrolls, the three collapse into **one date row**: ‹ Today · Thu,
 * May 21 › — tap the date for the calendar, or the arrows for the next day. Scroll back to the top
 * and they return.
 */
const meta = {
  title: 'V1 → V2 Migration/100126/10 · Phone tee sheet header',
  ...mobileMeta,
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Today: three pinned rows above the list. */
export const Original: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="tee" />,
};

const BADGE = { paid: payBadges.paid, open: payBadges.open, refunded: { bg: '#fee2e2', text: '#dc2626', label: 'REFUNDED' } } as Record<string, { bg: string; text: string; label: string }>;

/** Scrolled: one date row, and the list has the screen. */
export const Proposal: Story = {
  render: () => {
    const day = toDateStr(DEMO_TODAY());
    const list = venueBookings('eighteen')
      .filter((b) => b.date === day && b.status !== 'block' && b.pay !== 'event')
      .sort((a, b) => a.timeMin - b.timeMin)
      .slice(6, 18);
    return (
      <ProposalPhone>
        <Stack direction="row" alignItems="center" gap={1} sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${md3.outlineVariant}`, bgcolor: md3.surface, flexShrink: 0 }} data-collapsed-header>
          <Icon name="chevron_left" size={22} />
          <Stack direction="row" alignItems="center" justifyContent="center" gap={0.75} sx={{ flex: 1, py: 0.75, borderRadius: `${radius.md}px`, border: `1px solid ${md3.outlineVariant}`, fontSize: 14, fontWeight: 600 }}>
            <Icon name="calendar_month" size={17} /> Today · Thu, May 21 <Icon name="arrow_drop_down" size={18} />
          </Stack>
          <Icon name="chevron_right" size={22} />
          <Icon name="search" size={20} />
        </Stack>
        <Box sx={{ px: 1.5, pt: 1 }}>
          <WhatChanged>Scrolled: the date picker, week strip and course chips fold into this one date row.</WhatChanged>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
          {list.map((b) => {
            const badge = BADGE[b.pay] ?? BADGE.open;
            return (
              <Stack key={b.id} direction="row" gap={1.25} sx={{ mb: 1 }}>
                <Typography sx={{ width: 46, fontSize: 13, fontWeight: 800, pt: 1 }}>{formatTimeLabel(b.timeMin).replace(' AM', '').replace(' PM', '')}</Typography>
                <Box sx={{ flex: 1, p: '8px 12px', borderRadius: `${radius.md}px`, border: `1px solid ${md3.outlineVariant}`, borderLeft: `4px solid ${badge.text}`, bgcolor: '#fff' }}>
                  <Stack direction="row" alignItems="center">
                    <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{b.name}</Typography>
                    <Box sx={{ px: 0.875, py: '2px', borderRadius: `${radius.sm}px`, bgcolor: badge.bg, color: badge.text, fontSize: 10.5, fontWeight: 800 }}>{badge.label}</Box>
                  </Stack>
                  <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>
                    {b.course === 'champ-front' ? 'Front 9' : 'Back 9'} · {b.players} players · {b.holes}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
        </Box>
      </ProposalPhone>
    );
  },
  play: async ({ canvasElement }) => {
    const h = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-collapsed-header]')!);
    await expect(h.textContent).toContain('Today · Thu, May 21');
  },
};
