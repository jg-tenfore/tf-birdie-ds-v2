import { describe, expect, it } from 'vitest';
import { FLOOR_GRID, FLOOR_H, FLOOR_W, SEED_ROOMS, allTables, type FloorElement, type Room } from '../data/floor';
import { SEED_RESERVATIONS, SEED_TABS } from '../data/restaurant-seed';
import {
  bookedOn,
  changedRooms,
  clampToFloor,
  deleteRefusal,
  duplicateElement,
  effectiveSeatAxis,
  findOpenSpot,
  handlesFor,
  historyOf,
  isDirty,
  live,
  moveElement,
  newElement,
  nextId,
  nextRoomName,
  nextTableNumber,
  outOfServiceRefusal,
  push,
  redo,
  removeElement,
  resizeElement,
  rotateBy,
  rotatedExtents,
  rotationFromPointer,
  roomDeleteRefusal,
  roomNumberPrefix,
  settle,
  snap,
  snapRotation,
  strandedReservations,
  strandedTabs,
  undo,
  validateRoomName,
  validateTableNumber,
  withShape,
} from './floor-editor';

const room = (id: string) => SEED_ROOMS.find((r) => r.id === id)!;
const el = (roomId: string, id: string) => room(roomId).elements.find((e) => e.id === id)!;
const box = (over: Partial<FloorElement> = {}): FloorElement => ({ id: 'x', kind: 'table', shape: 'rectangle', x: 200, y: 200, w: 160, h: 100, seats: 6, ...over });

describe('the grid', () => {
  it('snaps to the nearest grid line', () => {
    expect(snap(29)).toBe(20);
    expect(snap(31)).toBe(40);
    expect(snap(-9)).toBe(-0);
  });

  it('snaps rotation to 15° and keeps it in [0, 360)', () => {
    expect(snapRotation(7)).toBe(0);
    expect(snapRotation(8)).toBe(15);
    expect(snapRotation(-15)).toBe(345);
    expect(snapRotation(372)).toBe(15);
  });

  it('reads a rotation off the pointer, the handle pointing up at 0°', () => {
    const c = { x: 100, y: 100 };
    expect(rotationFromPointer(c, { x: 100, y: 0 })).toBe(0);
    expect(rotationFromPointer(c, { x: 200, y: 100 })).toBe(90);
    expect(rotationFromPointer(c, { x: 100, y: 200 })).toBe(180);
    expect(rotationFromPointer(c, { x: 0, y: 100 })).toBe(270);
    // 40° off vertical snaps to 45.
    expect(rotationFromPointer(c, { x: 100 + Math.sin((40 * Math.PI) / 180) * 50, y: 100 - Math.cos((40 * Math.PI) / 180) * 50 })).toBe(45);
  });
});

describe('moving', () => {
  it('lands on the grid', () => {
    const moved = moveElement(box(), 47, 13);
    expect(moved.x).toBe(240);
    expect(moved.y).toBe(220);
  });

  it('stays on the floor', () => {
    const moved = moveElement(box(), 5000, -5000);
    expect(moved.x).toBe(FLOOR_W - 160);
    expect(moved.y).toBe(0);
  });

  it('keeps a rotated element’s corners on the floor, not just its unrotated box', () => {
    const turned = clampToFloor(box({ x: -150, y: 200, w: 200, h: 40, rotation: 90 }));
    // Pushed off the left edge: turned upright it is 40 wide, so it stops centred 20 in.
    expect(turned.x + turned.w / 2).toBe(20);
    const { ex, ey } = rotatedExtents({ w: 200, h: 40, rotation: 90 });
    expect(Math.round(ex)).toBe(20);
    expect(Math.round(ey)).toBe(100);
  });
});

describe('resizing', () => {
  it('pins the opposite corner and snaps what it drives', () => {
    const r = resizeElement(box(), 'se', 33, 27);
    expect([r.x, r.y, r.w, r.h]).toEqual([200, 200, 200, 120]);
    const l = resizeElement(box(), 'nw', -41, -19);
    expect([l.x, l.y, l.w, l.h]).toEqual([160, 180, 200, 120]);
  });

  it('an edge handle drives one dimension only', () => {
    const r = resizeElement(box(), 'e', 60, 300);
    expect([r.x, r.y, r.w, r.h]).toEqual([200, 200, 220, 100]);
  });

  it('keeps a round table round', () => {
    const circle = el('dining', 'd-1');
    expect(circle.lockAspect).toBe(true);
    const bigger = resizeElement(circle, 'se', 57, 3);
    expect(bigger.w).toBe(bigger.h);
    expect(bigger.w).toBe(160);
    const byEdge = resizeElement(circle, 's', 0, 40);
    expect(byEdge.w).toBe(byEdge.h);
    expect(byEdge.h).toBe(140);
  });

  it('will not shrink a table past the ring of its chairs', () => {
    const tiny = resizeElement(box(), 'se', -1000, -1000);
    expect(tiny.w).toBe(FLOOR_GRID * 2);
    expect(tiny.h).toBe(FLOOR_GRID * 2);
  });

  it('lets a railing stay thin while it is lengthened', () => {
    const rail = el('patio', 'patio-rail');
    const r = resizeElement({ ...rail, x: 40, w: 400 }, 'e', 100, 0);
    expect(r.w).toBe(500);
    expect(r.h).toBe(16);
  });

  it('shows only the handles a fingertip has room for', () => {
    expect(handlesFor({ lockAspect: true }, 400, 400)).toEqual(['nw', 'ne', 'se', 'sw']);
    // A railing: the ends, which lengthen it.
    expect(handlesFor({}, 90, 14)).toEqual(['w', 'e']);
    expect(handlesFor({}, 800, 14)).toEqual(['w', 'e', 'n', 's']);
    // A big region: all eight.
    expect(handlesFor({}, 300, 200)).toHaveLength(8);
    // A mid-size table: corners, plus the edges on its long side.
    expect(handlesFor({}, 160, 90)).toEqual(['nw', 'n', 'ne', 'se', 's', 'sw']);
  });

  it('resizes a rotated element along its own axes, pinning the far end where it was', () => {
    // A 160-long table turned 90°: its "east" end now points down.
    const t = box({ rotation: 90 });
    const r = resizeElement(t, 'e', 0, 40);
    expect(r.w).toBe(200);
    expect(r.h).toBe(100);
    // The west end — now the top — has not moved.
    const topBefore = t.y + t.h / 2 - t.w / 2;
    const topAfter = r.y + r.h / 2 - r.w / 2;
    expect(topAfter).toBe(topBefore);
  });
});

describe('shapes and seats', () => {
  it('turns a long table into a circle with equal sides', () => {
    const c = withShape(box(), 'circle');
    expect(c.w).toBe(c.h);
    expect(c.lockAspect).toBe(true);
    // About its centre.
    expect(c.x + c.w / 2).toBe(280);
  });

  it('stretches a square turned into a long table, and forgets orientation on round shapes', () => {
    const sq = box({ shape: 'square', w: 100, h: 100, lockAspect: true, seatOrientation: 'vertical' });
    const long = withShape(sq, 'rectangle');
    expect(long.w).toBeGreaterThan(long.h);
    expect(long.lockAspect).toBe(false);
    expect(long.seatOrientation).toBe('vertical');
    expect(withShape(sq, 'oval').seatOrientation).toBeUndefined();
  });

  it('reports the seat axis the geometry falls back to', () => {
    expect(effectiveSeatAxis({ w: 200, h: 100 })).toBe('horizontal');
    expect(effectiveSeatAxis({ w: 100, h: 240 })).toBe('vertical');
    expect(effectiveSeatAxis({ w: 100, h: 240, seatOrientation: 'horizontal' })).toBe('horizontal');
  });

  it('rotates in 15° steps', () => {
    expect(rotateBy(box(), 15).rotation).toBe(15);
    expect(rotateBy(box({ rotation: 0 }), -15).rotation).toBe(345);
  });
});

describe('table numbers', () => {
  it('follows the room’s prefix', () => {
    expect(roomNumberPrefix(room('dining'))).toBe('');
    expect(roomNumberPrefix(room('patio'))).toBe('P');
    expect(roomNumberPrefix(room('bar'))).toBe('B');
  });

  it('hands out the lowest number free on the whole floor', () => {
    expect(nextTableNumber(SEED_ROOMS, room('dining'))).toBe('13');
    expect(nextTableNumber(SEED_ROOMS, room('patio'))).toBe('P7');
    const without3 = removeElement(SEED_ROOMS, 'dining', 'd-3');
    expect(nextTableNumber(without3, without3[0])).toBe('3');
  });

  it('never gives a new table a number v1 would have — its count', () => {
    // v1 numbered by counting the room's tables: delete one, add one, and you had two 12s.
    const without3 = removeElement(SEED_ROOMS, 'dining', 'd-3');
    const count = without3[0].elements.filter((e) => e.kind === 'table').length + 1;
    const fresh = newElement('square', without3[0], without3, 'el-1');
    expect(String(count)).toBe('12');
    expect(fresh.num).not.toBe('12');
  });

  it('accepts a free number, upper-cased and trimmed', () => {
    expect(validateTableNumber(' p9 ', 'p-1', SEED_ROOMS)).toEqual({ ok: true, num: 'P9' });
    // Its own number is not a clash.
    expect(validateTableNumber('P1', 'p-1', SEED_ROOMS)).toEqual({ ok: true, num: 'P1' });
  });

  it('refuses a number used in any room, and says where', () => {
    const r = validateTableNumber('5', 'p-1', SEED_ROOMS);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/Table 5 is already in Dining Room/);
    const b = validateTableNumber('b3', 'd-1', SEED_ROOMS);
    expect(!b.ok && b.error).toMatch(/B3 is already in Bar/);
  });

  it('refuses empty, long and odd numbers', () => {
    expect(validateTableNumber('  ', 'd-1', SEED_ROOMS).ok).toBe(false);
    expect(validateTableNumber('12345', 'd-1', SEED_ROOMS).ok).toBe(false);
    expect(validateTableNumber('1 2', 'd-1', SEED_ROOMS).ok).toBe(false);
  });

  it('gives a duplicate its own number rather than v1’s "5·2"', () => {
    const copy = duplicateElement(el('dining', 'd-5'), room('dining'), SEED_ROOMS, 'el-1');
    expect(copy.num).toBe('13');
    expect(copy.x).toBe(el('dining', 'd-5').x + FLOOR_GRID * 2);
  });
});

describe('ids and placement', () => {
  it('counts past every id anything points at', () => {
    expect(nextId('el', ['el-1', 'el-7', 'd-3', undefined])).toBe('el-8');
    expect(nextId('room', [])).toBe('room-1');
  });

  it('puts a new element somewhere clear', () => {
    const spot = findOpenSpot(100, 100, room('dining').elements);
    const placed: FloorElement = { ...box(), id: 'n', x: spot.x, y: spot.y, w: 100, h: 100 };
    for (const other of room('dining').elements) {
      const apart =
        placed.x >= other.x + other.w || other.x >= placed.x + placed.w || placed.y >= other.y + other.h || other.y >= placed.y + placed.h;
      expect(apart, other.id).toBe(true);
    }
    expect(spot.x % FLOOR_GRID).toBe(0);
    expect(spot.y % FLOOR_GRID).toBe(0);
  });

  it('falls back to the middle of a full room', () => {
    const full: FloorElement[] = [{ ...box(), x: 0, y: 0, w: FLOOR_W, h: FLOOR_H }];
    expect(findOpenSpot(100, 100, full)).toEqual({ x: snap((FLOOR_W - 100) / 2), y: snap((FLOOR_H - 100) / 2) });
  });

  it('names a new room the next number free', () => {
    expect(nextRoomName(SEED_ROOMS)).toBe('Room 4');
    expect(nextRoomName([...SEED_ROOMS, { id: 'r', name: 'Room 4', elements: [] }])).toBe('Room 5');
  });

  it('refuses an empty or duplicate room name', () => {
    expect(validateRoomName(' ', 'patio', SEED_ROOMS).ok).toBe(false);
    expect(validateRoomName('bar', 'patio', SEED_ROOMS).ok).toBe(false);
    expect(validateRoomName('  The   Terrace ', 'patio', SEED_ROOMS)).toEqual({ ok: true, name: 'The Terrace' });
  });
});

describe('what cannot be removed', () => {
  it('refuses to delete a table with an open tab, and says whose', () => {
    expect(deleteRefusal(el('dining', 'd-5'), SEED_TABS)).toMatch(/Table 5 has an open tab — Table 5, 2 guests/);
    expect(deleteRefusal(el('dining', 'd-4'), SEED_TABS)).toBeNull();
    expect(deleteRefusal(el('dining', 'dining-host'), SEED_TABS)).toBeNull();
  });

  it('refuses to take a seated table out of service', () => {
    expect(outOfServiceRefusal(el('dining', 'd-1'), SEED_TABS)).toMatch(/open tab/);
    expect(outOfServiceRefusal(el('dining', 'd-4'), SEED_TABS)).toBeNull();
  });

  it('refuses to delete a room with a seated table, or the last room', () => {
    expect(roomDeleteRefusal(room('patio'), SEED_ROOMS, SEED_TABS)).toMatch(/P2/);
    const quiet: Room = { id: 'q', name: 'Quiet', elements: [] };
    expect(roomDeleteRefusal(quiet, [...SEED_ROOMS, quiet], SEED_TABS)).toBeNull();
    expect(roomDeleteRefusal(quiet, [quiet], SEED_TABS)).toMatch(/at least one room/);
  });

  it('finds the booked reservations a deletion would strand — and only booked ones', () => {
    expect(bookedOn(['d-8'], SEED_RESERVATIONS).map((r) => r.id)).toEqual(['R-508']);
    // d-1's reservation is seated, not booked.
    expect(bookedOn(['d-1'], SEED_RESERVATIONS)).toEqual([]);
    const without8 = removeElement(SEED_ROOMS, 'dining', 'd-8');
    expect(strandedReservations(without8, SEED_RESERVATIONS).map((r) => r.id)).toEqual(['R-508']);
    expect(strandedReservations(SEED_ROOMS, SEED_RESERVATIONS)).toEqual([]);
  });

  it('notices an open tab whose table is gone', () => {
    expect(strandedTabs(removeElement(SEED_ROOMS, 'dining', 'd-5'), SEED_TABS).map((t) => t.id)).toEqual(['T-1002']);
    expect(strandedTabs(SEED_ROOMS, SEED_TABS)).toEqual([]);
  });
});

describe('unsaved changes', () => {
  it('names the rooms that changed', () => {
    const moved = removeElement(SEED_ROOMS, 'patio', 'p-1');
    expect([...changedRooms(moved, SEED_ROOMS)]).toEqual(['patio']);
    expect(isDirty(moved, SEED_ROOMS)).toBe(true);
    expect(isDirty(SEED_ROOMS.map((r) => ({ ...r })), SEED_ROOMS)).toBe(false);
    expect(isDirty(SEED_ROOMS.slice(0, 2), SEED_ROOMS)).toBe(true);
  });

  it('every table number in the seed is unique — the rule the editor keeps', () => {
    const nums = allTables(SEED_ROOMS).map(({ table }) => table.num);
    expect(new Set(nums).size).toBe(nums.length);
  });
});

describe('history', () => {
  it('undoes and redoes', () => {
    let h = historyOf(1);
    h = push(h, 2);
    h = push(h, 3);
    h = undo(h);
    expect(h.present).toBe(2);
    h = undo(h);
    expect(h.present).toBe(1);
    expect(undo(h)).toBe(h);
    h = redo(h);
    expect(h.present).toBe(2);
    h = redo(h);
    expect(h.present).toBe(3);
    expect(redo(h)).toBe(h);
  });

  it('a new edit clears what could be redone', () => {
    const h = push(undo(push(historyOf(1), 2)), 5);
    expect(h.future).toEqual([]);
    expect(h.past).toEqual([1]);
  });

  it('coalesces pushes with the same key — typing is one step', () => {
    let h = historyOf('1');
    h = push(h, '12', 'num:d-1');
    h = push(h, '123', 'num:d-1');
    expect(h.past).toEqual(['1']);
    h = push(h, 'x', 'seats:d-1');
    expect(h.past).toEqual(['1', '123']);
  });

  it('a gesture is one step, and a gesture that went nowhere is none', () => {
    const start = historyOf({ x: 0 });
    const before = start.present;
    let h = live(start, { x: 20 });
    h = live(h, { x: 40 });
    h = settle(h, before);
    expect(h.past).toEqual([{ x: 0 }]);
    expect(h.present).toEqual({ x: 40 });
    const tap = settle(live(start, { x: 0 }), before);
    expect(tap.past).toEqual([]);
    expect(tap.present).toBe(before);
  });
});
