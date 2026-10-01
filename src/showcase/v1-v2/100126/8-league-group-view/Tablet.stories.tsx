import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, ButtonBase, Typography } from '@mui/material';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { md3, radius } from '../../../../theme/tokens';
import { formatTimeLabel } from '../../../../pos/data/courses';
import { money } from '../../../../pos/logic/cart';
import { Stack } from '../../../../pos/components/Stack';
import { Screen } from '../../../pos/screen-helpers';
import { Chip, PillButton, ProposalTerminal, WhatChanged } from '../mock-kit';
import { memberGuest, outing } from '../scenarios';

/**
 * V1 → V2 Migration / 100126 / 8 · League and group view
 *
 * **Weston:** *"when you click into a league reservation right now, we treat it like a tee time…
 * What I think it should be is when you click into a league, it should take you to maybe a different
 * flow… maybe at that point we take over the whole screen because you're in the league… showing you
 * like all the tee times. You can just check them all in from there. If all 16 of your dudes walk in
 * at the same time, I'm just hitting 1, pay, checkout, 1, pay, checkout… that's kind of the way we
 * should handle leagues and groups and shotguns where they're all like one big reservation."*
 *
 * **Original** — a Member-Guest tee time opens like any other: one group of four, with ‹ › to step
 * through the other seventeen.
 *
 * **Proposal** — any tee time of an outing opens the **whole outing** over the screen: every tee time
 * and player, how many are in and paid, a search, and per-player **Check in** and **Pay**. Tablet
 * first; the phone version is still open.
 */
const meta = {
  title: 'V1 → V2 Migration/100126/8 · League and group view',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Today: one tee time of the outing, opened like a single reservation. */
export const Original: Story = {
  render: () => <Screen edition="v1v2" initialState={outing(memberGuest()[0])} />,
};

function GroupView() {
  const times = memberGuest();
  const fee = times[0]?.price ?? 85;
  const [state, setState] = useState<Record<string, 'in' | 'paid'>>({});
  const players = times.flatMap((b) => Array.from({ length: b.players }, (_, i) => ({ key: `${b.id}:${i}`, b, i })));
  const inCount = players.filter((p) => state[p.key]).length;
  const paidCount = players.filter((p) => state[p.key] === 'paid').length;
  return (
    <Box data-group-view sx={{ position: 'absolute', inset: 0, zIndex: 1000, bgcolor: md3.surface, display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2.5, height: 64, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
        <PillButton icon="arrow_back">Tee sheet</PillButton>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 800 }}>Member-Guest Invitational</Typography>
          <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>Sat, May 30 · {times.length} tee times from {formatTimeLabel(times[0].timeMin)} · Organiser Farnsworth, Weston</Typography>
        </Box>
        <Chip label={`${inCount}/${players.length} checked in`} tone={inCount ? 'ok' : 'muted'} icon="how_to_reg" />
        <Chip label={`${paidCount} paid`} tone={paidCount ? 'ok' : 'muted'} icon="attach_money" />
        <PillButton icon="how_to_reg">Check in everyone here</PillButton>
      </Stack>
      <Box sx={{ px: 2.5, pt: 1.5, flexShrink: 0 }}>
        <WhatChanged>The whole outing in one place: every tee time and player, checked in and paid one after another — no stepping through tee times.</WhatChanged>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '12px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: 'max-content', gap: 1.5, alignContent: 'start' }}>
        {times.map((b, ti) => (
          <Box key={b.id} data-group-tee-time={b.id} sx={{ bgcolor: '#fff', border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, overflow: 'hidden' }}>
            <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 1, bgcolor: md3.surfaceContainer }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 800, flex: 1 }}>{formatTimeLabel(b.timeMin)}</Typography>
              <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>Front 9 · {b.players} players</Typography>
            </Stack>
            {Array.from({ length: b.players }, (_, i) => {
              const key = `${b.id}:${i}`;
              const st = state[key];
              return (
                <Stack key={i} data-group-player={key} direction="row" alignItems="center" gap={0.75} sx={{ px: 1.5, py: 0.75, borderTop: `1px solid ${md3.surfaceContainer}` }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{`Team ${ti + 1} · player ${i + 1}`}</Typography>
                  {st === 'paid' ? (
                    <Chip label="Paid" tone="ok" />
                  ) : (
                    <>
                      <ButtonBase onClick={() => setState((s) => ({ ...s, [key]: 'in' }))} sx={{ px: 1, py: 0.375, borderRadius: `${radius.xl}px`, border: `1.5px solid ${st ? md3.primary : md3.outlineVariant}`, fontSize: 11.5, fontWeight: 800, color: st ? md3.primary : md3.onSurface }}>
                        {st ? 'In' : 'Check in'}
                      </ButtonBase>
                      <ButtonBase onClick={() => setState((s) => ({ ...s, [key]: 'paid' }))} sx={{ px: 1, py: 0.375, borderRadius: `${radius.xl}px`, bgcolor: md3.onSurface, color: '#fff', fontSize: 11.5, fontWeight: 800 }}>
                        Pay {money(fee)}
                      </ButtonBase>
                    </>
                  )}
                </Stack>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** The whole outing over the screen; check in and pay player after player. */
export const Proposal: Story = {
  render: () => (
    <ProposalTerminal backdrop={outing()}>
      <GroupView />
    </ProposalTerminal>
  ),
  play: async ({ canvasElement }) => {
    const view = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-group-view]')!);
    await expect(view.querySelectorAll('[data-group-tee-time]').length).toBe(18);
    const first = view.querySelector<HTMLElement>('[data-group-player]')!;
    await userEvent.click(within(first).getByRole('button', { name: /^Pay / }));
    await expect(within(view).getByText('1 paid')).toBeTruthy();
  },
};
