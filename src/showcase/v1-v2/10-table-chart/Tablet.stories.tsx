import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, screen, userEvent, waitFor, within } from 'storybook/test';
import { FLOOR_W } from '../../../pos/data/floor';
import type { PosState } from '../../../pos/state/pos-store';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 10 · Table Chart / Tablet
 *
 * **The floor-plan editor. What it saves is what Tables shows.**
 *
 * ## What v1 did
 *
 * The shipping app's Table Chart (`tf-birdie-ds-v1/app/src/screens/table-chart.tsx`, from
 * `references/072926/10-tablechart/`) was a real editor: a palette of five table shapes and three
 * items, a gridded canvas, drag and eight resize handles, undo/redo, per-room layouts, and an
 * orange dot on SAVE for unsaved work rather than a blocking dialog. Its best decision was
 * structural — it **wrote back** to the floor the live Tables screen draws. Before that, the two
 * screens held separate layouts and arranging a room changed nothing a server saw.
 *
 * ## What was wrong with it
 *
 * - **Switching rooms threw work away.** The working copy was one room, reseeded from the saved
 *   layout on every room change. Arrange the patio, glance at the bar, and the patio was gone —
 *   the orange dot simply went out.
 * - **Table numbers collided.** New tables were numbered by counting the room's tables, Duplicate
 *   produced "5·2", and nothing checked uniqueness, so two tables called 5 could be saved.
 * - **It knew nothing about service.** A table with a party at it could be deleted.
 * - **No rotation**, rooms nobody could add or rename, and 12px handles on a touch screen.
 *
 * ## What this does
 *
 * - **The working copy is the whole floor.** Switching rooms keeps every edit; each room tab
 *   carries its own dot; **Save** writes every room at once, and **Discard** returns to the saved
 *   floor (and can itself be undone).
 * - **Direct manipulation on the canvas** — drag to move, handles to resize, a knob to rotate
 *   (new; snaps to 15°) — all on a 20-unit grid, all with pointer events so a finger and a mouse
 *   are the same. Handles show a small dot but take a 44px fingertip.
 * - **An inspector** for the exact part: number (unique across every room, refused as typed
 *   with the room that has it), seats, shape, seat orientation (straight edges only), rotation,
 *   out of service, a label's text. Duplicate and delete.
 * - **The rules of service**: a table with an open tab cannot be removed or taken out of service;
 *   a room with one cannot be removed; a table with booked reservations can be, after a warning,
 *   and Save unassigns them.
 * - **One renderer.** The canvas draws with the live floor's `FloorElementView`, so what is edited
 *   is exactly what is shown.
 *
 * Drags in these stories are pointer events at coordinates computed from the canvas's own
 * rectangle, converted to floor units — so they land on the floor coordinate the story names at any
 * preview size.
 */
const meta = {
  title: 'V1 → V2 Migration/10 · Table Chart/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const chart = (extra: Partial<PosState> = {}) => atVenue('eighteen', { view: 'tablechart', leftPanelCollapsed: true, ...extra });

// ─── Helpers (not exported: every export of a stories file is a story) ──────

const q = <T extends HTMLElement = HTMLElement>(root: HTMLElement, sel: string) => root.querySelector<T>(sel);
const canvasOf = (root: HTMLElement) => q(root, '[data-floor-canvas]')!;
const elementOf = (root: HTMLElement, id: string) => q(root, `[data-floor-element="${id}"]`);

/** An element's box in floor units, read back from what was drawn. */
function boxOf(root: HTMLElement, id: string) {
  const canvas = canvasOf(root);
  const s = Number(canvas.dataset.floorScale);
  // Computed style rather than `offsetLeft`: offsets are whole pixels, which at a small preview
  // scale is more than a floor unit.
  const css = getComputedStyle(elementOf(root, id)!);
  const at = (v: string) => Math.round(parseFloat(v) / s);
  return { x: at(css.left), y: at(css.top), w: at(css.width), h: at(css.height) };
}

/** Screen pixels per floor unit, including every transform above the canvas. */
const pxPerUnit = (root: HTMLElement) => canvasOf(root).getBoundingClientRect().width / FLOOR_W;

const centreOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

const pt = (x: number, y: number) => ({ clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: 0, pointerType: 'touch' });

/** Press on `target`, slide by `(dx, dy)` floor units in two steps, lift. */
function drag(root: HTMLElement, target: Element, dx: number, dy: number) {
  const k = pxPerUnit(root);
  const a = centreOf(target);
  fireEvent.pointerDown(target, pt(a.x, a.y));
  fireEvent.pointerMove(target, pt(a.x + (dx * k) / 2, a.y + (dy * k) / 2));
  fireEvent.pointerMove(target, pt(a.x + dx * k, a.y + dy * k));
  fireEvent.pointerUp(target, pt(a.x + dx * k, a.y + dy * k));
}

/** Press on `target`, slide to a floor coordinate, lift. */
function dragTo(root: HTMLElement, target: Element, fx: number, fy: number) {
  const k = pxPerUnit(root);
  const r = canvasOf(root).getBoundingClientRect();
  const a = centreOf(target);
  const to = { x: r.left + fx * k, y: r.top + fy * k };
  fireEvent.pointerDown(target, pt(a.x, a.y));
  fireEvent.pointerMove(target, pt(to.x, to.y));
  fireEvent.pointerUp(target, pt(to.x, to.y));
}

/** Tap an element on the floor: a press and a lift that go nowhere. */
function tap(root: HTMLElement, id: string) {
  drag(root, elementOf(root, id)!, 0, 0);
}

const inspector = (root: HTMLElement) => within(q(root, '[data-floor-inspector]')!);
const saveButton = (root: HTMLElement) => q(root, '[data-floor-save]')!;
const numberOn = (root: HTMLElement, id: string) => elementOf(root, id)!.textContent;

async function goVia(root: HTMLElement, key: string) {
  await userEvent.click(within(root).getByRole('button', { name: 'Open navigation' }));
  await userEvent.click(await waitFor(() => q(root, `[data-nav-key="${key}"]`)!));
}

// ─── Stories ────────────────────────────────────────────────────────────────

/**
 * **The floor as saved.** The Dining Room, drawn by the live floor's own renderer: fifteen
 * things, the three rooms as tabs, nothing unsaved. Tables with open tabs carry a small mark —
 * it is why they cannot be removed.
 */
export const TheFloorAsSaved: Story = {
  render: () => <Screen edition="v1v2" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasOf(canvasElement)).toBeTruthy());
    await expect(canvasElement.querySelectorAll('[data-floor-canvas] [data-floor-element]').length).toBe(15);
    await expect(canvasElement.querySelectorAll('[data-floor-room-tab]').length).toBe(3);
    await expect(saveButton(canvasElement).dataset.floorSave).toBe('saved');
    await expect(canvasElement.querySelector('[data-unsaved-dot]')).toBeNull();
    // Tables 1, 5 and 10 have open tabs.
    await expect(canvasElement.querySelectorAll('[data-seated-mark]').length).toBe(3);
    await expect(inspector(canvasElement).getByText('12 tables · 54 seats')).toBeTruthy();
  },
};

/**
 * **Adding each kind.** Every palette entry, tapped once. Each lands in a clear spot, selected;
 * each table gets the lowest number free on the whole floor — 13, 14, 15… — rather than v1's
 * count of the room's tables.
 */
export const AddingEachKind: Story = {
  render: () => <Screen edition="v1v2" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const names = ['round table', 'square table', 'long table', 'oval table', 'diamond table', 'barrier', 'region', 'label'];
    for (const n of names) await userEvent.click(c.getByRole('button', { name: `Add a ${n}` }));
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-floor-canvas] [data-floor-element]').length).toBe(23));
    const nums = ['el-1', 'el-2', 'el-3', 'el-4', 'el-5'].map((id) => numberOn(canvasElement, id));
    await expect(nums).toEqual(['13', '14', '15', '16', '17']);
    await expect(elementOf(canvasElement, 'el-6')!.dataset.floorKind).toBe('barrier');
    await expect(elementOf(canvasElement, 'el-7')!.dataset.floorKind).toBe('region');
    await expect(elementOf(canvasElement, 'el-8')!.dataset.floorKind).toBe('label');
    // The last one added is selected.
    await expect(inspector(canvasElement).getByText('Label', { selector: '[data-inspector-title]' })).toBeTruthy();
  },
};

/**
 * **Drag to move, on the grid.** Table 9 dragged 47 across and 13 down lands on 360, 400 — the
 * nearest grid lines — not wherever the finger stopped.
 */
export const DragToMoveSnaps: Story = {
  render: () => <Screen edition="v1v2" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(elementOf(canvasElement, 'd-9')).toBeTruthy());
    await expect(boxOf(canvasElement, 'd-9')).toMatchObject({ x: 320, y: 380 });
    drag(canvasElement, elementOf(canvasElement, 'd-9')!, 47, 13);
    await waitFor(() => expect(boxOf(canvasElement, 'd-9')).toMatchObject({ x: 360, y: 400, w: 220, h: 100 }));
    await expect(inspector(canvasElement).getByText('Table 9')).toBeTruthy();
    await expect(within(canvasElement).getByRole('button', { name: 'Undo' })).toBeEnabled();
  },
};

/**
 * **Resizing keeps a round table round.** Table 2's bottom-right handle dragged mostly sideways:
 * the table grows to 160 × 160, not 160 × 100 — a round table that stops being round stops
 * reading as a table. Its top-left corner does not move.
 */
export const ResizeKeepsACircleRound: Story = {
  render: () => <Screen edition="v1v2" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(elementOf(canvasElement, 'd-2')).toBeTruthy());
    tap(canvasElement, 'd-2');
    const handle = await waitFor(() => q(canvasElement, '[data-floor-handle="se"]')!);
    // Round tables show corners only: an edge handle would do what a corner does.
    await expect(canvasElement.querySelectorAll('[data-floor-handle]').length).toBe(4);
    // A fingertip, however small the dot.
    await expect(handle.offsetWidth).toBeGreaterThanOrEqual(44);
    drag(canvasElement, handle, 57, 3);
    await waitFor(() => expect(boxOf(canvasElement, 'd-2')).toEqual({ x: 200, y: 60, w: 160, h: 160 }));
  },
};

/**
 * **Rotate, in 15° steps.** New in V1 → V2 — v1 could not rotate. The knob above Table 9 dragged
 * to a point straight right of its centre turns it to 90°; the inspector agrees, and **Straighten**
 * puts it back.
 */
export const Rotate: Story = {
  render: () => <Screen edition="v1v2" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(elementOf(canvasElement, 'd-9')).toBeTruthy());
    tap(canvasElement, 'd-9');
    const knob = await waitFor(() => q(canvasElement, '[data-floor-rotate]')!);
    // Table 9: 320, 380, 220 × 100 — centre 430, 430. A point to its right, slightly low.
    dragTo(canvasElement, knob, 700, 440);
    const ins = inspector(canvasElement);
    await waitFor(() => expect(q(canvasElement, '[data-stepper-value="rotation"]')!.textContent).toBe('90°'));
    await userEvent.click(ins.getByRole('button', { name: 'Increase rotation' }));
    await expect(q(canvasElement, '[data-stepper-value="rotation"]')!.textContent).toBe('105°');
    await userEvent.click(ins.getByRole('button', { name: 'Straighten' }));
    await expect(q(canvasElement, '[data-stepper-value="rotation"]')!.textContent).toBe('0°');
  },
};

/**
 * **The inspector.** Seats, shape and orientation on Table 8; the orientation control disappears
 * for a round shape, where it would do nothing; out of service greys the table exactly as the
 * live floor will; a label's text changes the label.
 */
export const TheInspector: Story = {
  render: () => <Screen edition="v1v2" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(elementOf(canvasElement, 'd-8')).toBeTruthy());
    tap(canvasElement, 'd-8');
    const ins = inspector(canvasElement);
    await waitFor(() => expect(ins.getByText('Table 8')).toBeTruthy());

    await userEvent.click(ins.getByRole('button', { name: 'Increase seats' }));
    await expect(q(canvasElement, '[data-stepper-value="seats"]')!.textContent).toBe('7');

    await expect(ins.getByRole('button', { name: 'Seats left and right' })).toBeTruthy();
    await userEvent.click(ins.getByRole('button', { name: 'Seats left and right' }));
    await expect(ins.getByRole('button', { name: 'Seats left and right' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(ins.getByRole('button', { name: 'Oval' }));
    await expect(ins.queryByRole('button', { name: 'Seats left and right' })).toBeNull();
    await userEvent.click(ins.getByRole('button', { name: 'Round' }));
    // A long table made round gets equal sides.
    await waitFor(() => {
      const b = boxOf(canvasElement, 'd-8');
      expect(b.w).toBe(b.h);
    });

    await userEvent.click(ins.getByRole('switch', { name: 'Out of service' }));
    await waitFor(() => expect(elementOf(canvasElement, 'd-8')!.dataset.tableStatus).toBe('blocked'));

    tap(canvasElement, 'dining-host');
    const text = await waitFor(() => ins.getByRole('textbox', { name: 'Label text' }));
    await userEvent.clear(text);
    await userEvent.type(text, 'Hostess');
    await waitFor(() => expect(elementOf(canvasElement, 'dining-host')!.textContent).toBe('Hostess'));
    // Labels have no seats and no shape.
    await expect(ins.queryByRole('button', { name: 'Increase seats' })).toBeNull();
  },
};

/**
 * **A number already in use is refused.** Table 9 renumbered to 5: refused as it is typed, and the
 * message says where the other 5 is. Table 9 keeps its number until the field holds a free one.
 * Across rooms too — "P3" is the patio's.
 */
export const DuplicateNumberRefused: Story = {
  render: () => <Screen edition="v1v2" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(elementOf(canvasElement, 'd-9')).toBeTruthy());
    tap(canvasElement, 'd-9');
    const ins = inspector(canvasElement);
    const field = await waitFor(() => ins.getByRole('textbox', { name: 'Table number' }));

    await userEvent.clear(field);
    await userEvent.type(field, '5');
    await expect(await ins.findByRole('alert')).toHaveTextContent('Table 5 is already in Dining Room');
    await expect(numberOn(canvasElement, 'd-9')).toBe('9');

    await userEvent.clear(field);
    await userEvent.type(field, 'p3');
    await expect(await ins.findByRole('alert')).toHaveTextContent('P3 is already in Patio');
    await expect(numberOn(canvasElement, 'd-9')).toBe('9');

    await userEvent.clear(field);
    await userEvent.type(field, '20');
    await waitFor(() => expect(numberOn(canvasElement, 'd-9')).toBe('20'));
    await expect(ins.queryByRole('alert')).toBeNull();

    // Duplicate gives the copy its own number, not v1's "20·2".
    await userEvent.click(ins.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(elementOf(canvasElement, 'el-1')).toBeTruthy());
    await expect(numberOn(canvasElement, 'el-1')).toBe('9');
  },
};

/**
 * **A seated table cannot be removed.** Table 5 has an open tab. Delete explains — whose tab, and
 * what would make it possible — and the table stays. It cannot go out of service either.
 */
export const DeletingASeatedTableIsRefused: Story = {
  render: () => <Screen edition="v1v2" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(elementOf(canvasElement, 'd-5')).toBeTruthy());
    tap(canvasElement, 'd-5');
    const ins = inspector(canvasElement);
    await userEvent.click(await waitFor(() => ins.getByRole('button', { name: 'Delete' })));
    const refused = await waitFor(() => q(canvasElement, '[data-delete-refused]')!);
    await expect(refused).toHaveTextContent('Can’t remove Table 5');
    await expect(refused).toHaveTextContent('open tab');
    await expect(elementOf(canvasElement, 'd-5')).toBeTruthy();
    await expect(ins.getByRole('switch', { name: 'Out of service' })).toBeDisabled();
    await expect(saveButton(canvasElement).dataset.floorSave).toBe('saved');
  },
};

/**
 * **A booked table can be removed, after a warning.** Table 8 is booked for the Whitfields at
 * 6:30. Delete names them; *Remove anyway* removes it; Save unassigns the reservation — at Save,
 * so an undone deletion never touches a booking.
 */
export const DeletingABookedTableWarns: Story = {
  render: () => <Screen edition="v1v2" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(elementOf(canvasElement, 'd-8')).toBeTruthy());
    tap(canvasElement, 'd-8');
    const ins = inspector(canvasElement);
    await userEvent.click(await waitFor(() => ins.getByRole('button', { name: 'Delete' })));
    const warning = await waitFor(() => q(canvasElement, '[data-delete-warning]')!);
    await expect(warning).toHaveTextContent('Whitfield, Gerald · 6:30 PM');
    await expect(elementOf(canvasElement, 'd-8')).toBeTruthy();
    await userEvent.click(ins.getByRole('button', { name: 'Remove anyway' }));
    await waitFor(() => expect(elementOf(canvasElement, 'd-8')).toBeNull());
    await userEvent.click(saveButton(canvasElement));
    await expect(await within(canvasElement).findByText('Floor saved · 1 reservation unassigned')).toBeTruthy();
  },
};

/**
 * **Undo and redo.** Add a table, drag it: two steps. Undo takes back the drag — one step for the
 * whole gesture — then the table; redo brings both back.
 */
export const UndoRedo: Story = {
  render: () => <Screen edition="v1v2" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Add a round table' }));
    await waitFor(() => expect(elementOf(canvasElement, 'el-1')).toBeTruthy());
    const placed = boxOf(canvasElement, 'el-1');
    drag(canvasElement, elementOf(canvasElement, 'el-1')!, 0, 100);
    await waitFor(() => expect(boxOf(canvasElement, 'el-1').y).toBe(placed.y + 100));

    await userEvent.click(c.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(boxOf(canvasElement, 'el-1')).toEqual(placed));
    await userEvent.click(c.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(elementOf(canvasElement, 'el-1')).toBeNull());
    await expect(c.getByRole('button', { name: 'Undo' })).toBeDisabled();
    await expect(saveButton(canvasElement).dataset.floorSave).toBe('saved');

    await userEvent.click(c.getByRole('button', { name: 'Redo' }));
    await waitFor(() => expect(boxOf(canvasElement, 'el-1')).toEqual(placed));
    await userEvent.click(c.getByRole('button', { name: 'Redo' }));
    await waitFor(() => expect(boxOf(canvasElement, 'el-1').y).toBe(placed.y + 100));
    await expect(c.getByRole('button', { name: 'Redo' })).toBeDisabled();
  },
};

/**
 * **Save writes the floor — the one Tables draws.** Move Table 9 and save: the button settles to
 * *Saved*. Going to Tables and back, the editor starts again from `state.floor` — the same saved
 * floor the live screen reads — and Table 9 is where it was put, in the room that was open.
 */
export const SaveWritesTheFloor: Story = {
  render: () => <Screen edition="v1v2" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(elementOf(canvasElement, 'd-9')).toBeTruthy());
    drag(canvasElement, elementOf(canvasElement, 'd-9')!, 100, 0);
    await waitFor(() => expect(saveButton(canvasElement).dataset.floorSave).toBe('unsaved'));
    await userEvent.click(saveButton(canvasElement));
    await waitFor(() => expect(saveButton(canvasElement).dataset.floorSave).toBe('saved'));

    await goVia(canvasElement, 'tables');
    await waitFor(() => expect(q(canvasElement, '[data-table-chart]')).toBeNull());
    await goVia(canvasElement, 'tablechart');
    await waitFor(() => expect(elementOf(canvasElement, 'd-9')).toBeTruthy());
    await expect(boxOf(canvasElement, 'd-9')).toMatchObject({ x: 420, y: 380 });
    await expect(saveButton(canvasElement).dataset.floorSave).toBe('saved');
  },
};

/**
 * **Discard returns to the saved floor** — every room of it — and is itself a step Undo can take
 * back, so it needs no "are you sure".
 */
export const Discard: Story = {
  render: () => <Screen edition="v1v2" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(elementOf(canvasElement, 'd-9')).toBeTruthy());
    drag(canvasElement, elementOf(canvasElement, 'd-9')!, 100, 0);
    await waitFor(() => expect(boxOf(canvasElement, 'd-9').x).toBe(420));
    await userEvent.click(c.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(boxOf(canvasElement, 'd-9').x).toBe(320));
    await expect(saveButton(canvasElement).dataset.floorSave).toBe('saved');
    await userEvent.click(c.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(boxOf(canvasElement, 'd-9').x).toBe(420));
  },
};

/**
 * **The unsaved indicator, and rooms that keep their edits.** Move a patio table, switch to the
 * bar: the Patio tab keeps its orange dot, the Bar tab has none, and Save has one. Back on the
 * patio the table is where it was left. v1 reseeded the working copy on every room switch and
 * lost it.
 */
export const UnsavedIndicator: Story = {
  render: () => <Screen edition="v1v2" initialState={chart({ floorRoomId: 'patio' })} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(elementOf(canvasElement, 'p-5')).toBeTruthy());
    drag(canvasElement, elementOf(canvasElement, 'p-5')!, 0, 60);
    await waitFor(() => expect(boxOf(canvasElement, 'p-5').y).toBe(360));
    const tab = (id: string) => q(canvasElement, `[data-floor-room-tab="${id}"]`)!;
    await expect(tab('patio').querySelector('[data-unsaved-dot]')).toBeTruthy();
    await expect(saveButton(canvasElement).querySelector('[data-unsaved-dot]')).toBeTruthy();
    await expect(within(canvasElement).getByText('Unsaved · Patio')).toBeTruthy();

    await userEvent.click(tab('bar'));
    await waitFor(() => expect(elementOf(canvasElement, 'bar-top')).toBeTruthy());
    await expect(tab('bar').querySelector('[data-unsaved-dot]')).toBeNull();
    await expect(tab('patio').querySelector('[data-unsaved-dot]')).toBeTruthy();

    await userEvent.click(tab('patio'));
    await waitFor(() => expect(boxOf(canvasElement, 'p-5').y).toBe(360));
  },
};

/**
 * **Rooms.** Add one ("Terrace"), rename it, and remove it. The patio cannot be removed while P2
 * has an open tab, and the dialog says so rather than offering a button that fails.
 */
export const Rooms: Story = {
  render: () => <Screen edition="v1v2" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Add a room' }));
    let dialog = within(await screen.findByRole('dialog'));
    const name = dialog.getByRole('textbox', { name: 'Room name' });
    await expect(name).toHaveValue('Room 4');
    await userEvent.clear(name);
    await userEvent.type(name, 'bar');
    await expect(dialog.getByRole('alert')).toHaveTextContent('already a room called bar');
    await userEvent.clear(name);
    await userEvent.type(name, 'Terrace');
    await userEvent.click(dialog.getByRole('button', { name: 'Add room' }));
    await waitFor(() => expect(c.getByRole('tab', { name: /Terrace/ })).toHaveAttribute('aria-selected', 'true'));
    await expect(canvasElement.querySelectorAll('[data-floor-canvas] [data-floor-element]').length).toBe(0);

    await userEvent.click(c.getByRole('button', { name: 'Rename Terrace' }));
    dialog = within(await screen.findByRole('dialog'));
    await userEvent.clear(dialog.getByRole('textbox', { name: 'Room name' }));
    await userEvent.type(dialog.getByRole('textbox', { name: 'Room name' }), 'The Terrace');
    await userEvent.click(dialog.getByRole('button', { name: 'Rename' }));
    await waitFor(() => expect(c.getByRole('tab', { name: /The Terrace/ })).toBeTruthy());

    await userEvent.click(c.getByRole('button', { name: 'Remove The Terrace' }));
    dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Remove room' }));
    await waitFor(() => expect(c.queryByRole('tab', { name: /Terrace/ })).toBeNull());

    await userEvent.click(c.getByRole('tab', { name: /Patio/ }));
    await userEvent.click(c.getByRole('button', { name: 'Remove Patio' }));
    dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByText(/P2/)).toBeTruthy();
    await expect(dialog.queryByRole('button', { name: 'Remove room' })).toBeNull();
    await userEvent.click(dialog.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await expect(c.getByRole('tab', { name: /Patio/ })).toBeTruthy();
  },
};

/**
 * **The room is shared with Tables.** Opened with the patio as the floor's room — as it would be
 * arriving from Tables with the patio showing — the editor opens on the patio too.
 */
export const OpensOnTheSharedRoom: Story = {
  render: () => <Screen edition="v1v2" initialState={chart({ floorRoomId: 'patio' })} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasOf(canvasElement).dataset.floorCanvas).toBe('patio'));
    await expect(within(canvasElement).getByRole('tab', { name: /Patio/ })).toHaveAttribute('aria-selected', 'true');
  },
};

/** **Only in V1 → V2.** Weston Edits handed the view directly, as a link would, shows the tee sheet. */
export const NotReachableElsewhere: Story = {
  name: 'Not reachable outside V1 → V2',
  render: () => <Screen edition="weston" initialState={chart()} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-table-chart]')).toBeNull();
  },
};
