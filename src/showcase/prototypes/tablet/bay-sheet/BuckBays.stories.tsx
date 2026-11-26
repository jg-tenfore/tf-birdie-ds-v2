import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { CURRENT_EDITION } from '../../../../pos/edition';
import { PPM } from '../../../../pos/components/ResourceSheetView';
import { NO_MEMBERSHIP } from '../../../../pos/data/memberships';
import { resourcesOf, seedResourceDay, type ResourceBooking } from '../../../../pos/data/resources';
import { withEdition } from '../../../edition-decorator';
import { TODAY_STR } from '../../../pos/screen-helpers';
import { Screen } from '../../../pos/screen-helpers';
import { at, booking, panelOn, sheetWith, tapAt } from '../../../v1-v2/resource-scenarios';

/**
 * Bay Sheet — **TF Buck's bays** (Nov 26).
 *
 * Buck decided its bay sheet on Nov 24, and the counter now matches it:
 *
 * - **Buck's ten bays** — Bay 1–5, the Lesson Bay, Nicklaus and Palmer, two single-seat porch sims —
 *   each header saying how many it holds.
 * - **Buck's fees**: *Sim Hour Sun–Thu* $60 before four, *Sim Hour Evening* $75 after, *Member Sim
 *   Hour* $40 for members whatever the hour. The most specific fee wins.
 * - **The ribbon is the golfer's membership colour** — the plan's own colour, the same one the tee
 *   sheet's member dot and Customer Search draw. Grey is *No membership*.
 * - **Layout A**: bay columns; book by tapping open time (no New booking button); **drag to move**,
 *   **drag the bottom edge** or **+30m / +1h** to extend; **Undo**; refusals that say why; details in
 *   a 560px slide-over.
 * - **Daily limit**: two bookings a golfer a day, counted by customer record; staff can book anyway.
 *   Buck's open question — bookings or hours — is open here too: this counts bookings.
 */
const meta = {
  title: 'Prototypes/Tablet/Bay Sheet/Buck bays',
  parameters: { layout: 'fullscreen' },
  decorators: [withEdition('current-tablet')],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const KIND = 'bay' as const;
const q = (root: ParentNode, sel: string) => root.querySelector<HTMLElement>(sel);
const page = (el: HTMLElement) => within(el.ownerDocument.body);
const panel = async (el: HTMLElement) =>
  waitFor(() => {
    const p = q(el, '[data-resource-panel]');
    if (!p) throw new Error('no panel yet');
    return p;
  });

/** Drag a booking block by `dy` pixels (and optionally onto another column). */
function drag(block: HTMLElement, dy: number, toColumn?: HTMLElement) {
  const r = block.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + 12;
  const endX = toColumn ? toColumn.getBoundingClientRect().left + toColumn.getBoundingClientRect().width / 2 : x;
  fireEvent.pointerDown(block, { clientX: x, clientY: y, button: 0, pointerId: 1 });
  fireEvent.pointerMove(block, { clientX: endX, clientY: y + dy / 2, pointerId: 1 });
  fireEvent.pointerMove(block, { clientX: endX, clientY: y + dy, pointerId: 1 });
  fireEvent.pointerUp(block, { clientX: endX, clientY: y + dy, pointerId: 1 });
}

/** **An ordinary Thursday on Buck's ten bays**, every booking ribboned, with the legend under the toolbar. */
export const TenBaysAndRibbons: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={sheetWith(KIND, seedResourceDay(KIND, TODAY_STR, at(12)))} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-resource-column]').length).toBe(resourcesOf(KIND).length);
    await expect(q(canvasElement, '[data-resource-column="east-porch"]')).not.toBeNull();
    const blocks = [...canvasElement.querySelectorAll<HTMLElement>('[data-resource-booking]')];
    await expect(blocks.length).toBeGreaterThan(10);
    for (const b of blocks) await expect(b.getAttribute('data-ribbon')).toBeTruthy();
    await expect(q(canvasElement, `[data-legend="${NO_MEMBERSHIP.name}"]`)).not.toBeNull();
  },
};

/**
 * **A member pays the member rate; a walk-in pays the evening rate.** David Kim holds a Single Premium
 * Membership, so his 5 PM hour is Buck's *Member Sim Hour*, $40. The same hour for a walk-in is *Sim
 * Hour Evening*, $75.
 */
export const BucksFees: Story = {
  render: () => {
    const member = booking(KIND, { resourceId: 'bay-2', startMin: at(17), durationMin: 60 });
    return <Screen edition={CURRENT_EDITION.tablet} initialState={panelOn(KIND, [member], member.id)} />;
  },
  play: async ({ canvasElement }) => {
    const p = await panel(canvasElement);
    await expect(q(p, '[data-resource-fee]')!.getAttribute('data-resource-fee')).toBe('Member Sim Hour');
    await expect(q(p, '[data-resource-price]')!.textContent).toBe('$40.00');
    await expect(q(p, '[data-panel-ribbon]')!.getAttribute('data-panel-ribbon')).toBe('Single Premium Membership');
  },
};

/** **…and the walk-in.** No customer record, so no membership: grey ribbon, *Sim Hour Evening*. */
export const AWalkInPaysTheEveningRate: Story = {
  render: () => {
    const walkIn: ResourceBooking = { ...booking(KIND, { resourceId: 'bay-2', startMin: at(17), durationMin: 60 }), crmId: undefined, name: 'Walk-in' };
    return <Screen edition={CURRENT_EDITION.tablet} initialState={panelOn(KIND, [walkIn], walkIn.id)} />;
  },
  play: async ({ canvasElement }) => {
    const p = await panel(canvasElement);
    await expect(q(p, '[data-resource-fee]')!.getAttribute('data-resource-fee')).toBe('Sim Hour Evening');
    await expect(q(p, '[data-resource-price]')!.textContent).toBe('$75.00');
  },
};

/**
 * **Buck's daily limit, with an override.** David Kim already has two bays today; tapping open time
 * for a third and pressing Book says which two he has. *Book anyway* books it — Buck lets staff.
 */
export const TheDailyLimit: Story = {
  render: () => {
    const morning = booking(KIND, { resourceId: 'bay-1', startMin: at(9) });
    const lunch = booking(KIND, { resourceId: 'bay-2', startMin: at(12) });
    return <Screen edition={CURRENT_EDITION.tablet} initialState={sheetWith(KIND, [morning, lunch])} />;
  },
  play: async ({ canvasElement }) => {
    tapAt(canvasElement, KIND, 'bay-4', at(17));
    const p = within(await panel(canvasElement));
    // A tapped booking starts as a walk-in; put David Kim on it, as the customer picker would.
    await userEvent.click(p.getByRole('button', { name: /Walk-in/ }));
    const dialog = within(await page(canvasElement).findByRole('dialog'));
    await userEvent.type(dialog.getByRole('textbox'), 'Kim, David');
    await userEvent.click(await dialog.findByText('Kim, David'));
    await waitFor(() => expect(p.getByText('Kim, David')).toBeTruthy());
    await userEvent.click(p.getByRole('button', { name: 'Book' }));
    const warn = await waitFor(() => q(canvasElement, '[data-daily-limit]')!);
    await expect(warn.textContent).toContain('already has 2 bookings today (Bay 1 at 9:00 AM and Bay 2 at 12:00 PM)');
    await userEvent.click(within(warn).getByRole('button', { name: 'Book anyway' }));
    await waitFor(() => expect(q(canvasElement, '[data-resource-panel]')).toBeNull());
    await expect(canvasElement.querySelectorAll('[data-resource-booking]').length).toBe(3);
    await page(canvasElement).findByText('Bay 4 booked · daily limit overridden');
  },
};

/** **Drag to move, then undo.** Down an hour in Bay 1; the toolbar offers Undo move, which puts it back. */
export const DragToMoveAndUndo: Story = {
  render: () => {
    const a = booking(KIND, { resourceId: 'bay-1', startMin: at(10), durationMin: 60 });
    return <Screen edition={CURRENT_EDITION.tablet} initialState={sheetWith(KIND, [a])} />;
  },
  play: async ({ canvasElement }) => {
    const block = () => q(canvasElement, '[data-resource-booking]')!;
    drag(block(), 60 * PPM);
    await waitFor(() => expect(block().getAttribute('aria-label')).toContain('11:00 AM'));
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Undo move/ }));
    await waitFor(() => expect(block().getAttribute('aria-label')).toContain('10:00 AM'));
  },
};

/** **Drag across to another bay.** Bay 1 to Bay 3, same time. */
export const DragToAnotherBay: Story = {
  render: () => {
    const a = booking(KIND, { resourceId: 'bay-1', startMin: at(10), durationMin: 60 });
    return <Screen edition={CURRENT_EDITION.tablet} initialState={sheetWith(KIND, [a])} />;
  },
  play: async ({ canvasElement }) => {
    drag(q(canvasElement, '[data-resource-booking]')!, 0, q(canvasElement, '[data-resource-column="bay-3"]')!);
    await waitFor(() => expect(q(canvasElement, '[data-resource-column="bay-3"] [data-resource-booking]')).not.toBeNull());
  },
};

/** **A refused move says why** — the booking in the way, by name and time — and nothing moves. */
export const ARefusedMoveSaysWhy: Story = {
  render: () => {
    const a = booking(KIND, { resourceId: 'bay-1', startMin: at(10), durationMin: 60 });
    const b = { ...booking(KIND, { resourceId: 'bay-1', startMin: at(11), durationMin: 60 }), crmId: 'M001', name: 'Ortiz, Sam' };
    return <Screen edition={CURRENT_EDITION.tablet} initialState={sheetWith(KIND, [a, b])} />;
  },
  play: async ({ canvasElement }) => {
    const a = q(canvasElement, '[data-resource-booking="bay-1-600"]')!;
    drag(a, 60 * PPM);
    await page(canvasElement).findByText('Bay 1 has Ortiz, Sam from 11:00 AM to 12:00 PM.');
    await expect(a.getAttribute('aria-label')).toContain('10:00 AM');
  },
};

/** **A porch sim holds one.** The golfer stepper stops at 1, and the label says why. */
export const CapacityStopsTheParty: Story = {
  render: () => {
    const a = { ...booking(KIND, { resourceId: 'east-porch', startMin: at(10), durationMin: 60 }), players: 1 };
    return <Screen edition={CURRENT_EDITION.tablet} initialState={panelOn(KIND, [a], a.id)} />;
  },
  play: async ({ canvasElement }) => {
    const p = within(await panel(canvasElement));
    await expect(p.getByText(/East Porch Sim holds 1/)).toBeTruthy();
    await expect(p.getByRole('button', { name: 'Increase golfers' })).toBeDisabled();
    await userEvent.click(p.getByRole('button', { name: '+1h' }));
    await waitFor(() => expect(p.getByText(/11:00 AM – 12:00 PM|10:00 AM – 12:00 PM/)).toBeTruthy());
  },
};
