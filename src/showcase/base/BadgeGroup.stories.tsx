import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { expect, within } from 'storybook/test';
import { md3 } from '../../theme/tokens';
import { ROUND_STEP } from '../../pos/data/config';
import { customers } from '../../pos/data/customers';
import { IdMeBadge } from '../../pos/components/IdMeBadge';
import { PaidPill } from '../../pos/components/PlayerRows';
import { MembershipChips, RoundStatusChip } from '../../pos/components/SeatChips';

const meta = {
  title: 'Design System/Components/Feedback & Status/Badge Group',
  id: 'components-feedback-status-badge-group',
  parameters: { layout: 'centered' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** A real seed record with more than fits, so MembershipChips shows its +N. */
const crowded = customers.find((c) => c.memberships.length + c.customerTypes.length > 2) ?? customers[0];

function PlayerRowGroup() {
  const [step, setStep] = useState<number>(ROUND_STEP.finished);
  return (
    <Stack
      direction="row"
      sx={{ alignItems: 'center', gap: 0.75, width: 620, p: '10px 12px', borderRadius: 3, bgcolor: md3.surfaceContainer, borderLeft: `4px solid ${md3.primary}` }}
    >
      <Typography sx={{ fontSize: 15.5, fontWeight: 800, whiteSpace: 'nowrap' }}>Foster, A.</Typography>
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: md3.onSurfaceVariant, letterSpacing: '.04em' }}>BOOKER</Typography>
      <IdMeBadge group="veteran" compact />
      <MembershipChips record={crowded} />
      <Box sx={{ flex: 1 }} />
      <RoundStatusChip step={step} onStep={setStep} label="Foster, A." />
      <PaidPill paid={false} noShow={false} />
    </Stack>
  );
}

/**
 * **A player row's group, as the tablet draws it** (PlayerRowsV2): name, BOOKER, the ID.me badge,
 * the membership chips with their +N; then, right-aligned, the round status chip and the seat's pill.
 * Who → what they hold → where they are → what they owe.
 */
export const BadgeGroup: Story = {
  render: () => <PlayerRowGroup />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('BOOKER')).toBeTruthy();
    await expect(c.getByText('UNPAID')).toBeTruthy();
    await expect(canvasElement.querySelector('[data-membership-chips]')).not.toBeNull();
  },
};

/** MUI Chips in a row, for reference. Birdie's groups are built from its own badges (above). */
export const MuiChipRow: Story = {
  name: 'MUI chips in a row',
  render: () => (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
      <Chip label="Social" size="small" />
      <Chip label="Senior" size="small" color="primary" />
      <Chip label="Riding" size="small" color="info" />
      <Chip label="No show" size="small" color="error" />
      <Chip label="Rain check" size="small" color="warning" />
    </Stack>
  ),
};
