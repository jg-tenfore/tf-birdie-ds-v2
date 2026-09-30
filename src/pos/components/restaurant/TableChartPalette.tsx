import type { ReactNode } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import type { TableShape } from '../../data/floor';
import type { PaletteKey } from '../../logic/floor-editor';
import { SectionLabel } from '../primitives';
import { Stack } from '../Stack';

/**
 * Table Chart's palette: what can be added to a room (V1 → V2, Wave 2).
 *
 * v1's rail, kept: the five table shapes, then the three things that are not tables. **Tap to
 * add** — v1's reasoning, and right: dragging from a rail onto a canvas is the desktop gesture,
 * and on a tablet with no hover it is the unreliable one. A new element lands in the first clear
 * spot in the room, already selected, so the next thing a finger does is drag it where it goes.
 *
 * Each entry is labelled in words under its glyph. v1's rail was glyphs alone, which works for a
 * round table and does not for a barrier versus a region.
 */

const TABLES: { key: TableShape; label: string; name: string }[] = [
  { key: 'circle', label: 'Round', name: 'round table' },
  { key: 'square', label: 'Square', name: 'square table' },
  { key: 'rectangle', label: 'Long', name: 'long table' },
  { key: 'oval', label: 'Oval', name: 'oval table' },
  { key: 'diamond', label: 'Diamond', name: 'diamond table' },
];

const ITEMS: { key: PaletteKey; label: string; name: string }[] = [
  { key: 'barrier', label: 'Barrier', name: 'barrier' },
  { key: 'region', label: 'Region', name: 'region' },
  { key: 'label', label: 'Label', name: 'label' },
];

export function TableChartPalette({ onAdd }: { onAdd: (key: PaletteKey) => void }) {
  return (
    <Stack
      data-floor-palette
      sx={{
        width: 92,
        flexShrink: 0,
        bgcolor: '#fff',
        borderRight: `1px solid ${md3.outlineVariant}`,
        py: 1.25,
        px: 0.75,
        gap: 0.5,
        overflowY: 'auto',
      }}
    >
      <SectionLabel color={md3.outline} sx={{ textAlign: 'center', mb: 0.25 }}>
        Tables
      </SectionLabel>
      {TABLES.map((t) => (
        <PaletteButton key={t.key} label={t.label} name={t.name} onClick={() => onAdd(t.key)}>
          <PaletteGlyph kind={t.key} />
        </PaletteButton>
      ))}
      <SectionLabel color={md3.outline} sx={{ textAlign: 'center', mt: 1, mb: 0.25 }}>
        Items
      </SectionLabel>
      {ITEMS.map((t) => (
        <PaletteButton key={t.key} label={t.label} name={t.name} onClick={() => onAdd(t.key)}>
          <PaletteGlyph kind={t.key} />
        </PaletteButton>
      ))}
    </Stack>
  );
}

function PaletteButton({ label, name, onClick, children }: { label: string; name: string; onClick: () => void; children: ReactNode }) {
  return (
    <ButtonBase
      aria-label={`Add a ${name}`}
      data-palette-item
      onClick={onClick}
      sx={{
        flexDirection: 'column',
        gap: 0.25,
        minHeight: 64,
        borderRadius: `${radius.md}px`,
        color: md3.onSurfaceVariant,
        '&:active': { bgcolor: md3.primaryContainer },
      }}
    >
      {children}
      <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1 }}>{label}</Typography>
    </ButtonBase>
  );
}

/**
 * The palette's drawings, ported from v1. Purpose-drawn rather than a shrunken table — v1's note:
 * the real renderer insets the body by a chair on every side, so at rail size the body all but
 * vanishes and the chairs read as loose blobs.
 */
const SEAT = 5;
const seatMarks = (points: [number, number][]) =>
  points.map(([x, y]) => <rect key={`${x}-${y}`} x={x - SEAT / 2} y={y - SEAT / 2} width={SEAT} height={SEAT} rx={1} fill="currentColor" />);
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2 } as const;

export function PaletteGlyph({ kind }: { kind: PaletteKey }) {
  const svg = (children: ReactNode) => (
    <Box component="svg" width={40} height={40} viewBox="0 0 44 44" sx={{ display: 'block', color: md3.onSurfaceVariant }} aria-hidden>
      {children}
    </Box>
  );
  switch (kind) {
    case 'circle':
      return svg(
        <>
          <circle cx={22} cy={22} r={10} {...stroke} />
          {seatMarks([[22, 7], [37, 22], [22, 37], [7, 22]])}
        </>,
      );
    case 'square':
      return svg(
        <>
          <rect x={12} y={12} width={20} height={20} rx={2} {...stroke} />
          {seatMarks([[22, 6], [38, 22], [22, 38], [6, 22]])}
        </>,
      );
    case 'rectangle':
      return svg(
        <>
          <rect x={7} y={15} width={30} height={14} rx={2} {...stroke} />
          {seatMarks([[15, 9], [29, 9], [15, 35], [29, 35]])}
        </>,
      );
    case 'oval':
      return svg(
        <>
          <ellipse cx={22} cy={22} rx={14} ry={8} {...stroke} />
          {seatMarks([[16, 10], [28, 10], [16, 34], [28, 34]])}
        </>,
      );
    case 'diamond':
      return svg(
        <>
          <rect x={13} y={13} width={18} height={18} rx={2} transform="rotate(45 22 22)" {...stroke} />
          {seatMarks([[22, 5], [39, 22], [22, 39], [5, 22]])}
        </>,
      );
    case 'barrier':
      return svg(<rect x={6} y={19} width={32} height={6} rx={1.5} fill="#374151" />);
    case 'region':
      return svg(<rect x={6} y={11} width={32} height={22} rx={4} fill={`${md3.primary}14`} stroke={`${md3.primary}88`} strokeWidth={1.5} strokeDasharray="3 2" />);
    case 'label':
      return svg(
        <>
          <rect x={4} y={14} width={36} height={16} rx={8} fill="#fff" stroke={md3.outline} strokeWidth={1.5} strokeDasharray="3 2" />
          <text x={22} y={25.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="currentColor">
            Aa
          </text>
        </>,
      );
  }
}
