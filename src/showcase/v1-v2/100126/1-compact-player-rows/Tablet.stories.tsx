import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { md3 } from '../../../../theme/tokens';
import { Screen } from '../../../pos/screen-helpers';
import { CompactRow, MockPanel, MockPanelFooter, MockPanelHeader, PillButton, ProposalTerminal, WhatChanged, seats } from '../mock-kit';
import { king, panelOn, sheet } from '../scenarios';

/**
 * V1 → V2 Migration / 100126 / 1 · Compact player rows
 *
 * **Weston:** *"Currently, even on our screens, that 4th player, you always have to scroll to get to
 * that 4th player… can you just get it all to fit on one screen so I don't have to scroll like when I
 * click into it each time? … you do 100 of these and you're just like, okay, wait one sec, let me
 * scroll down."* — and later, *"could we just show that and it's like a condensed view that maybe
 * expands?"*
 *
 * **Original** — King, D.'s foursome, May 22. Each player is a full card: controls, rate and
 * transport lines, and the round rail. The 4th player starts below the fold.
 *
 * **Proposal** — one line per player: name, membership, where they are in the round, paid, cart,
 * 9/18 and the price. Tap the chevron for the full editor. All four fit, with room for a group note.
 */
const meta = {
  title: 'V1 → V2 Migration/100126/1 · Compact player rows',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Today: the 4th player is below the fold. */
export const Original: Story = {
  render: () => <Screen edition="v1v2" initialState={panelOn(king())} />,
};

function CompactPanel() {
  const b = king();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <MockPanel>
      <MockPanelHeader b={b} />
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '14px 16px' }}>
        <Box sx={{ mb: 1.5 }}>
          <WhatChanged>One line per player, so a foursome fits without scrolling. Tap ⌄ on a player for the full editor.</WhatChanged>
        </Box>
        <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: md3.outline, mb: 1 }}>
          PLAYERS · 0/{b.players} CHECKED IN
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, mb: 1.25 }}>
          <PillButton icon="directions_car">Everyone rides</PillButton>
          <PillButton icon="directions_walk">Everyone walks</PillButton>
          <PillButton icon="how_to_reg">Check in all</PillButton>
        </Box>
        {seats(b).map((s) => (
          <CompactRow key={s.i} s={s} open={open === s.i} onToggle={() => setOpen(open === s.i ? null : s.i)} />
        ))}
      </Box>
      <MockPanelFooter b={b} />
    </MockPanel>
  );
}

/** One line per player; all four fit, and a tap opens one. */
export const Proposal: Story = {
  render: () => (
    <ProposalTerminal backdrop={sheet()}>
      <CompactPanel />
    </ProposalTerminal>
  ),
  play: async ({ canvasElement }) => {
    const panel = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-mock-panel]')!);
    const rows = panel.querySelectorAll<HTMLElement>('[data-compact-row]');
    await expect(rows.length).toBe(4);
    // The whole foursome is on screen: the last row ends above the footer.
    const footerTop = panel.lastElementChild!.getBoundingClientRect().top;
    await expect(rows[3].getBoundingClientRect().bottom).toBeLessThanOrEqual(footerTop);
    await userEvent.click(within(panel).getByRole('button', { name: /Expand Guest 2/ }));
    await expect(panel.querySelector('[data-compact-detail="1"]')).not.toBeNull();
  },
};
