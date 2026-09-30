import { fireEvent } from 'storybook/test';
import { PPM } from '../../pos/components/ResourceSheetView';
import { SHEETS, type ResourceBooking, type ResourceKind } from '../../pos/data/resources';
import type { PosState } from '../../pos/state/pos-store';
import { TODAY_STR, atVenue } from '../pos/screen-helpers';

/**
 * State for the court and bay sheet stories.
 *
 * Interaction stories use **hand-built days** rather than the seeded ones, so a story can say
 * "Tennis Court 2 is empty" or "the next booking starts at 11:00" and mean it. The seeded day is
 * for the stories that show what the sheet looks like on an ordinary Thursday.
 */

export const at = (h: number, m = 0) => h * 60 + m;

export function booking(kind: ResourceKind, over: Partial<ResourceBooking> & Pick<ResourceBooking, 'resourceId' | 'startMin'>): ResourceBooking {
  return {
    id: `${over.resourceId}-${over.startMin}`,
    kind,
    date: TODAY_STR,
    durationMin: SHEETS[kind].defaultDurationMin,
    name: 'Kim, David',
    crmId: 'G004',
    phone: '(555) 010-4471',
    players: 2,
    checkedIn: false,
    paid: false,
    ...over,
  };
}

/**
 * A sheet showing exactly `bookings`. The day is marked seeded, so the sheet does not top it up
 * with generated bookings the story did not ask for.
 */
export function sheetWith(kind: ResourceKind, bookings: ResourceBooking[], extra: Partial<PosState> = {}): Partial<PosState> {
  return atVenue('eighteen', {
    view: kind === 'court' ? 'courts' : 'bays',
    leftPanelCollapsed: true,
    resourceBookings: bookings,
    resourceSeeded: [`${kind}|${TODAY_STR}`],
    ...extra,
  });
}

/** The same, with one booking's panel open. */
export function panelOn(kind: ResourceKind, bookings: ResourceBooking[], id: string): Partial<PosState> {
  return sheetWith(kind, bookings, { resourcePanel: { bookingId: id } });
}

/**
 * Tap a column at an exact minute.
 *
 * The coordinates are computed from the column's own rectangle, so the tap lands on the same
 * minute however far the sheet has scrolled — `userEvent.click` would aim at the element's
 * centre, which on a fifteen-hour column is somewhere the story did not choose.
 */
export function tapAt(canvas: HTMLElement, kind: ResourceKind, resourceId: string, minute: number) {
  const col = canvas.querySelector<HTMLElement>(`[data-resource-column="${resourceId}"]`)!;
  const rect = col.getBoundingClientRect();
  const y = rect.top + (minute - SHEETS[kind].openMin) * PPM + 4;
  fireEvent.click(col, { clientX: rect.left + rect.width / 2, clientY: y });
}
