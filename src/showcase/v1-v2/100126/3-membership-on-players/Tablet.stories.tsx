import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { expect, waitFor } from 'storybook/test';
import { Screen } from '../../../pos/screen-helpers';
import { FullRow, MockPanel, MockPanelFooter, MockPanelHeader, ProposalTerminal, WhatChanged, seats } from '../mock-kit';
import { king, panelOn, sheet } from '../scenarios';

/**
 * V1 → V2 Migration / 100126 / 3 · Membership on every player
 *
 * **Weston:** *"And then we show the current membership, right? … Does it say their membership?"*
 * Justin: *"No, I gotta put that back in. I don't know why I got lost when I did the migration… I'll
 * make sure to make it a priority."* Weston: *"we want to have the customer type and the membership."*
 *
 * **Original** — a player's membership shows only through the rate it priced them at ("Junior
 * Membership Weekday"); customer type is not shown at all.
 *
 * **Proposal** — each linked player carries their membership and customer-type chips beside the name,
 * as Customer Search shows them. An unlinked guest says so.
 */
const meta = {
  title: 'V1 → V2 Migration/100126/3 · Membership on every player',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Today: no membership or customer type on the player. */
export const Original: Story = {
  render: () => <Screen edition="v1v2" initialState={panelOn(king())} />,
};

/** Membership and customer type as chips on every player. */
export const Proposal: Story = {
  render: () => {
    const b = king();
    return (
      <ProposalTerminal backdrop={sheet()}>
        <MockPanel>
          <MockPanelHeader b={b} />
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '14px 16px' }}>
            <Box sx={{ mb: 1.5 }}>
              <WhatChanged>Membership and customer type are back on each player, as chips beside the name.</WhatChanged>
            </Box>
            {seats(b).map((s) => (
              <FullRow key={s.i} s={s} chips />
            ))}
          </Box>
          <MockPanelFooter b={b} />
        </MockPanel>
      </ProposalTerminal>
    );
  },
  play: async ({ canvasElement }) => {
    const panel = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-mock-panel]')!);
    await expect(panel.querySelectorAll('[data-full-row]').length).toBe(4);
  },
};
