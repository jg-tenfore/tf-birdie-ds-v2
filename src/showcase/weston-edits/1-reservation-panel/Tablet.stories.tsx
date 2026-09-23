import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Screen, atVenue } from '../../pos/screen-helpers';
import { DEFAULT_TEE_SHEET_SETTINGS } from '../../../pos/data/courses';
import { adjustedParty, earlyFrontNine, lateBackNine, openParty, sheetWithCustomer,
  sheetWithPanel, twilightNine } from '../tablet-scenarios';

/**
 * Weston Edits / 1 · Reservation Panel / Tablet
 *
 * What a tee time opens into. This is the section every other one sits inside: rate editing,
 * per-seat carts, punch cards and the customer record are all things that happen *in* this
 * panel.
 *
 * Weston's Loom: *"When you click on a tee time… it pulls it into the cart and it's opening it
 * like it's an order. But the order comes after the golf."* He asked for it as *"a slide-over
 * panel… so you're not losing the context of where you're working on the tee sheet"*, and named
 * the case: *"If we click on Morris G, a slide-over panel with the tee time details/
 * reservation."*
 *
 * So in the Weston edition a booking chip no longer loads the register. It opens this panel from
 * the right: header facts on top, then **Players · Financial · Notes · Activity**, and **Check
 * in & pay** pinned at the foot. The tee sheet **narrows** into the room left of it as it slides
 * in — every column tightens, no tee time is hidden under the panel, and there is no sideways
 * scrolling — and clicking another booking switches the panel rather than closing it. Nothing
 * reaches the cart until Check in & pay. The right-click menu keeps every item it had;
 * **Booking details** opens this panel instead of the old dialog.
 *
 * ## The component
 *
 * `ReservationPanel` (`src/pos/components/ReservationPanel.tsx`). Deliberately **not** a `Modal`:
 * it is a sibling of the tee sheet inside `PosShell`, positioned absolutely against it, which is
 * exactly what lets the sheet stay live and clickable beside it. A dialog opened *from* the
 * panel — the customer record, cart signout, a confirm — layers over it and leaves it standing.
 *
 * Four pieces make it up, and three of them have their own section:
 *
 * | Part | Where | What it is |
 * |---|---|---|
 * | `ReservationContent` | same file | Header, tabs, body, footer — shared by the slide-over and the modal comparison, so the two can never drift |
 * | `NextInLine` | same file | The **‹ n of m ›** stepper between the header and the ✕. See 15 |
 * | `CheckInFooter` | same file | What the reservation will charge, and the one primary action. See 6 |
 * | `PlayerRows` | `components/PlayerRows.tsx` | The Players tab's body. See 2 |
 *
 * The sheet's half of the behaviour lives in `components/use-scroll-booking-into-view.ts`:
 * `usePanelSqueeze` (the right margin the grid and list take) and `useScrollBookingIntoView`
 * (bringing the opened booking into view beside the panel).
 *
 * ## The state
 *
 * `ReservationPanelState` in `src/pos/state/pos-store.ts`. The panel is state, not a component
 * flag — which is why a story can declare one open rather than clicking to it.
 *
 * | Field | Values | Default | What it does |
 * |---|---|---|---|
 * | `bookingId` | a booking id | — | Which reservation. Changing it switches the panel in place |
 * | `tab` | `players` · `financial` · `notes` · `activity` | `players` | Which body renders (`RESERVATION_TABS`) |
 * | `playerIndex` | number | `0` | Carried from the removed Customer tab. Still written and still in the URL; nothing on the tablet reads it any more — see **Still open** |
 * | `presentation` | `panel` · `modal` | `panel` | Slide-over, or the centred dialog comparison below |
 * | `width` | `standard` · `wide` · `cover` | falls back to `state.weston.panelWidth` (`standard`) | How wide the panel runs. See 10 |
 * | `backdrop` | `squeeze` · `scrim` | `squeeze` | What the tee sheet does while it is open. **Sections 1–4 all squeeze** — the scrim is scoped to 10 |
 *
 * ## Deep links
 *
 * `src/pos/state/url-state.ts`. The panel is linkable; the variants are not.
 *
 * | Query | Meaning |
 * |---|---|
 * | `?res=<booking>` | Open the panel on that booking. A booking this club doesn't have drops the panel rather than rendering an empty frame |
 * | `&res-tab=<tab>` | One of the four. Omitted for `players`; a tab that isn't one of the four degrades to `players` |
 * | `&res-p=<n>` | `playerIndex`. Negative or non-integer degrades to `0` |
 *
 * An old `?res-tab=customer` link — saved before round 3 removed the tab — opens the right
 * booking on **Players** instead of breaking. There is a test pinning that.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 1366 × 840 (`shell` in `theme/tokens.ts`) |
 * | Width | **640** (`PANEL_WIDTHS.standard`). `theme/tokens.ts`'s `reservationPanel.width` (480) is the pre-round-3 number and nothing reads it any more |
 * | z-index | 80 — over the tee-sheet toolbar (40) and the multi-select bar (60), under popovers and dialogs |
 * | Surface | `md3.onPrimary` (#ffffff), 1px `md3.outlineVariant` on the left edge, `elevation.e3` |
 * | Motion | `.22s cubic-bezier(.2,0,0,1)` (`reservationPanel.motion`). The panel slides `translateX(100%) → 0`; the sheet's `margin-right` animates on the same easing, so the two move as one |
 * | Squeeze | `margin-right: PANEL_WIDTHS[width]` on `[data-panel-squeeze]`. Zero at `cover` (nothing left to squeeze) and zero under a scrim |
 * | Scroll-into-view | 16px clearance below `[data-sticky-header]`; an off-screen booking is centred vertically, an on-screen one is not moved at all |
 * | Tabs | `variant="fullWidth"`, 40px tall, 1px `md3.outlineVariant` underline |
 * | Modal comparison | MUI `Dialog`, paper 620 × `min(740px, 90%)` |
 * | Order rail | 320px expanded (`grid.leftPanelW`), 56px collapsed. See 13 |
 *
 * ## Scope
 *
 * Weston edition only (`<Screen edition="weston" />`), on the **18-hole club**. Both tee-sheet
 * modes are covered — the grid and the list narrow and scroll alike. The base edition has no
 * panel at all; clicking a chip there still loads the register.
 *
 * Still pending: whether this ships as a slide-over or as the centred dialog, and at which
 * width. Both are below, and both are Weston's call.
 *
 * ## The stories
 *
 * | Story | What it is for |
 * |---|---|
 * | **Over The Tee Sheet** | The panel open on an unpaid party, beside a squeezed sheet. The reference shot |
 * | **Click A Booking Opens It** | Clicks a chip on a live sheet. Asserts the panel opened on Players *and* that the order is still empty — "the order comes after the golf", as a test |
 * | **Switches Booking** | Clicks a second chip while the panel is open; the panel switches rather than closing |
 * | **Customer Record Over Panel** | The record layered over the panel, opened from a player's name. The panel keeps its place underneath. See 4 |
 * | **Financial Tab** · **Notes Tab** · **Activity Tab** | The other three tabs. See 5 |
 * | **Modal Comparison** | The same `ReservationContent` as a centred dialog — the other way Weston said he "can be convinced" of |
 * | **Opening Scrolls Into View** | A booking late on the back nine, on a sheet that starts at 6:00 AM. Asserts it ends up wholly visible, below the sticky header and left of the panel |
 * | **Opening Scrolls Into View List** | The same in list view, where the cards reflow as the list narrows |
 * | **Already Visible Does Not Jump** | Clicks an early front-nine chip and asserts `scrollTop`/`scrollLeft` are unchanged 600ms later. No jump |
 * | **Squeezes The Sheet** | Asserts the grid has **no** sideways overflow and that every chip's right edge lands left of the panel — the claim, measured rather than described |
 *
 * ## Still open
 *
 * - **Slide-over or modal.** Weston can be convinced either way; **Modal Comparison** is the
 *   other way, on the same booking, so the choice can be made by looking.
 * - **Width.** 640 ships; 820 and cover are one click away in 10.
 * - **`playerIndex` is vestigial.** It survives on the state and in the URL from the Customer
 *   tab, and `CustomerTab.tsx` — the only component that ever read it — is no longer rendered
 *   anywhere. It is harmless, but it is dead weight until someone decides whether a link should
 *   be able to name a seat.
 * - **`presentation` is not linkable**, by design: a prototype URL never carries a variant.
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
