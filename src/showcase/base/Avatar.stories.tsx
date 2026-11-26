import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarGroup, Stack, ThemeProvider, Typography } from '@mui/material';
import Person from '@mui/icons-material/Person';
import { expect, within } from 'storybook/test';
import { memberTypes, playerAccents } from '../../theme/tokens';
import type { MemberTypeKey } from '../../theme/tokens';
import { mobileTheme } from '../../theme/mobile-theme';
import { Avatar as LeagueAvatar } from '../../pos/components/league/LeagueParts';
import { PlayerAvatar } from '../../pos/mobile/screens/tee/parts';
import { SeatAvatar } from '../../pos/mobile/screens/register/parts';
import { GolferAvatar } from '../../pos/mobile/screens/people/parts';

const meta = {
  title: 'Design System/Components/Media & Visuals/Avatar',
  id: 'components-media-visuals-avatar',
  component: Avatar,
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
      <Avatar>JG</Avatar>
      <Avatar sx={{ bgcolor: 'primary.main' }}>IK</Avatar>
      <Avatar variant="rounded">GK</Avatar>
      <Avatar>
        <Person />
      </Avatar>
    </Stack>
  ),
};

export const Group: Story = {
  render: () => (
    <AvatarGroup max={4}>
      <Avatar>JG</Avatar>
      <Avatar>IK</Avatar>
      <Avatar>AB</Avatar>
      <Avatar>CD</Avatar>
      <Avatar>EF</Avatar>
    </AvatarGroup>
  ),
};

const PARTY = ['Foster, A.', 'Guest 2', 'Lann, O.', 'Reed, M.', 'Chen, E.'];

const Caption = ({ children }: { children: string }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'text.secondary', mt: 1 }}>
    {children}
  </Typography>
);

/**
 * **In Birdie.** No MUI Avatar anywhere: these are the product's own discs. Note the initials: the
 * tablet and tee screens give FA for "Foster, A.", the register and People give AF. On a reservation the
 * colour is the **seat** (`playerAccents`: green, blue, amber, violet, red), on both surfaces; in
 * People it is the **membership tier**. The tablet's player-row disc is inline in PlayerRows, so the
 * League's `Avatar` stands in for it here.
 */
export const InBirdie: Story = {
  name: 'In Birdie',
  render: () => (
    <Stack spacing={1}>
      <Caption>Tablet · League Avatar, seat colours</Caption>
      <Stack direction="row" spacing={1.5}>
        {PARTY.map((n, i) => (
          <LeagueAvatar key={n} name={n} color={playerAccents[i]} />
        ))}
      </Stack>
      <ThemeProvider theme={mobileTheme}>
        <Caption>Handheld · PlayerAvatar (tee screens), last one a no-show</Caption>
        <Stack direction="row" spacing={1.5}>
          {PARTY.map((n, i) => (
            <PlayerAvatar key={n} name={n} index={i} dim={i === 4} />
          ))}
        </Stack>
        <Caption>Handheld · SeatAvatar (register screens)</Caption>
        <Stack direction="row" spacing={1.5}>
          {PARTY.map((n, i) => (
            <SeatAvatar key={n} name={n} index={i} />
          ))}
        </Stack>
        <Caption>Handheld · GolferAvatar (People), by tier</Caption>
        <Stack direction="row" spacing={1.5}>
          {(Object.keys(memberTypes) as MemberTypeKey[]).map((t, i) => (
            <GolferAvatar key={t} golfer={{ name: PARTY[i], memberType: t }} />
          ))}
          <GolferAvatar golfer={{ name: 'Bennett, Laura', memberType: null }} />
        </Stack>
      </ThemeProvider>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // Two orders for the same name today: the tablet and tee screens write "Foster, A." as FA,
    // the register and People helpers put the first name first (AF). The Avatar page logs it.
    await expect(c.getAllByText('FA').length).toBeGreaterThanOrEqual(1);
    await expect(c.getAllByText('AF').length).toBeGreaterThanOrEqual(1);
  },
};
