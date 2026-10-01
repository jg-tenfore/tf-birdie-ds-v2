import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import { expect, waitFor } from 'storybook/test';
import { md3 } from '../../../../theme/tokens';
import { Icon } from '../../../../pos/components/primitives';
import { Stack } from '../../../../pos/components/Stack';
import { Screen } from '../../../pos/screen-helpers';
import { FullRow, MockPanel, MockPanelFooter, MockPanelHeader, ProposalTerminal, WhatChanged, seatView, seats } from '../mock-kit';
import { king, panelOn, sheet } from '../scenarios';

/**
 * V1 → V2 Migration / 100126 / 4 · Contact details once
 *
 * **Weston:** *"we do show the phone number and email for each player? I don't know if that's
 * necessary… if we show the email there… okay, I need to reach out to this group because of
 * something. Who do I contact?"* — and on Birdie today: *"we show my email 4 times, we show my phone
 * number 4 times, we show my memberships 4 times."*
 *
 * **Original** — the header carries the confirmation and the booker's phone only.
 *
 * **Proposal** — the header names the **booker** as the group's contact, with phone *and* email, each
 * one tap to call or write. Players carry no contact details; a player's own are in their record.
 */
const meta = {
  title: 'V1 → V2 Migration/100126/4 · Contact details once',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Today: confirmation and phone, no email. */
export const Original: Story = {
  render: () => <Screen edition="v1v2" initialState={panelOn(king())} />,
};

/** The booker's phone and email, once, in the header. */
export const Proposal: Story = {
  render: () => {
    const b = king();
    const booker = seatView(b, 0).record;
    const contact = (
      <Stack direction="row" alignItems="center" gap={1.25} sx={{ mt: 0.25 }} data-group-contact>
        <Typography sx={{ fontSize: 11.5, color: md3.outline }}>{b.conf} · Group contact:</Typography>
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ fontSize: 12, fontWeight: 700, color: md3.primary }}>
          <Icon name="phone" size={14} /> {b.phone || booker?.phone || 'No phone'}
        </Stack>
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ fontSize: 12, fontWeight: 700, color: md3.primary }}>
          <Icon name="mail" size={14} /> {booker?.email || 'No email on file'}
        </Stack>
      </Stack>
    );
    return (
      <ProposalTerminal backdrop={sheet()}>
        <MockPanel>
          <MockPanelHeader b={b} contact={contact} />
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '14px 16px' }}>
            <Box sx={{ mb: 1.5 }}>
              <WhatChanged>The booker is the group's contact: phone and email once, in the header. Players don't repeat them — tap a name for that person's own record.</WhatChanged>
            </Box>
            {seats(b).map((s) => (
              <FullRow key={s.i} s={s} />
            ))}
          </Box>
          <MockPanelFooter b={b} />
        </MockPanel>
      </ProposalTerminal>
    );
  },
  play: async ({ canvasElement }) => {
    const c = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-group-contact]')!);
    await expect(c.textContent).toMatch(/@|No email/);
  },
};
