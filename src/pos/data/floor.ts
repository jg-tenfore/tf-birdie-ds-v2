/**
 * The restaurant floor: rooms, and what stands in them (V1 → V2, Wave 2).
 *
 * One model for two screens. **Table Chart** edits it; **Tables** renders it live. v1 got to the
 * same place the hard way: its two screens began with separate hard-coded layouts, so arranging a
 * room in the editor changed nothing an operator ever saw, and v1's own note calls that out. Here
 * there is only ever one copy — `state.floor` — and the live floor reads the saved version of it.
 *
 * ## Elements
 *
 * v1's element model, from `tf-birdie-ds-v1/src/components/screens/restaurant/floor-plan.tsx`:
 * one element type, four kinds, all sharing `x / y / w / h` so selection, dragging and resizing
 * work identically on each.
 *
 * - **table** — a number, a shape and a seat count.
 * - **barrier** — a bare bar: a wall, the bar top, a railing.
 * - **region** — a shaded, named area: "Window", "Private dining". v1 called these boxes.
 * - **label** — free text on the plan: "Host stand".
 *
 * Added in V1 → V2: **`rotation`**, in degrees. v1 had none; the full editor was asked for with
 * rotation, and a long table angled into a corner is common enough to be worth it.
 *
 * ## Status is not stored here
 *
 * v1 kept a `status` on each table. That is a second source of truth — the table saying "seated"
 * while no tab exists, or the reverse — and this app has been bitten by exactly that shape of bug
 * before. A table's status is **derived** from the open tabs and today's reservations; see
 * `logic/restaurant.ts`. The only stored state is the one a person sets: out of service.
 *
 * Coordinates are in floor units on a 20-unit grid, on a canvas of `FLOOR_W × FLOOR_H`.
 */

export type ElementKind = 'table' | 'barrier' | 'region' | 'label';

/** v1's five shapes. A diamond is a square rotated 45°, drawn as such. */
export type TableShape = 'square' | 'circle' | 'rectangle' | 'oval' | 'diamond';

/** Which pair of edges seats sit on. Unset follows the longer pair — see `chairPositions`. */
export type SeatOrientation = 'horizontal' | 'vertical';

export interface FloorElement {
  id: string;
  kind: ElementKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise. New in V1 → V2. */
  rotation?: number;
  /** Tables. */
  shape?: TableShape;
  /** The number a server calls out. Unique across every room. */
  num?: string;
  seats?: number;
  seatOrientation?: SeatOrientation;
  /** Round tables resize proportionally, or they stop being round. */
  lockAspect?: boolean;
  /** Set by a person; the one table state that is not derived. */
  outOfService?: boolean;
  /** Labels and regions. */
  text?: string;
}

export interface Room {
  id: string;
  name: string;
  elements: FloorElement[];
}

export const FLOOR_W = 1000;
export const FLOOR_H = 620;
export const FLOOR_GRID = 20;

/** v1's limits: a single seat is a bar stool. */
export const SEAT_RANGE = { min: 1, max: 16 };

export const clampSeats = (n: number | undefined): number =>
  n == null || Number.isNaN(n) ? SEAT_RANGE.min : Math.max(SEAT_RANGE.min, Math.min(SEAT_RANGE.max, Math.round(n)));

const table = (
  id: string,
  num: string,
  shape: TableShape,
  x: number,
  y: number,
  w: number,
  h: number,
  seats: number,
  extra: Partial<FloorElement> = {},
): FloorElement => ({
  id,
  kind: 'table',
  num,
  shape,
  x,
  y,
  w,
  h,
  seats,
  lockAspect: shape === 'circle' || shape === 'square' || shape === 'diamond',
  ...extra,
});

/**
 * Three believable rooms for a clubhouse: the 19th Hole dining room, the patio, and the bar.
 *
 * Authored for V1 → V2 rather than ported — v1's seeded layout was its own too. Table numbers are
 * unique across the building, prefixed by room where a server would say it that way ("P3", "B6").
 */
export const SEED_ROOMS: Room[] = [
  {
    id: 'dining',
    name: 'Dining Room',
    elements: [
      { id: 'dining-window', kind: 'region', x: 40, y: 40, w: 580, h: 140, text: 'Window' },
      table('d-1', '1', 'circle', 60, 60, 100, 100, 4),
      table('d-2', '2', 'circle', 200, 60, 100, 100, 4),
      table('d-3', '3', 'circle', 340, 60, 100, 100, 4),
      table('d-4', '4', 'circle', 480, 60, 100, 100, 4),
      table('d-5', '5', 'square', 60, 240, 80, 80, 2),
      table('d-6', '6', 'square', 180, 240, 80, 80, 2),
      table('d-7', '7', 'square', 300, 240, 80, 80, 2),
      table('d-8', '8', 'rectangle', 60, 380, 220, 100, 6),
      table('d-9', '9', 'rectangle', 320, 380, 220, 100, 6),
      table('d-10', '10', 'oval', 680, 60, 240, 140, 8),
      table('d-11', '11', 'diamond', 440, 240, 90, 90, 4),
      table('d-12', '12', 'rectangle', 680, 280, 100, 240, 8, { rotation: 0 }),
      { id: 'dining-service', kind: 'barrier', x: 820, y: 280, w: 20, h: 260 },
      { id: 'dining-host', kind: 'label', x: 600, y: 560, w: 140, h: 36, text: 'Host stand' },
    ],
  },
  {
    id: 'patio',
    name: 'Patio',
    elements: [
      { id: 'patio-rail', kind: 'barrier', x: 40, y: 40, w: 920, h: 16 },
      table('p-1', 'P1', 'circle', 80, 100, 100, 100, 4),
      table('p-2', 'P2', 'circle', 240, 100, 100, 100, 4),
      table('p-3', 'P3', 'circle', 400, 100, 100, 100, 4),
      table('p-4', 'P4', 'circle', 560, 100, 100, 100, 4),
      table('p-5', 'P5', 'rectangle', 80, 300, 240, 100, 6),
      table('p-6', 'P6', 'rectangle', 380, 300, 240, 100, 6, { rotation: 0 }),
      { id: 'patio-firepit', kind: 'region', x: 700, y: 260, w: 220, h: 200, text: 'Fire pit' },
      { id: 'patio-label', kind: 'label', x: 80, y: 520, w: 180, h: 36, text: 'Faces the 18th green' },
    ],
  },
  {
    id: 'bar',
    name: 'Bar',
    elements: [
      { id: 'bar-top', kind: 'barrier', x: 120, y: 80, w: 640, h: 30 },
      // 60 units, not 44: the chair inset leaves a 44-unit stool almost no body, and its number sat on
      // its own chair. Reported by the engineer building Table Chart.
      ...Array.from({ length: 8 }, (_, i) => table(`b-${i + 1}`, `B${i + 1}`, 'circle', 125 + i * 78, 124, 60, 60, 1)),
      table('h-1', 'H1', 'square', 160, 320, 90, 90, 4),
      table('h-2', 'H2', 'square', 320, 320, 90, 90, 4),
      table('h-3', 'H3', 'square', 480, 320, 90, 90, 4),
      { id: 'bar-label', kind: 'label', x: 640, y: 340, w: 150, h: 36, text: 'High-tops' },
    ],
  },
];

/** Every table in every room, with the room it is in. */
export function allTables(rooms: Room[]): { room: Room; table: FloorElement }[] {
  return rooms.flatMap((room) => room.elements.filter((e) => e.kind === 'table').map((t) => ({ room, table: t })));
}
