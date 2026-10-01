import { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import { expect, userEvent, waitFor } from 'storybook/test';
import { md3, radius } from '../../../../theme/tokens';
import { Icon } from '../../../../pos/components/primitives';
import { Stack } from '../../../../pos/components/Stack';
import { Screen } from '../../../pos/screen-helpers';
import { ProposalTerminal } from '../mock-kit';
import { sheet } from '../scenarios';

/**
 * V1 → V2 Migration / 100126 / 12 · Course ⋮ menu bug
 *
 * Caught on the call (*"Well, that's a bug… let me get a picture of that"*) — Justin's screenshot
 * at 3:23 PM.
 *
 * **Original** — tap Front 9's ⋮ and its menu opens at the far right of the sheet, over the Back 9
 * columns. The menu is positioned against the whole header row rather than against its own button,
 * so every course's menu opens in the same place. Every edition has it.
 *
 * **Proposal** — the menu opens under the ⋮ that opened it, right-aligned to the button.
 */
const meta = {
  title: 'V1 → V2 Migration/100126/12 · Course menu bug',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const frontNineDots = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-testid="MoreVertIcon"]')?.closest<HTMLElement>('button') ?? null;

/** Today: Front 9's menu opens over Back 9. (The story opens it.) */
export const Original: Story = {
  render: () => <Screen edition="v1v2" initialState={sheet()} />,
  play: async ({ canvasElement }) => {
    const dots = await waitFor(() => {
      const d = frontNineDots(canvasElement);
      if (!d) throw new Error('no course menu yet');
      return d;
    });
    await userEvent.click(dots);
  },
};

const ITEMS: ({ section: string } | { icon: string; label: string; sub: string; danger?: boolean })[] = [
  { section: 'COURSE' },
  { icon: 'lock', label: 'Lock course', sub: 'Prevent new bookings' },
  { icon: 'sticky_note_2', label: 'Add note', sub: 'No note set' },
  { icon: 'schedule', label: 'Time settings', sub: '8 min · 6:00 AM–6:00 PM' },
  { icon: 'sell', label: 'Tee time prices', sub: 'By time band & rate' },
  { section: 'VIEW' },
  { icon: 'bar_chart', label: 'Course summary', sub: 'Stats & bookings panel' },
  { icon: 'fullscreen', label: 'Focus this course', sub: 'Hide other courses' },
  { icon: 'view_column', label: 'Show all courses', sub: 'Reset to all visible' },
  { section: 'DANGER' },
  { icon: 'visibility_off', label: 'Hide course', sub: 'Remove from tee sheet', danger: true },
];

/** The menu, placed under the Front 9 ⋮ that opened it. */
function AnchoredMenu() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  useEffect(() => {
    const t = window.setInterval(() => {
      const frame = ref.current?.parentElement;
      const dots = frame && frontNineDots(frame);
      if (!frame || !dots) return;
      const f = frame.getBoundingClientRect();
      const d = dots.getBoundingClientRect();
      const k = f.width / frame.offsetWidth || 1;
      setPos({ top: (d.bottom - f.top) / k + 4, right: (f.right - d.right) / k });
      window.clearInterval(t);
    }, 150);
    return () => window.clearInterval(t);
  }, []);
  return (
    <Box ref={ref} sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1200 }}>
      {pos && (
        <Box data-anchored-menu sx={{ position: 'absolute', top: pos.top, right: pos.right, width: 224, bgcolor: '#fff', border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, boxShadow: '0 4px 8px 3px rgba(0,0,0,.1)', overflow: 'hidden' }}>
          {ITEMS.map((it, i) =>
            'section' in it ? (
              <Typography key={i} sx={{ px: 1.5, pt: 1, pb: 0.5, fontSize: 10.5, fontWeight: 800, color: md3.outline, letterSpacing: '.05em' }}>{it.section}</Typography>
            ) : (
              <Stack key={i} direction="row" gap={1.25} sx={{ px: 1.5, py: 0.875, borderTop: `1px solid ${md3.surfaceContainer}` }}>
                <Icon name={it.icon} size={17} color={it.danger ? md3.error : md3.onSurfaceVariant} />
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: it.danger ? md3.error : md3.onSurface }}>{it.label}</Typography>
                  <Typography sx={{ fontSize: 11, color: md3.outline }}>{it.sub}</Typography>
                </Box>
              </Stack>
            ),
          )}
        </Box>
      )}
    </Box>
  );
}

/** Opens under its own ⋮. */
export const Proposal: Story = {
  render: () => (
    <ProposalTerminal backdrop={sheet()}>
      <AnchoredMenu />
    </ProposalTerminal>
  ),
  play: async ({ canvasElement }) => {
    const menu = await waitFor(() => {
      const m = canvasElement.querySelector<HTMLElement>('[data-anchored-menu]');
      if (!m) throw new Error('menu not placed yet');
      return m;
    });
    const dots = frontNineDots(canvasElement)!;
    // Right edge lines up with the button, within a pixel or two of scaling.
    await expect(Math.abs(menu.getBoundingClientRect().right - dots.getBoundingClientRect().right)).toBeLessThan(3);
  },
};
