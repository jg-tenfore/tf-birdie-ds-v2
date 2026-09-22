import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Screen, atVenue } from '../../pos/screen-helpers';
import { DEFAULT_TEE_SHEET_SETTINGS } from '../../../pos/data/courses';
import { adjustedParty, earlyFrontNine, lateBackNine, openParty, sheetWithCustomer,
  sheetWithPanel, twilightNine } from '../tablet-scenarios';

/**
 * Weston Edits / 1 · Reservation Panel / Tablet
 *
 * Weston's Loom, on the tablet: "When you click on a tee time… it pulls it into the cart and
 * it's opening it like it's an order. But the order comes after the golf." Birdie today opens
 * the reservation first, and he asked for it as "a slide-over panel… so you're not losing the
 * context of where you're working on the tee sheet".
 *
 * So in the Weston edition a booking chip no longer loads the register. It opens this panel
 * from the right: header facts on top, then **Players · Customer · Financial · Notes ·
 * Activity**, and **Check in & pay** pinned at the foot. The tee sheet **narrows** to the
 * room left of it as it slides in — every column tightens, no tee time is hidden under the
 * panel, and there is no sideways scrolling — and clicking another booking switches the
 * panel. Nothing reaches the cart until Check in & pay. The right-click menu keeps all its
 * items; "Booking details" opens this panel.
 *
 * The panel is state (`reservationPanel` in `pos-store.ts`) and deep-links as
 * `?res=<booking>&res-tab=<tab>&res-p=<player>`.
 */
const meta = {
  title: 'Weston Edits/1 · Reservation Panel/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * The panel open beside the 18-hole club's tee sheet on an unpaid party. The sheet narrows
 * to the space left of the panel, so both nines and the time gutter stay in view — the
 * operator is still "working on the tee sheet" — and the panel shows the golf first: who is
 * playing, how many holes, what each pays, how they get round.
 */
export const OverTheTeeSheet: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
};

/**
 * Clicking a booking chip opens the panel — not the register. Weston: "If we click on Morris
 * G, a slide-over panel with the tee time details/reservation." The play test clicks a chip
 * on the sheet and checks the panel opened and the order is still empty.
 */
export const ClickABookingOpensIt: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen')} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const b = openParty();
    const chip = await waitFor(() => {
      const el = canvasElement.querySelector<HTMLElement>(`[data-booking-id="${b.id}"]`);
      if (!el) throw new Error('chip not rendered yet');
      return el;
    });
    await userEvent.click(chip);
    const panel = await canvas.findByRole('complementary', { name: `Reservation · ${b.name}` });
    await expect(within(panel).getByRole('tab', { name: 'Players', selected: true })).toBeTruthy();
    // Still the tee sheet, and nothing on the order.
    await expect(canvas.queryByText('Select a category')).toBeNull();
  },
};

/**
 * Clicking a second booking while the panel is open switches it — the sheet is "interactive-
 * ish" beside the panel, so an operator can walk down the column without closing anything.
 */
export const SwitchesBooking: Story = {
  render: () => (
    <Screen edition="weston" initialState={sheetWithPanel(openParty())} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const next = twilightNine();
    const chip = await waitFor(() => {
      const el = canvasElement.querySelector<HTMLElement>(`[data-booking-id="${next.id}"]`);
      if (!el) throw new Error('chip not rendered yet');
      return el;
    });
    await userEvent.click(chip);
    await canvas.findByRole('complementary', { name: `Reservation · ${next.name}` });
  },
};

/**
 * The customer record, opened from a player's name and layered over the panel. The panel keeps
 * its place underneath — closing the record returns to it untouched. See 4 · Customer Profile.
 */
export const CustomerRecordOverPanel: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(adjustedParty(), 1)} />,
};

/** The Financial tab — per-player amounts, refunds and rain checks. See 5. */
export const FinancialTab: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(adjustedParty(), 'financial')} />,
};

/** The Notes tab — tags, the group note, and per-player notes. See 5. */
export const NotesTab: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty(), 'notes')} />,
};

/** The Activity tab — the booking's audit trail. See 5. */
export const ActivityTab: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty(), 'activity')} />,
};

/**
 * **Modal comparison.** The same panel content as a centred dialog over the sheet — Weston
 * said he "can be convinced either way", so here is the other way. The dialog is wider and
 * dims the sheet; the slide-over keeps the sheet readable and clickable, which is the
 * "not losing the context" argument. Only the presentation differs: header, tabs, rows and
 * Check in & pay are the one `ReservationContent`.
 */
export const ModalComparison: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel(adjustedParty(), 'players', { panel: { presentation: 'modal' } })}
    />
  ),
};

// ─── Scroll into view ───────────────────────────────────────────────────────

/**
 * The sheet opens at 6:00 AM rather than at the demo "now" (noon), so a late tee time starts
 * well off screen.
 */
const fromTheTop = { settings: { ...DEFAULT_TEE_SHEET_SETTINGS, autoScrollNow: false } };

/** The nearest ancestor that scrolls — the grid's or the list's scroller. */
function scrollParent(el: HTMLElement): HTMLElement {
  for (let n = el.parentElement; n; n = n.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(n).overflowY)) return n;
  }
  return document.documentElement;
}

/** True when the booking is wholly inside its scroller, below any sticky header, left of the panel. */
function inViewBesidePanel(canvasElement: HTMLElement, bookingId: string): boolean {
  const el = canvasElement.querySelector<HTMLElement>(`[data-booking-id="${bookingId}"]`);
  if (!el) return false;
  const scroller = scrollParent(el);
  const header = scroller.querySelector<HTMLElement>('[data-sticky-header]');
  const panel = canvasElement.querySelector<HTMLElement>('[data-reservation-panel]');
  const shell = canvasElement.querySelector<HTMLElement>('[data-pos-shell]');
  const panelLeft = panel && shell ? shell.getBoundingClientRect().right - panel.offsetWidth : Infinity;
  const s = scroller.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return (
    r.top >= s.top + (header?.offsetHeight ?? 0) - 1 &&
    r.bottom <= s.top + scroller.clientHeight + 1 &&
    r.left >= s.left - 1 &&
    r.right <= Math.min(s.left + scroller.clientWidth, panelLeft) + 1
  );
}

/**
 * **Opening the panel scrolls the tee sheet.** The panel opens on a booking late on the back
 * nine — off the bottom of a sheet that starts at 6:00 AM. The sheet narrows beside the
 * panel, so the back nine is still on screen, and scrolls down, smoothly, until that tee
 * time's row is in view. The play test waits for the booking to be wholly visible left of
 * the panel.
 */
export const OpeningScrollsIntoView: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(lateBackNine(), 'players', fromTheTop)} />,
  play: async ({ canvasElement }) => {
    const b = lateBackNine();
    await within(canvasElement).findByRole('complementary', { name: `Reservation · ${b.name}` });
    await waitFor(() => expect(inViewBesidePanel(canvasElement, b.id)).toBe(true), { timeout: 4000 });
  },
};

/**
 * The same in the **list view**: while the panel is open the list narrows beside it (the
 * cards reflow), and the opened booking scrolls into view there, outlined.
 */
export const OpeningScrollsIntoViewList: Story = {
  render: () => (
    <Screen edition="weston" initialState={sheetWithPanel(lateBackNine(), 'players', { ...fromTheTop, teeSheetMode: 'list' })} />
  ),
  play: async ({ canvasElement }) => {
    const b = lateBackNine();
    await waitFor(() => expect(inViewBesidePanel(canvasElement, b.id)).toBe(true), { timeout: 4000 });
  },
};

/**
 * Opening a tee time that's already on screen doesn't move the sheet: clicking an early
 * front-nine chip opens the panel and the sheet stays exactly where it was — no jump.
 */
export const AlreadyVisibleDoesNotJump: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', fromTheTop)} />,
  play: async ({ canvasElement }) => {
    const b = earlyFrontNine();
    const chip = await waitFor(() => {
      const el = canvasElement.querySelector<HTMLElement>(`[data-booking-id="${b.id}"]`);
      if (!el) throw new Error('chip not rendered yet');
      return el;
    });
    const scroller = scrollParent(chip);
    const before = { top: scroller.scrollTop, left: scroller.scrollLeft };
    await userEvent.click(chip);
    await within(canvasElement).findByRole('complementary', { name: `Reservation · ${b.name}` });
    await new Promise((r) => setTimeout(r, 600));
    await expect({ top: scroller.scrollTop, left: scroller.scrollLeft }).toEqual(before);
  },
};

/**
 * **The panel squeezes the sheet, it doesn't cover it.** While the panel is open the grid
 * takes a right margin the panel's width, animated with the panel's slide: the columns
 * tighten, and nothing is left under the panel or off to the side. The play test checks the
 * grid has no sideways overflow and that every booking chip ends left of the panel.
 */
export const SqueezesTheSheet: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    const panel = await within(canvasElement).findByRole('complementary', { name: `Reservation · ${openParty().name}` });
    const scroller = canvasElement.querySelector<HTMLElement>('[data-tee-sheet-scroller]')!;
    // After the slide (and the margin) finish.
    await new Promise((r) => setTimeout(r, 400));
    await expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
    const edge = panel.getBoundingClientRect().left;
    const chips = [...scroller.querySelectorAll<HTMLElement>('[data-booking-id]')];
    await expect(chips.length).toBeGreaterThan(0);
    await expect(chips.filter((c) => c.getBoundingClientRect().right > edge + 1).map((c) => c.dataset.bookingId)).toEqual([]);
  },
};
