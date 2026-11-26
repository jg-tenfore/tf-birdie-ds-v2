import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, BottomNavigation, BottomNavigationAction, Paper, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import GolfCourseOutlined from '@mui/icons-material/GolfCourseOutlined';
import PointOfSaleOutlined from '@mui/icons-material/PointOfSaleOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import { expect, within } from 'storybook/test';
import { mobileTheme } from '../../theme/mobile-theme';
import { md3 } from '../../theme/tokens';
import { Stack } from '../../pos/components/Stack';
import { NavigationBar } from '../../pos/mobile/chrome';
import { barFor } from '../../pos/mobile/bar-by-role';
import { MobileNavProvider, createNavState } from '../../pos/mobile/navigation';
import type { MobileTab } from '../../pos/mobile/navigation';
import type { StaffRole } from '../../pos/data/staff';

const meta = {
  title: 'Design System/Components/Navigation/Bottom Navigation',
  id: 'components-navigation-bottom-navigation',
  component: BottomNavigation,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          "MUI's `BottomNavigation`, shown for comparison. Birdie doesn't use it: the handheld's bar is its own MD3 " +
          '`NavigationBar` (`src/pos/mobile/chrome.tsx`), with a pill indicator, labels always shown and a badge, and its ' +
          'destinations depend on who is signed in (`barFor` in `src/pos/mobile/bar-by-role.ts`). See **In Birdie: the bar by role**.',
      },
    },
  },
  argTypes: {
    showLabels: {
      control: 'boolean',
      description: 'Always show labels for every action (not just the selected one).',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  args: {
    showLabels: false,
  },
} satisfies Meta<typeof BottomNavigation>;
export default meta;
type Story = StoryObj<typeof meta>;

function BottomNavDemo({ showLabels }: { showLabels?: boolean }) {
  const [value, setValue] = useState(0);
  return (
    <Paper elevation={2} sx={{ width: 360 }}>
      <BottomNavigation showLabels={showLabels} value={value} onChange={(_, v) => setValue(v)}>
        <BottomNavigationAction label="Tee Sheet" icon={<GolfCourseOutlined />} />
        <BottomNavigationAction label="Register" icon={<PointOfSaleOutlined />} />
        <BottomNavigationAction label="People" icon={<GroupOutlined />} />
        <BottomNavigationAction label="More" icon={<MenuOutlined />} />
      </BottomNavigation>
    </Paper>
  );
}

/** MUI's component with the golf bar's destinations. Toggle `showLabels`: by default it hides inactive labels, which Birdie's bar never does. */
export const Playground: Story = {
  render: (args) => <BottomNavDemo showLabels={args.showLabels} />,
};

/** MUI's component with every label shown — the closest it gets to Birdie's bar, still without the active pill. */
export const WithLabels: Story = {
  parameters: {
    docs: { description: { story: 'MUI `BottomNavigation` with `showLabels`. Compare it with Birdie’s own bar below: no pill indicator, no badge.' } },
  },
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <BottomNavDemo showLabels />
    </Box>
  ),
};

/** One role's bar, exactly as the handheld draws it: Birdie's `NavigationBar` in the handheld theme. */
function RoleBar({ role, title, at, badge }: { role: StaffRole; title: string; at: MobileTab; badge?: number }) {
  const tabs = barFor(role, true);
  return (
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: md3.onSurfaceVariant, mb: 0.75 }}>{title}</Typography>
      <Box sx={{ width: 360, bgcolor: md3.surface, borderRadius: 2, overflow: 'hidden', boxShadow: `inset 0 0 0 1px ${md3.outlineVariant}` }}>
        <MobileNavProvider initial={createNavState(at)}>
          <NavigationBar tabs={tabs} badges={badge ? { register: badge } : {}} />
        </MobileNavProvider>
      </Box>
    </Box>
  );
}

/**
 * **In Birdie: the bar by role.** Birdie's own `NavigationBar`, not MUI's: an MD3 bar with the active destination in a
 * green pill, labels always shown, and a badge where something is waiting. Which destinations it shows is decided by
 * `barFor(role)` from the same role grid as the tablet's main menu (V1 → V2): the pro shop's golf bar (here with three
 * lines on the open order), a server's restaurant bar, and a host's.
 */
export const InBirdieByRole: Story = {
  name: 'In Birdie: the bar by role',
  parameters: { layout: 'padded' },
  render: () => (
    <ThemeProvider theme={mobileTheme}>
      <Stack gap={3}>
        <RoleBar role="pro-shop" title="Pro shop (and manager): the golf bar" at="tee" badge={3} />
        <RoleBar role="server" title="Server or bartender" at="tables" />
        <RoleBar role="host" title="Host" at="tables" />
      </Stack>
    </ThemeProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bars = canvas.getAllByRole('navigation', { name: 'Main' });
    await expect(bars).toHaveLength(3);
    // The golf bar, a server's and a host's — More is last on every one.
    const labels = bars.map((bar) => within(bar).getAllByRole('button').map((b) => b.textContent?.replace(/^\d+/, '')));
    await expect(labels[0]).toEqual(['Tee Sheet', 'Register', 'People', 'More']);
    await expect(labels[1]).toEqual(['Tables', 'Tabs', 'Quick Order', 'More']);
    await expect(labels[2]).toEqual(['Tables', 'Reservations', 'More']);
    await expect(within(bars[0]).getByRole('button', { current: 'page' }).textContent).toContain('Tee Sheet');
  },
};
