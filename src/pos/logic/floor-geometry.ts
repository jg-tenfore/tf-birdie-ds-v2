import type { SeatOrientation, TableShape } from '../data/floor';

/**
 * Where the chairs go around a table (V1 → V2, Wave 2).
 *
 * Ported verbatim from v1 (`tf-birdie-ds-v1/src/components/screens/restaurant/floor-plan.tsx`),
 * which ported it from the table-editor prototype in `references/072926/10-tablechart/`. This is
 * the one piece of v1's floor plan worth keeping exactly: chairs distributed proportionally by edge
 * length on rectangles, evenly around the perimeter on circles, and a four-top special-cased so it
 * never puts two chairs on one side. It is what makes a six-top read as a six-top at a glance,
 * without a number on it — so it is carried over rather than reinvented.
 *
 * Positions are in the table's own box, before rotation; the renderer rotates the box.
 */

export const CHAIR_SIZE = 12;
export const CHAIR_GAP = 4;
export const CHAIR_RADIUS = 2.5;

export interface ChairPos {
  x: number;
  y: number;
  rotate: number;
}

export function chairPositions(shape: TableShape, seats: number, w: number, h: number, orientation?: SeatOrientation): ChairPos[] {
  const inset = CHAIR_SIZE + CHAIR_GAP;
  const tableLeft = inset;
  const tableTop = inset;
  const tableW = w - inset * 2;
  const tableH = h - inset * 2;
  const cx = w / 2;
  const cy = h / 2;
  const out: ChairPos[] = [];

  if (shape === 'circle' || shape === 'oval') {
    const rx = (w - 2 * CHAIR_GAP) / 2;
    const ry = (h - 2 * CHAIR_GAP) / 2;
    for (let i = 0; i < seats; i += 1) {
      const angle = (i / seats) * Math.PI * 2 - Math.PI / 2;
      out.push({
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
        rotate: (angle * 180) / Math.PI + 90,
      });
    }
    return out;
  }

  // Square / rectangle / diamond (a diamond is a rotated square).
  const top: ChairPos = { x: cx, y: CHAIR_GAP, rotate: 0 };
  const bottom: ChairPos = { x: cx, y: h - CHAIR_GAP, rotate: 180 };
  const right: ChairPos = { x: w - CHAIR_GAP, y: cy, rotate: 90 };
  const left: ChairPos = { x: CHAIR_GAP, y: cy, rotate: 270 };

  if (seats <= 4 && shape !== 'rectangle') {
    // Fill the chosen pair of edges first, then the other pair. With no
    // orientation this is top → bottom → right → left, which is what a
    // four-top looks like when nobody has said otherwise.
    const sides = orientation === 'vertical' ? [left, right, top, bottom] : [top, bottom, right, left];
    return sides.slice(0, seats);
  }

  // An explicit orientation overrides the edge-length rule: `horizontal` treats
  // top and bottom as the primary pair whatever the proportions say.
  const isWide = orientation ? orientation === 'horizontal' : tableW >= tableH;
  const longEdge = isWide ? tableW : tableH;
  const shortEdge = isWide ? tableH : tableW;
  const total = longEdge * 2 + shortEdge * 2;

  let longEach = Math.ceil(Math.round(seats * (longEdge / total)) / 2);
  let shortEach = Math.floor(Math.round(seats * (shortEdge / total)) / 2);

  let guard = 0;
  while (longEach * 2 + shortEach * 2 < seats && guard < 40) {
    if (longEach <= shortEach + 1) longEach += 1;
    else shortEach += 1;
    guard += 1;
  }

  for (let i = 0; i < longEach; i += 1) {
    const t = (i + 1) / (longEach + 1);
    if (isWide) {
      out.push({ x: tableLeft + t * tableW, y: CHAIR_GAP, rotate: 0 });
      out.push({ x: tableLeft + t * tableW, y: h - CHAIR_GAP, rotate: 180 });
    } else {
      out.push({ x: CHAIR_GAP, y: tableTop + t * tableH, rotate: 270 });
      out.push({ x: w - CHAIR_GAP, y: tableTop + t * tableH, rotate: 90 });
    }
  }
  for (let i = 0; i < shortEach; i += 1) {
    const t = (i + 1) / (shortEach + 1);
    if (isWide) {
      out.push({ x: CHAIR_GAP, y: tableTop + t * tableH, rotate: 270 });
      out.push({ x: w - CHAIR_GAP, y: tableTop + t * tableH, rotate: 90 });
    } else {
      out.push({ x: tableLeft + t * tableW, y: CHAIR_GAP, rotate: 0 });
      out.push({ x: tableLeft + t * tableW, y: h - CHAIR_GAP, rotate: 180 });
    }
  }

  return out.slice(0, seats);
}
