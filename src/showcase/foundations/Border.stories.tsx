import type { CSSProperties, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { md3, playerAccents, radius } from '../../theme/tokens';
import { Group, Sheet, Table, mono } from './foundation-parts';

/**
 * Design System › Styles › Border.
 *
 * The lines Birdie draws, each on the kind of thing that carries it. Widths and colours are the
 * ones in `theme.ts` and `src/pos`; the write-up is
 * `src/showcase/ds-docs/content/foundations-border.tsx`.
 */

const box: CSSProperties = { width: 150, height: 54, borderRadius: radius.md, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: md3.onSurfaceVariant };

function BorderSheet() {
  const rows: [ReactNode, string, string, string][] = [
    [<div key="a" style={{ ...box, border: `1.5px solid ${md3.outlineVariant}` }}>Card · chip · input</div>, '1.5px solid md3.outlineVariant', 'The outline. Every card, chip, input, outlined button, menu, toggle and tile on the tablet (theme.ts sets it on MuiButton, MuiChip, MuiOutlinedInput, MuiCard, MuiMenu, MuiToggleButton).', 'Tablet'],
    [<div key="b" style={{ ...box, borderRadius: 0, borderBottom: `1px solid ${md3.outlineVariant}` }}>Rule below</div>, '1px solid md3.outlineVariant', 'A rule between things, not around one: a dialog\'s header and footer, list rows, the day summary\'s edge. MuiDivider is this colour.', 'Both'],
    [<div key="c" style={{ ...box, border: `1.5px solid ${md3.primary}` }}>Unpaid chip</div>, '1.5px solid md3.primary', 'Selected or owed: a selected toggle, and the unpaid tee-sheet chip (white with a green outline: someone still owes).', 'Tablet'],
    [<div key="d" style={{ ...box, borderRadius: radius.sm, background: md3.primary, color: '#fff', outline: `2.5px solid ${md3.onSurface}`, outlineOffset: 1 }}>Selected chip</div>, '2.5px outline md3.onSurface, 1px offset', 'The selected booking on the tee sheet. An outline, not a border, so the chip does not shift.', 'Tablet'],
    [<div key="e" style={{ ...box, borderRadius: radius.sm, background: md3.primary, color: '#fff', outline: '3px solid #2563eb', outlineOffset: 2, boxShadow: '0 0 0 5px rgba(37,99,235,.18)' }}>Multi-select</div>, '3px outline #2563eb + 5px ring', 'Bookings picked in multi-select (move or cancel several). Blue so it cannot be read as paid.', 'Tablet'],
    [<div key="f" style={{ ...box, border: `1.5px dashed ${md3.outlineVariant}` }}>+ Add player</div>, '1.5px dashed md3.outlineVariant', 'A place to add something: an empty player slot, the order rail\'s "Add items".', 'Tablet'],
    [<div key="g" style={{ ...box, justifyContent: 'flex-start', paddingLeft: 12, border: `1.5px solid ${md3.outlineVariant}`, borderLeftWidth: 4, borderLeftColor: playerAccents[1] }}>Player 2</div>, '3–4px left, an accent colour', 'Whose row this is: player rows (the player\'s accent), the golf summary and a loaded booking (green), day-summary stats.', 'Both'],
    [<div key="h" style={{ ...box, border: `2px solid ${md3.error}`, background: '#fff5f4', color: md3.error }}>Allergy</div>, '2px solid md3.error', 'Something that must not be missed: an allergy alert on a dish.', 'Both'],
    [<div key="i" style={{ ...box, borderRadius: 999, border: `1px solid ${md3.outline}`, height: 40, color: md3.primary }}>Handheld button</div>, '1px solid md3.outline', "The handheld's outlined buttons (MD3, mobile-theme.ts). Its text fields inherit the tablet's 1.5px outline-variant instead, because mobile-theme.ts deep-merges the tablet theme.", 'Handheld'],
  ];
  return (
    <Sheet>
      <Group title="The lines" intro="1.5px around a thing, 1px between things. Colour changes only when the line means something: selected, owed, whose, or danger.">
        <Table
          head={['Sample', 'Line', 'Use', 'Surface']}
          widths={[180, 210, 'auto', 90]}
          rows={rows.map(([sample, line, use, surface]) => [
            sample,
            <span key="l" style={{ fontFamily: mono, fontSize: 12 }}>{line}</span>,
            <span key="u" style={{ fontSize: 12.5 }}>{use}</span>,
            <span key="s" style={{ fontSize: 12.5 }}>{surface}</span>,
          ])}
        />
      </Group>
    </Sheet>
  );
}

const meta = {
  title: 'Design System/Styles/Border',
  id: 'foundations-border',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Border_: Story = {
  name: 'Border',
  render: () => <BorderSheet />,
  parameters: { docs: { description: { story: 'Each line Birdie draws, on the thing that carries it.' } } },
};
