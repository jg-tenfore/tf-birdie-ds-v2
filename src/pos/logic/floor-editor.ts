import {
  FLOOR_GRID,
  FLOOR_H,
  FLOOR_W,
  allTables,
  clampSeats,
  type FloorElement,
  type Room,
  type SeatOrientation,
  type TableShape,
} from '../data/floor';
import { openTabOn, tableLabel, type DiningReservation, type Tab } from './restaurant';

/**
 * The rules of the Table Chart editor (V1 → V2, Wave 2). Pure, so the canvas, the inspector and
 * the tests all agree on what a drag, a resize or a renumbering does.
 *
 * v1's editor (`tf-birdie-ds-v1/app/src/screens/table-chart.tsx`) did all of this inline in its
 * pointer handlers, and three of its bugs lived in that inline arithmetic: a new table was
 * numbered by counting the room's tables, so deleting one and adding one produced a duplicate;
 * Duplicate numbered the copy `"5·2"`; and nothing ever checked that a number was unique, so two
 * tables called "5" could be saved and a server could not say which was which. Here the rules are
 * named functions with tests.
 *
 * Everything is in floor units (`FLOOR_W × FLOOR_H`, a `FLOOR_GRID` grid). The canvas converts
 * pointer pixels to floor units before calling in, so none of this knows how big the screen is.
 */

// ─── The grid ───────────────────────────────────────────────────────────────

export const snap = (n: number, grid = FLOOR_GRID): number => Math.round(n / grid) * grid;

/** The rotate handle's step. Fine enough to angle a table into a corner, coarse enough to hit 90°. */
export const ROTATION_STEP = 15;

/** Degrees into `[0, 360)`. */
export const normalizeDeg = (deg: number): number => ((Math.round(deg) % 360) + 360) % 360;

export const snapRotation = (deg: number): number => normalizeDeg(Math.round(deg / ROTATION_STEP) * ROTATION_STEP);

const rad = (deg: number) => (deg * Math.PI) / 180;

export const centerOf = (el: Pick<FloorElement, 'x' | 'y' | 'w' | 'h'>) => ({ x: el.x + el.w / 2, y: el.y + el.h / 2 });

/**
 * The rotation that points the rotate handle at `pointer`. The handle sits above the element's
 * top edge, so at 0° it points straight up — hence the quarter turn.
 */
export function rotationFromPointer(center: { x: number; y: number }, pointer: { x: number; y: number }): number {
  const deg = (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI + 90;
  return snapRotation(deg);
}

/** Half the width and height of the box a rotated element actually covers. */
export function rotatedExtents(el: Pick<FloorElement, 'w' | 'h' | 'rotation'>): { ex: number; ey: number } {
  const c = Math.abs(Math.cos(rad(el.rotation ?? 0)));
  const s = Math.abs(Math.sin(rad(el.rotation ?? 0)));
  return { ex: (el.w * c + el.h * s) / 2, ey: (el.w * s + el.h * c) / 2 };
}

/**
 * Keep what an element covers on the floor. Rotation is accounted for, so a long table turned 45°
 * cannot be pushed until its corner is off the edge. An element too big for the floor is centred.
 */
export function clampToFloor(el: FloorElement): FloorElement {
  const { ex, ey } = rotatedExtents(el);
  const c = centerOf(el);
  const cx = ex * 2 >= FLOOR_W ? FLOOR_W / 2 : Math.min(FLOOR_W - ex, Math.max(ex, c.x));
  const cy = ey * 2 >= FLOOR_H ? FLOOR_H / 2 : Math.min(FLOOR_H - ey, Math.max(ey, c.y));
  return { ...el, x: Math.round(cx - el.w / 2), y: Math.round(cy - el.h / 2) };
}

/** Where `el` lands dragged by `(dx, dy)` from where the drag began: on the grid, on the floor. */
export function moveElement(el: FloorElement, dx: number, dy: number): FloorElement {
  return clampToFloor({ ...el, x: snap(el.x + dx), y: snap(el.y + dy) });
}

// ─── Resizing ───────────────────────────────────────────────────────────────

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** Each handle's place on the element's box, as fractions of its width and height. */
export const HANDLES: { key: Handle; fx: number; fy: number }[] = [
  { key: 'nw', fx: 0, fy: 0 },
  { key: 'n', fx: 0.5, fy: 0 },
  { key: 'ne', fx: 1, fy: 0 },
  { key: 'e', fx: 1, fy: 0.5 },
  { key: 'se', fx: 1, fy: 1 },
  { key: 's', fx: 0.5, fy: 1 },
  { key: 'sw', fx: 0, fy: 1 },
  { key: 'w', fx: 0, fy: 0.5 },
];

/**
 * The smallest an element may be. A table has to keep a body inside its ring of chairs; a bar or
 * a label may be one grid square thick.
 */
export function minSize(el: Pick<FloorElement, 'kind'>): { w: number; h: number } {
  if (el.kind === 'barrier' || el.kind === 'label') return { w: FLOOR_GRID, h: FLOOR_GRID };
  return { w: FLOOR_GRID * 2, h: FLOOR_GRID * 2 };
}

/**
 * Resize by dragging `handle` by `(dx, dy)` floor units, measured from the gesture's start.
 *
 * The corner or edge opposite the handle stays exactly where it was — on a rotated element too,
 * because the drag is turned into the element's own frame before it is applied. v1 resized in
 * screen axes only, which was fine because nothing in v1 could rotate.
 *
 * `lockAspect` elements (round tables, squares, diamonds) resize proportionally: v1's rule, and
 * its reason — a round table that stops being round stops reading as a table. Only the dimensions
 * the handle drives are snapped to the grid, so a 16-unit railing stays 16 thick when it is
 * lengthened.
 */
export function resizeElement(el: FloorElement, handle: Handle, dx: number, dy: number): FloorElement {
  const h0 = HANDLES.find((x) => x.key === handle)!;
  const theta = rad(el.rotation ?? 0);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  // The drag, in the element's own (unrotated) axes.
  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;

  const min = minSize(el);
  const drivesW = h0.fx !== 0.5;
  const drivesH = h0.fy !== 0.5;
  let w = drivesW ? el.w + (h0.fx === 1 ? lx : -lx) : el.w;
  let h = drivesH ? el.h + (h0.fy === 1 ? ly : -ly) : el.h;

  if (el.lockAspect) {
    const ratio = el.w / el.h;
    // Edge handles drive their own axis; a corner follows whichever axis moved further.
    const byW = drivesW && (!drivesH || Math.abs(w / el.w - 1) >= Math.abs(h / el.h - 1));
    if (byW) {
      w = Math.min(FLOOR_W, Math.max(min.w, min.h * ratio, snap(w)));
      h = Math.round(w / ratio);
    } else {
      h = Math.min(FLOOR_H, Math.max(min.h, min.w / ratio, snap(h)));
      w = Math.round(h * ratio);
    }
  } else {
    if (drivesW) w = Math.min(FLOOR_W, Math.max(min.w, snap(w)));
    if (drivesH) h = Math.min(FLOOR_H, Math.max(min.h, snap(h)));
  }

  // Pin the opposite point: where it was in the world, it stays.
  const ax = 1 - h0.fx;
  const ay = 1 - h0.fy;
  const c = centerOf(el);
  const toWorld = (u: number, v: number) => ({ x: u * cos - v * sin, y: u * sin + v * cos });
  const oldOff = toWorld((ax - 0.5) * el.w, (ay - 0.5) * el.h);
  const anchor = { x: c.x + oldOff.x, y: c.y + oldOff.y };
  const newOff = toWorld((ax - 0.5) * w, (ay - 0.5) * h);
  const nc = { x: anchor.x - newOff.x, y: anchor.y - newOff.y };
  return clampToFloor({ ...el, w, h, x: Math.round(nc.x - w / 2), y: Math.round(nc.y - h / 2) });
}

/**
 * Which handles an element shows, given its size on screen in pixels.
 *
 * Every handle's hit area is 44px — a fingertip — which is bigger than a bar stool. Eight of them
 * on a small element would cover it completely and leave nothing to drag it by, so an element
 * shows only the handles that have room:
 *
 * - **Proportional** elements (round tables, squares, diamonds): the four corners. An edge handle
 *   would do exactly what a corner does.
 * - **Thin** elements (a railing, a bar top): the two handles on the ends, which lengthen it —
 *   what anyone resizing a railing is trying to do — plus the pair across it when it is long
 *   enough that they do not crowd the ends.
 * - Everything else: the corners, and an edge handle wherever that side is long enough to hold
 *   one between its corners.
 */
export function handlesFor(el: Pick<FloorElement, 'lockAspect'>, pxW: number, pxH: number): Handle[] {
  const ROOM = 110;
  const THIN = 60;
  if (el.lockAspect) return ['nw', 'ne', 'se', 'sw'];
  if (pxH < THIN) return pxW >= ROOM ? ['w', 'e', 'n', 's'] : ['w', 'e'];
  if (pxW < THIN) return pxH >= ROOM ? ['n', 's', 'w', 'e'] : ['n', 's'];
  return HANDLES.map((h) => h.key).filter((k) => k.length === 2 || ((k === 'n' || k === 's') ? pxW >= ROOM : pxH >= ROOM));
}

/** Turn an element by `deg`, about its centre, and keep it on the floor. */
export const rotateBy = (el: FloorElement, deg: number): FloorElement =>
  clampToFloor({ ...el, rotation: snapRotation((el.rotation ?? 0) + deg) });

export const withRotation = (el: FloorElement, deg: number): FloorElement => clampToFloor({ ...el, rotation: snapRotation(deg) });

// ─── Shapes ─────────────────────────────────────────────────────────────────

export const TABLE_SHAPES: TableShape[] = ['circle', 'square', 'rectangle', 'oval', 'diamond'];

export const isRound = (shape: TableShape | undefined): boolean => shape === 'circle' || shape === 'oval';

/** The shapes that only make sense with equal sides. Matches the seed's `table()` helper. */
export const locksAspect = (shape: TableShape): boolean => shape === 'circle' || shape === 'square' || shape === 'diamond';

/**
 * Seat orientation means something only on straight edges — a round table seats evenly around its
 * perimeter — so the inspector hides it for those rather than showing a control that does nothing.
 */
export const hasSeatOrientation = (shape: TableShape | undefined): boolean => !isRound(shape);

/**
 * Which pair of edges the chairs are on when nobody has said. It has to agree with
 * `chairPositions`' own fallback, or neither option would look chosen on an untouched table.
 */
export const effectiveSeatAxis = (el: Pick<FloorElement, 'w' | 'h' | 'seatOrientation'>): SeatOrientation =>
  el.seatOrientation ?? (el.w >= el.h ? 'horizontal' : 'vertical');

/**
 * Change a table's shape, about its centre.
 *
 * v1 swapped the shape and left the box alone, so a long table turned into a "circle" was a
 * 220 × 100 ellipse that no longer resized in proportion. Here a shape that needs equal sides
 * gets them — the average of the two, on the grid — and a square turned into a long table or an
 * oval is stretched, because a square box drawn as a rectangle is just a square.
 */
export function withShape(el: FloorElement, shape: TableShape): FloorElement {
  const c = centerOf(el);
  let { w, h } = el;
  if (locksAspect(shape) && w !== h) {
    w = h = Math.max(FLOOR_GRID * 2, snap((w + h) / 2));
  } else if (!locksAspect(shape) && w === h) {
    w = Math.min(FLOOR_W, snap(w * 1.6));
  }
  const seatOrientation = hasSeatOrientation(shape) ? el.seatOrientation : undefined;
  return clampToFloor({
    ...el,
    shape,
    lockAspect: locksAspect(shape),
    seatOrientation,
    w,
    h,
    x: Math.round(c.x - w / 2),
    y: Math.round(c.y - h / 2),
  });
}

export const withSeats = (el: FloorElement, seats: number): FloorElement => ({ ...el, seats: clampSeats(seats) });

// ─── Table numbers ──────────────────────────────────────────────────────────

/** How a number is stored: trimmed, upper-case. "p3" and "P3" are the same table to a server. */
export const normalizeTableNumber = (raw: string): string => raw.trim().toUpperCase();

/** A table number fits on the table: a few characters. */
export const TABLE_NUMBER_MAX = 4;

/**
 * The letter prefix a room's tables share — "P" on the patio, "B" at the bar, none in the dining
 * room — so a table added to the patio is P7, not 13. The most common prefix wins.
 */
export function roomNumberPrefix(room: Room): string {
  const counts = new Map<string, number>();
  for (const el of room.elements) {
    if (el.kind !== 'table' || !el.num) continue;
    const m = /^([A-Z]*)\d+$/.exec(normalizeTableNumber(el.num));
    if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  let best = '';
  let most = 0;
  for (const [prefix, n] of counts) {
    if (n > most) {
      best = prefix;
      most = n;
    }
  }
  return best;
}

const numbersIn = (rooms: Room[]) => new Set(allTables(rooms).map(({ table }) => normalizeTableNumber(table.num ?? '')));

/**
 * The lowest number not in use **anywhere on the floor**, with the room's prefix. Lowest rather
 * than highest-plus-one, so removing Table 3 and adding a table gives back a 3.
 */
export function nextTableNumber(rooms: Room[], room: Room): string {
  const taken = numbersIn(rooms);
  const prefix = roomNumberPrefix(room);
  for (let n = 1; ; n += 1) if (!taken.has(`${prefix}${n}`)) return `${prefix}${n}`;
}

export type NumberCheck = { ok: true; num: string } | { ok: false; error: string };

/** Whether `raw` can be `tableId`'s number: present, short, and unique across every room. */
export function validateTableNumber(raw: string, tableId: string, rooms: Room[]): NumberCheck {
  const num = normalizeTableNumber(raw);
  if (!num) return { ok: false, error: 'A table needs a number.' };
  if (num.length > TABLE_NUMBER_MAX) return { ok: false, error: `Keep it to ${TABLE_NUMBER_MAX} characters — it has to fit on the table.` };
  if (!/^[A-Z0-9-]+$/.test(num)) return { ok: false, error: 'Letters and digits only.' };
  const clash = allTables(rooms).find(({ table }) => table.id !== tableId && normalizeTableNumber(table.num ?? '') === num);
  if (clash) return { ok: false, error: `${tableLabel({ num })} is already in ${clash.room.name}. Every table needs its own number.` };
  return { ok: true, num };
}

// ─── Ids ────────────────────────────────────────────────────────────────────

/**
 * `prefix-N` with N one past the highest in use. `taken` should include every id anything still
 * points at — the saved floor, and the tables tabs and reservations name — so a new table can
 * never inherit a deleted table's reservations or its paid history. v1 used `Date.now()`.
 */
export function nextId(prefix: string, taken: Iterable<string | undefined>): string {
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  for (const id of taken) {
    const m = id ? re.exec(id) : null;
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${max + 1}`;
}

export const elementIds = (rooms: Room[]): string[] => rooms.flatMap((r) => r.elements.map((e) => e.id));

// ─── Placing new things ─────────────────────────────────────────────────────

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const coverOf = (el: FloorElement) => {
  const { ex, ey } = rotatedExtents(el);
  const c = centerOf(el);
  return { x: c.x - ex, y: c.y - ey, w: ex * 2, h: ey * 2 };
};

/**
 * The first clear spot for a `w × h` element, reading the room left to right, top to bottom, a
 * grid square of air around it. Regions count as occupied too: a table belongs in a region only
 * when someone puts it there, and a new label dropped inside one reads as the region's name.
 *
 * v1 dropped new elements on a fixed diagonal, so the third one added landed on whatever was
 * there. When nothing is clear, the middle of the room: the new element is selected either way,
 * so it can be dragged out.
 */
export function findOpenSpot(w: number, h: number, elements: FloorElement[]): { x: number; y: number } {
  const solid = elements.map(coverOf);
  const pad = FLOOR_GRID;
  for (let y = pad * 2; y + h + pad <= FLOOR_H; y += FLOOR_GRID) {
    for (let x = pad * 2; x + w + pad <= FLOOR_W; x += FLOOR_GRID) {
      const box = { x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2 };
      if (!solid.some((s) => overlaps(box, s))) return { x, y };
    }
  }
  return { x: snap((FLOOR_W - w) / 2), y: snap((FLOOR_H - h) / 2) };
}

export type PaletteKey = TableShape | 'barrier' | 'region' | 'label';

/** What each palette entry adds, before it is placed. Sizes are v1's, on the grid. */
export const PALETTE_DEFAULTS: Record<PaletteKey, Omit<FloorElement, 'id' | 'x' | 'y'>> = {
  circle: { kind: 'table', shape: 'circle', w: 100, h: 100, seats: 4, lockAspect: true },
  square: { kind: 'table', shape: 'square', w: 100, h: 100, seats: 4, lockAspect: true },
  rectangle: { kind: 'table', shape: 'rectangle', w: 180, h: 100, seats: 6, lockAspect: false },
  oval: { kind: 'table', shape: 'oval', w: 160, h: 100, seats: 6, lockAspect: false },
  diamond: { kind: 'table', shape: 'diamond', w: 100, h: 100, seats: 4, lockAspect: true },
  barrier: { kind: 'barrier', w: 240, h: 20 },
  region: { kind: 'region', w: 200, h: 120, text: 'Region' },
  label: { kind: 'label', w: 140, h: 40, text: 'Label' },
};

/** A new element for `room`, placed in the first clear spot, a table numbered. */
export function newElement(key: PaletteKey, room: Room, rooms: Room[], id: string): FloorElement {
  const spec = PALETTE_DEFAULTS[key];
  const at = findOpenSpot(spec.w, spec.h, room.elements);
  return { ...spec, id, ...at, ...(spec.kind === 'table' ? { num: nextTableNumber(rooms, room) } : {}) };
}

/** A copy two grid squares down and right, with its own number. */
export function duplicateElement(el: FloorElement, room: Room, rooms: Room[], id: string): FloorElement {
  const copy = clampToFloor({ ...el, id, x: el.x + FLOOR_GRID * 2, y: el.y + FLOOR_GRID * 2 });
  return el.kind === 'table' ? { ...copy, num: nextTableNumber(rooms, room) } : copy;
}

// ─── Working-copy edits ─────────────────────────────────────────────────────

export const mapRoom = (rooms: Room[], roomId: string, fn: (r: Room) => Room): Room[] =>
  rooms.map((r) => (r.id === roomId ? fn(r) : r));

export const replaceElement = (rooms: Room[], roomId: string, el: FloorElement): Room[] =>
  mapRoom(rooms, roomId, (r) => ({ ...r, elements: r.elements.map((e) => (e.id === el.id ? el : e)) }));

export const addElement = (rooms: Room[], roomId: string, el: FloorElement): Room[] =>
  mapRoom(rooms, roomId, (r) => ({ ...r, elements: [...r.elements, el] }));

export const removeElement = (rooms: Room[], roomId: string, id: string): Room[] =>
  mapRoom(rooms, roomId, (r) => ({ ...r, elements: r.elements.filter((e) => e.id !== id) }));

/** "Room 4", or the next number free. */
export function nextRoomName(rooms: Room[]): string {
  const names = new Set(rooms.map((r) => r.name.trim().toLowerCase()));
  for (let n = rooms.length + 1; ; n += 1) if (!names.has(`room ${n}`)) return `Room ${n}`;
}

export function validateRoomName(raw: string, roomId: string, rooms: Room[]): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: 'A room needs a name.' };
  if (name.length > 24) return { ok: false, error: 'Keep it to 24 characters.' };
  if (rooms.some((r) => r.id !== roomId && r.name.trim().toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: `There is already a room called ${name}.` };
  }
  return { ok: true, name };
}

// ─── What cannot be removed, and what removing something affects ───────────

/**
 * Why a table cannot be removed, or `null`. A table with an open tab is where people are eating:
 * removing it would leave the tab pointing at nothing and the party off the live floor. v1 had
 * no tabs on tables, so it had nothing to check.
 */
export function deleteRefusal(el: FloorElement, tabs: Tab[]): string | null {
  if (el.kind !== 'table') return null;
  const tab = openTabOn(el.id, tabs);
  if (!tab) return null;
  return `${tableLabel(el)} has an open tab — ${tab.name}, ${tab.guests} ${tab.guests === 1 ? 'guest' : 'guests'}. Pay the tab or move it to another table first.`;
}

/**
 * Why a table cannot be taken out of service, or `null`. Out of service beats every other status
 * on the live floor (see `tableStatus`), so doing it under a seated party would hide them.
 */
export function outOfServiceRefusal(el: FloorElement, tabs: Tab[]): string | null {
  if (el.kind !== 'table' || el.outOfService) return null;
  const tab = openTabOn(el.id, tabs);
  return tab ? `${tableLabel(el)} has an open tab — ${tab.name}. It can go out of service once the tab is paid or moved.` : null;
}

/** Why a room cannot be removed, or `null`. */
export function roomDeleteRefusal(room: Room, rooms: Room[], tabs: Tab[]): string | null {
  if (rooms.length <= 1) return 'The floor needs at least one room.';
  const busy = room.elements.filter((e) => e.kind === 'table' && openTabOn(e.id, tabs));
  if (!busy.length) return null;
  return `${room.name} has ${busy.length === 1 ? 'a table' : 'tables'} with an open tab — ${busy.map(tableLabel).join(', ')}. Pay or move ${busy.length === 1 ? 'that tab' : 'those tabs'} first.`;
}

/** Booked reservations assigned to any of `tableIds` — the ones deleting those tables would strand. */
export const bookedOn = (tableIds: string[], reservations: DiningReservation[]): DiningReservation[] =>
  reservations.filter((r) => r.status === 'booked' && r.tableId != null && tableIds.includes(r.tableId));

/**
 * Booked reservations whose table is not on `rooms`. Save unassigns exactly these — at Save, not
 * at Delete, so an undone or discarded deletion never touched a reservation.
 */
export function strandedReservations(rooms: Room[], reservations: DiningReservation[]): DiningReservation[] {
  const ids = new Set(elementIds(rooms));
  return reservations.filter((r) => r.status === 'booked' && r.tableId != null && !ids.has(r.tableId));
}

/** Open tabs whose table is not on `rooms`. Save refuses while there are any. */
export function strandedTabs(rooms: Room[], tabs: Tab[]): Tab[] {
  const ids = new Set(elementIds(rooms));
  return tabs.filter((t) => t.status === 'open' && t.tableId != null && !ids.has(t.tableId));
}

// ─── Unsaved changes ────────────────────────────────────────────────────────

/** Rooms whose working copy differs from the saved floor, new rooms included. */
export function changedRooms(working: Room[], saved: Room[]): Set<string> {
  const byId = new Map(saved.map((r) => [r.id, JSON.stringify(r)]));
  return new Set(working.filter((r) => byId.get(r.id) !== JSON.stringify(r)).map((r) => r.id));
}

/** Anything to save: a changed room, a removed room, or the rooms reordered. */
export const isDirty = (working: Room[], saved: Room[]): boolean =>
  working !== saved && JSON.stringify(working) !== JSON.stringify(saved);

// ─── History ────────────────────────────────────────────────────────────────

/**
 * Undo and redo over whole working copies. The floor is small enough that a snapshot is cheaper
 * to reason about than a diff — v1's call too.
 *
 * `key` coalesces: consecutive pushes with the same key replace the newest entry instead of
 * adding one, so typing "12" into a table's number is one step to undo, not two.
 */
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  key?: string;
}

export const HISTORY_LIMIT = 100;

export const historyOf = <T>(present: T): History<T> => ({ past: [], present, future: [] });

export function push<T>(h: History<T>, next: T, key?: string): History<T> {
  if (next === h.present) return h;
  if (key && key === h.key) return { ...h, present: next, future: [] };
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [], key };
}

/** A gesture in flight: the present moves, the history does not. */
export const live = <T>(h: History<T>, next: T): History<T> => ({ ...h, present: next });

/** A gesture ended: one undo step back to where it began — or none, if nothing moved. */
export function settle<T>(h: History<T>, before: T): History<T> {
  if (h.present === before || JSON.stringify(h.present) === JSON.stringify(before)) return { ...h, present: before };
  return { past: [...h.past, before].slice(-HISTORY_LIMIT), present: h.present, future: [], key: undefined };
}

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], key: undefined };
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), key: undefined };
}
