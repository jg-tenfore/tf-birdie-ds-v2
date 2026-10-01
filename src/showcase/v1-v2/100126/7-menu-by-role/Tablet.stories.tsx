import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import { expect, waitFor } from 'storybook/test';
import { md3, radius } from '../../../../theme/tokens';
import { APP_IDENTITY, NAV_GROUPS, type NavKey } from '../../../../pos/data/nav';
import { Icon } from '../../../../pos/components/primitives';
import { Stack } from '../../../../pos/components/Stack';
import { Screen, atVenue } from '../../../pos/screen-helpers';
import { Chip, ProposalTerminal, WhatChanged } from '../mock-kit';

/**
 * V1 → V2 Migration / 100126 / 7 · Menu by role
 *
 * Justin: *"we can segment based on permissions and employee capabilities. So you can make some of
 * these appear or not appear depending on the type of user… if it's just a bartender, right? She
 * doesn't need to see the tee sheet."* **Weston:** *"right now we have, for example, you could be like
 * pro shop and not see any of the restaurant."*
 *
 * **Original** — everyone sees every destination; the menu does not know who is signed in.
 *
 * **Proposal** — the menu shows what the signed-in role may use. Marcus, a bartender, sees the
 * Restaurant and the shared tools; the Pro Shop group, Events, Inventory, Shift and Settings are not
 * there at all (not dimmed — dimmed means "not built yet"). A manager edits the grid in Settings.
 */
const meta = {
  title: 'V1 → V2 Migration/100126/7 · Menu by role',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Today: every tile, whoever is signed in. */
export const Original: Story = {
  render: () => <Screen edition="v1v2" initialState={atVenue('eighteen', { view: 'tee', navOpen: true, operatorId: 's-4' })} />,
};

type Role = 'Manager' | 'Server' | 'Bartender' | 'Host' | 'Pro shop';
const ROLES: Role[] = ['Manager', 'Server', 'Bartender', 'Host', 'Pro shop'];
const RESTAURANT: NavKey[] = ['quickorder', 'tabs', 'tables', 'reservations', 'orderstips', 'tablechart'];
const PRO_SHOP: NavKey[] = ['proshop', 'teesheet', 'courtsheet', 'baysheet'];
const SHARED: NavKey[] = ['customersearch', 'orderlookup', 'timeclock', 'giftcards'];
/** The proposal's starting grid — a manager's to change. */
const ACCESS: Record<Role, NavKey[]> = {
  Manager: NAV_GROUPS.flatMap((g) => g.items.map((i) => i.key)),
  Server: [...RESTAURANT, ...SHARED],
  Bartender: [...RESTAURANT, ...SHARED],
  Host: ['tables', 'reservations', 'tablechart', 'customersearch', 'timeclock'],
  'Pro shop': [...PRO_SHOP, ...SHARED, 'events', 'inventory', 'shift'],
};

function RoleMenu({ role, who }: { role: Role; who: string }) {
  const allowed = new Set(ACCESS[role]);
  const hidden = NAV_GROUPS.flatMap((g) => g.items).filter((i) => !allowed.has(i.key)).length;
  return (
    <Box data-role-menu={role} sx={{ position: 'absolute', inset: 0, zIndex: 1000, bgcolor: md3.surfaceContainer, p: '16px 24px', overflowY: 'auto' }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{APP_IDENTITY.facility}</Typography>
          <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
            Signed in as <b>{who}</b> · {role}
          </Typography>
        </Box>
        <Chip label={`${hidden} not available to ${role.toLowerCase()}s`} tone="muted" icon="lock" />
      </Stack>
      <Box sx={{ mb: 2, maxWidth: 720 }}>
        <WhatChanged>The menu shows what this role uses. Destinations a {role.toLowerCase()} can't open aren't shown at all — a manager sets this in Settings › Staff & PINs.</WhatChanged>
      </Box>
      {NAV_GROUPS.map((g, gi) => {
        const items = g.items.filter((i) => allowed.has(i.key));
        if (!items.length) return null;
        return (
          <Box key={gi} sx={{ mb: 2 }}>
            {g.heading && <Typography sx={{ fontSize: 12, fontWeight: 800, color: md3.onSurfaceVariant, mb: 1 }}>{g.heading}</Typography>}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1.25 }}>
              {items.map((i) => (
                <Stack key={i.key} data-role-tile={i.key} alignItems="center" justifyContent="center" gap={0.75} sx={{ height: 96, borderRadius: `${radius.md}px`, border: `1px solid ${md3.outlineVariant}`, bgcolor: md3.onPrimary, fontSize: 14, fontWeight: 600 }}>
                  <Icon name={i.icon} size={26} color={md3.primary} />
                  {i.label}
                </Stack>
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/** Signed in as a bartender: only what a bartender uses. */
export const Proposal: Story = {
  render: () => (
    <ProposalTerminal backdrop={atVenue('eighteen', { view: 'tee' })}>
      <RoleMenu role="Bartender" who="Marcus Webb" />
    </ProposalTerminal>
  ),
  play: async ({ canvasElement }) => {
    const menu = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-role-menu]')!);
    await expect(menu.querySelector('[data-role-tile="teesheet"]')).toBeNull();
    await expect(menu.querySelector('[data-role-tile="tabs"]')).not.toBeNull();
  },
};

/** Where a manager sets it: Settings › Staff & PINs, roles across, destinations down. */
export const ProposalRoleGrid: Story = {
  name: 'Proposal · the role grid in Settings',
  render: () => {
    const items = NAV_GROUPS.flatMap((g) => g.items);
    return (
      <ProposalTerminal backdrop={atVenue('eighteen', { view: 'settings', settingsSection: 'staff' })}>
        <Box data-role-grid sx={{ position: 'absolute', left: 322, top: 56, right: 0, bottom: 0, zIndex: 1000, bgcolor: md3.surface, p: '20px 28px', overflowY: 'auto' }}>
          <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 0.5 }}>What each role can open</Typography>
          <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, mb: 1.5 }}>Managers only. The menu shows each person only what their role can open.</Typography>
          <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ textAlign: 'left', p: '6px 8px', fontSize: 11, color: md3.onSurfaceVariant }}>DESTINATION</Box>
                {ROLES.map((r) => (
                  <Box component="th" key={r} sx={{ p: '6px 8px', fontSize: 11, color: md3.onSurfaceVariant }}>{r.toUpperCase()}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {items.map((i) => (
                <Box component="tr" key={i.key} sx={{ borderTop: `1px solid ${md3.outlineVariant}` }}>
                  <Box component="td" sx={{ p: '5px 8px', fontWeight: 600 }}>{i.label}</Box>
                  {ROLES.map((r) => (
                    <Box component="td" key={r} sx={{ textAlign: 'center', p: '5px 8px' }}>
                      <Icon name={ACCESS[r].includes(i.key) ? 'check_circle' : 'remove'} size={16} color={ACCESS[r].includes(i.key) ? md3.primary : md3.outlineVariant} />
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </ProposalTerminal>
    );
  },
};
