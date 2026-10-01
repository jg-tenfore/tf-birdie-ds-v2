import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, ButtonBase, Typography } from '@mui/material';
import { expect, waitFor, within } from 'storybook/test';
import { md3, playerAccents, radius } from '../../../../theme/tokens';
import { money } from '../../../../pos/logic/cart';
import { orderNumberFromId } from '../../../../pos/logic/reservation';
import { Icon } from '../../../../pos/components/primitives';
import { Stack } from '../../../../pos/components/Stack';
import { Screen } from '../../../pos/screen-helpers';
import { Chip, MockPanel, MockPanelFooter, MockPanelHeader, PillButton, ProposalTerminal, WhatChanged, seatView, seats } from '../mock-kit';
import { farnsworth, farnsworthHalfPaid, panelOn, sheet, withBooking } from '../scenarios';

/**
 * V1 → V2 Migration / 100126 / 5 · Financial: order number per player
 *
 * **Weston:** *"On the financial… show more details like the order number. So if like he paid, you
 * could see the order number for Nakamura and then maybe you can click into it and manage that order,
 * issue a refund, or like print a receipt… we get asked for that all the time because right now we
 * don't have a way to like reprint a receipt for a reservation."* He likes that Financial is its own
 * tab: *"this is like, okay, everything that was paid, rain check. Like I really like that."*
 *
 * **Original** — Farnsworth's two, with his seat paid and Nakamura's owed. Per player: what is owed,
 * refund and rain check. Nothing says which order a paid seat was rung on.
 *
 * **Proposal** — a paid seat shows its **order number** and when it was paid, with **Print receipt**,
 * **See order** (Order Lookup, back to here) and refund on the row. An unpaid seat says what it owes.
 */
const meta = {
  title: 'V1 → V2 Migration/100126/5 · Financial order number per player',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const party = farnsworthHalfPaid;
const state = (tab: 'players' | 'financial') => panelOn(party(), tab, { bookings: withBooking(party()) });

/** Today: owed amounts, refund and rain check — no order number. */
export const Original: Story = {
  render: () => <Screen edition="v1v2" initialState={state('financial')} />,
};

/** A paid seat carries its order number, Print receipt and See order. */
export const Proposal: Story = {
  render: () => {
    const b = party();
    const number = orderNumberFromId(b.id);
    const owed = seats(b).filter((s) => !s.paid).reduce((n, s) => n + s.price.total, 0);
    return (
      <ProposalTerminal backdrop={sheet({ bookings: withBooking(b) })}>
        <MockPanel>
          <MockPanelHeader b={b} tab="financial" />
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '14px 16px' }}>
            <Box sx={{ mb: 1.5 }}>
              <WhatChanged>A paid player shows the order it was rung on — print its receipt or open the order to refund, straight from the reservation.</WhatChanged>
            </Box>
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: md3.outline, mb: 1 }}>BALANCE</Typography>
            <Box sx={{ p: '14px 16px', borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer, mb: 2 }}>
              <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>Outstanding</Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: md3.error }}>{money(owed)}</Typography>
            </Box>
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: md3.outline, mb: 1 }}>PER PLAYER</Typography>
            {seats(b).map((s) => (
              <Stack
                key={s.i}
                data-financial-row={s.i}
                direction="row"
                alignItems="center"
                gap={1.25}
                sx={{ p: '12px 14px', borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer, mb: 1 }}
              >
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: playerAccents[s.i] }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{s.name}</Typography>
                  {s.paid ? (
                    <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 0.25 }}>
                      <Chip label="Paid" tone="ok" />
                      <ButtonBase data-order-link sx={{ gap: 0.375, fontSize: 12.5, fontWeight: 800, color: md3.primary, borderRadius: `${radius.sm}px`, px: 0.5 }}>
                        <Icon name="receipt_long" size={14} />
                        {number}
                      </ButtonBase>
                      <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>· 6:02 AM · Card •••• 4421 · {money(seatView(farnsworth(), s.i).price.total)}</Typography>
                    </Stack>
                  ) : (
                    <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, mt: 0.25 }}>Not paid yet</Typography>
                  )}
                </Box>
                {s.paid ? (
                  <>
                    <PillButton icon="print">Print receipt</PillButton>
                    <PillButton icon="open_in_new">See order</PillButton>
                    <Icon name="undo" size={18} color={md3.onSurfaceVariant} />
                  </>
                ) : (
                  <>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: md3.error }}>{money(s.price.total)}</Typography>
                    <Icon name="undo" size={18} color={md3.outlineVariant} />
                  </>
                )}
              </Stack>
            ))}
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: md3.outline, mt: 2, mb: 1 }}>GROUP ACTIONS</Typography>
            <Stack direction="row" gap={1}>
              <PillButton>Rain check all</PillButton>
              <PillButton sx={{ color: md3.error, borderColor: md3.error }}>Refund group</PillButton>
            </Stack>
          </Box>
          <MockPanelFooter b={b} />
        </MockPanel>
      </ProposalTerminal>
    );
  },
  play: async ({ canvasElement }) => {
    const panel = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-mock-panel]')!);
    await expect(panel.querySelector('[data-order-link]')!.textContent).toMatch(/#A-\d{5}/);
    await expect(within(panel).getByRole('button', { name: /Print receipt/ })).toBeTruthy();
  },
};
