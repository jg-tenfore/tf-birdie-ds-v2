import { useRef, type ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { md3 } from '../../../theme/tokens';
import { FLOOR_H, FLOOR_W, type FloorElement, type Room } from '../../data/floor';
import { CHAIR_RADIUS, CHAIR_SIZE, chairPositions } from '../../logic/floor-geometry';
import type { TableStatus } from '../../logic/restaurant';
import { TABLE_STATUS_STYLE, useFitScale } from './floor-style';

/**
 * The floor, drawn (V1 → V2, Wave 2).
 *
 * **One renderer for both screens.** Table Chart edits the plan and Tables shows it live, and both
 * draw it with this. v1 began with the two screens holding separate hard-coded layouts — v1's own
 * note: moving a table in the editor "changed nothing an operator would ever see". Drawing it once
 * is the other half of storing it once.
 *
 * `FloorElementView` draws one element in floor units scaled to pixels, rotated about its centre,
 * with chairs placed by v1's ported geometry (`logic/floor-geometry.ts`). `FloorPlan` draws a room.
 * The editor builds on `FloorElementView` directly, so what it shows while dragging is what the
 * live floor will show.
 */

export function FloorElementView({
  el,
  scale,
  status,
  selected,
  onClick,
  badge,
  dataAttr = true,
}: {
  el: FloorElement;
  scale: number;
  /** Tables only. Unset draws the plain editing style. */
  status?: TableStatus;
  selected?: boolean;
  onClick?: (el: FloorElement) => void;
  /** A small overlay on a table — a server's initials, a guest count, a timer. */
  badge?: ReactNode;
  dataAttr?: boolean;
}) {
  const px = (n: number) => n * scale;
  const common = {
    position: 'absolute' as const,
    left: px(el.x),
    top: px(el.y),
    width: px(el.w),
    height: px(el.h),
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    transformOrigin: 'center center',
    outline: selected ? `2px solid ${md3.primary}` : 'none',
    outlineOffset: 3,
    cursor: onClick ? 'pointer' : 'default',
  };
  const click = onClick ? () => onClick(el) : undefined;
  const attrs = dataAttr ? { 'data-floor-element': el.id, 'data-floor-kind': el.kind } : {};

  if (el.kind === 'barrier') {
    return <Box {...attrs} onClick={click} sx={{ ...common, bgcolor: '#374151', borderRadius: `${px(4)}px` }} />;
  }

  if (el.kind === 'region') {
    return (
      <Box
        {...attrs}
        onClick={click}
        sx={{
          ...common,
          bgcolor: `${md3.primary}0f`,
          border: `1.5px dashed ${md3.primary}55`,
          borderRadius: `${px(10)}px`,
          p: `${px(6)}px ${px(10)}px`,
        }}
      >
        <Typography sx={{ fontSize: Math.max(10, px(13)), fontWeight: 700, color: `${md3.primary}aa` }}>{el.text}</Typography>
      </Box>
    );
  }

  if (el.kind === 'label') {
    return (
      <Box
        {...attrs}
        onClick={click}
        sx={{
          ...common,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1.5px dashed ${md3.outline}`,
          borderRadius: 999,
          bgcolor: '#fff',
        }}
      >
        <Typography sx={{ fontSize: Math.max(10, px(13)), fontWeight: 600, color: md3.onSurfaceVariant }} noWrap>
          {el.text}
        </Typography>
      </Box>
    );
  }

  // A table: chairs, then the body, then its number.
  const tone = status ? TABLE_STATUS_STYLE[status] : { bg: '#fff', border: md3.outline, text: md3.onSurface };
  const shape = el.shape ?? 'square';
  const chairs = chairPositions(shape, el.seats ?? 1, el.w, el.h, el.seatOrientation);
  const inset = CHAIR_SIZE + 4;
  const round = shape === 'circle' || shape === 'oval';

  return (
    <Box
      {...attrs}
      data-table-status={status}
      onClick={click}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `Table ${el.num}${status ? `, ${TABLE_STATUS_STYLE[status].label.toLowerCase()}` : ''}` : undefined}
      sx={common}
    >
      {chairs.map((c, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            left: px(c.x - CHAIR_SIZE / 2),
            top: px(c.y - CHAIR_SIZE / 2),
            width: px(CHAIR_SIZE),
            height: px(CHAIR_SIZE),
            borderRadius: `${px(CHAIR_RADIUS)}px`,
            bgcolor: status === 'blocked' ? '#d1d5db' : md3.outlineVariant,
            transform: `rotate(${c.rotate}deg)`,
          }}
        />
      ))}
      <Box
        sx={{
          position: 'absolute',
          left: px(inset),
          top: px(inset),
          width: px(el.w - inset * 2),
          height: px(el.h - inset * 2),
          bgcolor: tone.bg,
          border: `2px solid ${tone.border}`,
          borderRadius: round ? '50%' : `${px(8)}px`,
          transform: shape === 'diamond' ? 'rotate(45deg)' : undefined,
          backgroundImage:
            status === 'blocked'
              ? 'repeating-linear-gradient(135deg, transparent 0 6px, rgba(0,0,0,.07) 6px 12px)'
              : undefined,
        }}
      />
      {/* The number stays upright however the table is turned. */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: el.rotation ? `rotate(${-el.rotation}deg)` : undefined,
          pointerEvents: 'none',
        }}
      >
        <Typography sx={{ fontSize: Math.max(11, px(18)), fontWeight: 800, color: tone.text, lineHeight: 1 }}>{el.num}</Typography>
        {badge}
      </Box>
    </Box>
  );
}

/** A whole room, fitted to its container. */
export function FloorPlan({
  room,
  statusOf,
  selectedId,
  onTableClick,
  badgeOf,
}: {
  room: Room;
  statusOf?: (table: FloorElement) => TableStatus;
  selectedId?: string | null;
  onTableClick?: (table: FloorElement) => void;
  badgeOf?: (table: FloorElement) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scale = useFitScale(ref);
  // Regions under everything, then barriers and labels, then tables on top — the order a room is read.
  const order = { region: 0, barrier: 1, label: 2, table: 3 } as const;
  const elements = [...room.elements].sort((a, b) => order[a.kind] - order[b.kind]);

  return (
    <Box ref={ref} sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }} data-floor-room={room.id}>
      <Box sx={{ position: 'relative', width: FLOOR_W * scale, height: FLOOR_H * scale, mx: 'auto' }}>
        {elements.map((el) => (
          <FloorElementView
            key={el.id}
            el={el}
            scale={scale}
            status={el.kind === 'table' ? statusOf?.(el) : undefined}
            selected={el.id === selectedId}
            onClick={el.kind === 'table' ? onTableClick : undefined}
            badge={el.kind === 'table' ? badgeOf?.(el) : undefined}
          />
        ))}
      </Box>
    </Box>
  );
}
