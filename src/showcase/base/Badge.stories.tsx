import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, Stack, ThemeProvider, Typography } from '@mui/material';
import Notifications from '@mui/icons-material/Notifications';
import PointOfSaleOutlined from '@mui/icons-material/PointOfSaleOutlined';
import Restaurant from '@mui/icons-material/Restaurant';
import { expect, within } from 'storybook/test';
import { memberTypes, payBadges } from '../../theme/tokens';
import type { MemberTypeKey, PayState } from '../../theme/tokens';
import { mobileTheme } from '../../theme/mobile-theme';
import { MemberDot, PayBadge } from '../../pos/components/primitives';
import { PaidPill } from '../../pos/components/PlayerRows';
import { MemberBadge, StatusBadge } from '../../pos/mobile/screens/tee/parts';

const meta = {
  title: 'Design System/Components/Feedback & Status/Badge',
  id: 'components-feedback-status-badge',
  component: Badge,
  tags: ['autodocs'],
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Badge_: Story = {
  name: 'Badge',
  render: () => (
    <Stack direction="row" spacing={4} sx={{ alignItems: 'center' }}>
      <Badge badgeContent={4} color="primary">
        <Notifications />
      </Badge>
      <Badge badgeContent={12} color="error">
        <Restaurant />
      </Badge>
      <Badge variant="dot" color="success">
        <Notifications />
      </Badge>
    </Stack>
  ),
};

const PAY_STATES = Object.keys(payBadges) as PayState[];
const TIERS = Object.keys(memberTypes) as MemberTypeKey[];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack spacing={0.75}>
      <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'text.secondary' }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        {children}
      </Stack>
    </Stack>
  );
}

/**
 * **In Birdie.** The badges the product actually renders, from `src/pos`: the tablet's `PayBadge`
 * (both sizes) and `PaidPill`, the membership dot, and the handheld's `StatusBadge`, `MemberBadge`
 * and the Register tab's count. Every status is a word; the dot is the one exception.
 */
export const InBirdie: Story = {
  name: 'In Birdie',
  render: () => (
    <Stack spacing={2.5} sx={{ width: 600 }}>
      <Row label="PayBadge · tablet, md">
        {PAY_STATES.map((s) => (
          <PayBadge key={s} pay={s} />
        ))}
      </Row>
      <Row label="PayBadge · tablet, sm">
        {PAY_STATES.map((s) => (
          <PayBadge key={s} pay={s} size="sm" />
        ))}
      </Row>
      <Row label="PaidPill · one seat on a player row">
        <PaidPill paid noShow={false} />
        <PaidPill paid={false} noShow={false} />
        <PaidPill paid={false} noShow />
      </Row>
      <Row label="MemberDot · tier as colour only (hover for the name)">
        {TIERS.map((t) => (
          <Stack key={t} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <MemberDot memberType={t} />
            <Typography sx={{ fontSize: 12 }}>{memberTypes[t].label}</Typography>
          </Stack>
        ))}
      </Row>
      <ThemeProvider theme={mobileTheme}>
        <Row label="StatusBadge · handheld">
          {PAY_STATES.map((s) => (
            <StatusBadge key={s} pay={s} />
          ))}
        </Row>
        <Row label="MemberBadge · handheld, dot plus words">
          {TIERS.map((t) => (
            <MemberBadge key={t} type={t} />
          ))}
        </Row>
        <Row label="Count · the handheld Register tab">
          <Badge badgeContent={3} color="error" aria-label="Register, 3 lines">
            <PointOfSaleOutlined />
          </Badge>
        </Row>
      </ThemeProvider>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // The words come from the tokens, so every state renders its label on both surfaces.
    for (const s of PAY_STATES) await expect(c.getAllByText(payBadges[s].label).length).toBeGreaterThanOrEqual(3);
    await expect(c.getByText('UNPAID')).toBeTruthy();
  },
};
