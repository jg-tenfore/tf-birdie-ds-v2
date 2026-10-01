import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { expect, userEvent, waitFor } from 'storybook/test';
import { Screen } from '../../../pos/screen-helpers';
import { FullRow, MockPanel, MockPanelFooter, MockPanelHeader, ProposalTerminal, WhatChanged, seats } from '../mock-kit';
import { king, panelOn, sheet } from '../scenarios';

/**
 * V1 → V2 Migration / 100126 / 2 · Status chip instead of the stepper
 *
 * **Weston:** *"it does take up a lot of space… we could still show the status and maybe they could
 * click on it and change it."* Justin: *"they haven't arrived… I don't need to see that yet… They
 * probably don't even need to see it during the checkout experience."*
 *
 * **Original** — each player card ends with the five-stop round rail (Not Arrived → Finished), the
 * tallest part of the card.
 *
 * **Proposal** — the rail becomes one chip on the player's name line. It says where they are; tap it
 * to move them along. The card loses about a third of its height without losing the status.
 */
const meta = {
  title: 'V1 → V2 Migration/100126/2 · Status chip instead of the stepper',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Today: the round rail at the foot of every player. */
export const Original: Story = {
  render: () => <Screen edition="v1v2" initialState={panelOn(king())} />,
};

/** One status chip per player, on the name line; tap to change it. */
export const Proposal: Story = {
  render: () => {
    const b = king();
    return (
      <ProposalTerminal backdrop={sheet()}>
        <MockPanel>
          <MockPanelHeader b={b} />
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '14px 16px' }}>
            <Box sx={{ mb: 1.5 }}>
              <WhatChanged>The round rail is now one chip beside the name — tap it to check someone in or move them along.</WhatChanged>
            </Box>
            {seats(b).map((s) => (
              <FullRow key={s.i} s={s} stepper="chip" />
            ))}
          </Box>
          <MockPanelFooter b={b} />
        </MockPanel>
      </ProposalTerminal>
    );
  },
  play: async ({ canvasElement }) => {
    const panel = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-mock-panel]')!);
    await expect(panel.querySelector('[data-round-rail]')).toBeNull();
    const chip = panel.querySelector<HTMLElement>('[data-status-chip]')!;
    await userEvent.click(chip);
    await userEvent.click(await waitFor(() => [...panel.querySelectorAll<HTMLElement>('button')].find((x) => x.textContent === 'Checked In')!));
    await expect(panel.querySelector('[data-status-chip]')!.getAttribute('data-status-chip')).toBe('0');
  },
};
