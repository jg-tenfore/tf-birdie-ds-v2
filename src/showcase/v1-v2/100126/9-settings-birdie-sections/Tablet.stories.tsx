import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, ButtonBase, Switch, Typography } from '@mui/material';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { md3, radius } from '../../../../theme/tokens';
import { APP_IDENTITY } from '../../../../pos/data/nav';
import { Icon } from '../../../../pos/components/primitives';
import { Stack } from '../../../../pos/components/Stack';
import { Screen, atVenue } from '../../../pos/screen-helpers';
import { Chip, PillButton, ProposalTerminal, WhatChanged } from '../mock-kit';

/**
 * V1 → V2 Migration / 100126 / 9 · Settings: Birdie's real sections
 *
 * **Weston:** *"actually, these I don't think are settings that we have currently… We have device
 * info. We have connecting to a reader. Then we have Clover settings that I don't think we really use
 * much anymore… This is a good layout. We would just add those settings here."*
 *
 * **Original** — Settings as built for V1 → V2: Terminal & hardware, Checkout & receipts, Staff &
 * PINs, Tee sheet. Most of it is not in Birdie today.
 *
 * **Proposal** — the same layout, led by what Birdie has: **Device info**, **Card reader** (connected
 * reader, search, connect), and **Clover**, flagged as rarely used. The V1 → V2 sections stay below,
 * marked as proposals until Weston (or Buck) confirms the real list.
 */
const meta = {
  title: 'V1 → V2 Migration/100126/9 · Settings Birdie sections',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Today: the V1 → V2 sections. */
export const Original: Story = {
  render: () => <Screen edition="v1v2" initialState={atVenue('eighteen', { view: 'settings' })} />,
};

type Section = 'device' | 'reader' | 'clover' | 'teesheet';
const BIRDIE: { key: Section; label: string; icon: string; blurb: string }[] = [
  { key: 'device', label: 'Device info', icon: 'info', blurb: 'This tablet, the app, the account' },
  { key: 'reader', label: 'Card reader', icon: 'contactless', blurb: 'Connect and test the reader' },
  { key: 'clover', label: 'Clover', icon: 'point_of_sale', blurb: 'Rarely used — keep or drop?' },
  { key: 'teesheet', label: 'Tee sheet', icon: 'golf_course', blurb: 'Density, grid, behaviour' },
];
const PROPOSED = ['Checkout & receipts', 'Staff & PINs'];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ py: 1, borderBottom: `1px solid ${md3.outlineVariant}`, fontSize: 13 }}>
      <Typography sx={{ width: 200, fontSize: 13, color: md3.onSurfaceVariant }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{value}</Typography>
    </Stack>
  );
}

function BirdieSettings() {
  const [section, setSection] = useState<Section>('device');
  const [connected, setConnected] = useState(true);
  return (
    <Box data-birdie-settings sx={{ position: 'absolute', left: 56, top: 0, right: 0, bottom: 0, zIndex: 1300, bgcolor: md3.surface, display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" sx={{ height: 56, px: 1.75, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}` }}>
        <Typography sx={{ fontSize: 16, fontWeight: 800 }}>Settings</Typography>
      </Stack>
      <Stack direction="row" sx={{ flex: 1, minHeight: 0 }}>
        <Box sx={{ width: 250, borderRight: `1px solid ${md3.outlineVariant}`, p: 1.25, bgcolor: '#fff' }}>
          {BIRDIE.map((s) => {
            const on = s.key === section;
            return (
              <ButtonBase key={s.key} data-birdie-section={s.key} onClick={() => setSection(s.key)} sx={{ width: '100%', justifyContent: 'flex-start', gap: 1.25, p: '10px 12px', mb: 0.5, borderRadius: `${radius.md}px`, textAlign: 'left', bgcolor: on ? md3.primaryContainer : 'transparent' }}>
                <Icon name={s.icon} size={20} color={on ? md3.onPrimaryContainer : md3.onSurfaceVariant} />
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{s.label}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>{s.blurb}</Typography>
                </Box>
              </ButtonBase>
            );
          })}
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', color: md3.outline, m: '14px 12px 6px' }}>PROPOSED — NOT IN BIRDIE TODAY</Typography>
          {PROPOSED.map((p) => (
            <Stack key={p} direction="row" alignItems="center" gap={1} sx={{ p: '8px 12px', opacity: 0.6, fontSize: 13, fontWeight: 600 }}>
              <Icon name="hourglass_empty" size={16} /> {p}
            </Stack>
          ))}
        </Box>
        <Box sx={{ flex: 1, p: '20px 28px', overflowY: 'auto' }}>
          <Box sx={{ mb: 2, maxWidth: 720 }}>
            <WhatChanged>Settings leads with what Birdie has today — device info, the card reader, Clover. The V1 → V2 sections wait below until the real list is confirmed.</WhatChanged>
          </Box>
          {section === 'device' && (
            <Box sx={{ maxWidth: 640 }} data-panel="device">
              <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 1 }}>Device info</Typography>
              <Row label="Facility" value={APP_IDENTITY.facility} />
              <Row label="Account" value={APP_IDENTITY.account} />
              <Row label="App" value={`${APP_IDENTITY.product} · ${APP_IDENTITY.version}`} />
              <Row label="Device" value={APP_IDENTITY.device} />
              <Row label="Register" value="Register 1" />
              <Row label="Last synced" value="Thu, May 21 · 12:00 PM" />
              <Stack direction="row" gap={1} sx={{ mt: 2 }}>
                <PillButton icon="content_copy">Copy for support</PillButton>
              </Stack>
            </Box>
          )}
          {section === 'reader' && (
            <Box sx={{ maxWidth: 640 }} data-panel="reader">
              <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 1 }}>Card reader</Typography>
              <Stack direction="row" alignItems="center" gap={1.5} sx={{ p: '14px 16px', borderRadius: `${radius.md}px`, bgcolor: '#fff', border: `1.5px solid ${connected ? md3.primary : md3.outlineVariant}`, mb: 2 }} data-reader-status={connected ? 'connected' : 'none'}>
                <Icon name="contactless" size={26} color={connected ? md3.primary : md3.outline} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{connected ? 'Stripe Reader S700 · 0184' : 'No reader connected'}</Typography>
                  <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>{connected ? 'Connected · battery 82% · firmware 2.14' : 'Search for a reader nearby to connect it'}</Typography>
                </Box>
                {connected ? <PillButton onClick={() => setConnected(false)}>Disconnect</PillButton> : <Chip label="Not connected" tone="warn" />}
              </Stack>
              <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: md3.outline, mb: 1 }}>READERS NEARBY</Typography>
              {['Stripe Reader S700 · 0184', 'BBPOS WisePOS E · 2231'].map((r) => (
                <Stack key={r} direction="row" alignItems="center" sx={{ py: 1, borderBottom: `1px solid ${md3.outlineVariant}` }}>
                  <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{r}</Typography>
                  <PillButton onClick={() => setConnected(true)}>Connect</PillButton>
                </Stack>
              ))}
            </Box>
          )}
          {section === 'clover' && (
            <Box sx={{ maxWidth: 640 }} data-panel="clover">
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Clover</Typography>
                <Chip label="Rarely used" tone="warn" />
              </Stack>
              <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, mb: 1.5 }}>Weston: "Clover settings that I don't think we really use much anymore." Kept here until we decide to drop them.</Typography>
              {['Pair a Clover device', 'Print receipts through Clover', 'Send tips to Clover'].map((t) => (
                <Stack key={t} direction="row" alignItems="center" sx={{ py: 0.75, borderBottom: `1px solid ${md3.outlineVariant}` }}>
                  <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{t}</Typography>
                  <Switch />
                </Stack>
              ))}
            </Box>
          )}
          {section === 'teesheet' && (
            <Box sx={{ maxWidth: 640 }} data-panel="teesheet">
              <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 1 }}>Tee sheet</Typography>
              <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>Unchanged from today: the tee sheet's own display settings.</Typography>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

/** Led by Birdie's own sections: device info, card reader, Clover. */
export const Proposal: Story = {
  render: () => (
    <ProposalTerminal backdrop={atVenue('eighteen', { view: 'tee' })}>
      <BirdieSettings />
    </ProposalTerminal>
  ),
  play: async ({ canvasElement }) => {
    const s = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-birdie-settings]')!);
    await expect(s.querySelector('[data-panel="device"]')!.textContent).toContain(APP_IDENTITY.version);
    await userEvent.click(s.querySelector<HTMLElement>('[data-birdie-section="reader"]')!);
    await userEvent.click(within(s).getByRole('button', { name: 'Disconnect' }));
    await expect(s.querySelector('[data-reader-status]')!.getAttribute('data-reader-status')).toBe('none');
  },
};
