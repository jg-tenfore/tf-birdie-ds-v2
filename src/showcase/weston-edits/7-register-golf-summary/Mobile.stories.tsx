import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { money, orderTotals } from '../../../pos/logic/cart';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, loadedOrder, partlyPaidNamed } from '../mobile-scenarios';

/**
 * Weston Edits / 7 · Register Golf Summary / Mobile
 *
 * On the phone's order screen, golf from a reservation becomes a **read-only summary** —
 * players, holes, fee, transport — with **Edit reservation**. The per-player modifier push
 * and the player stepper are gone from golf lines: "modifiers are used for food and
 * beverage", and the golf was settled on the reservation. F&B and retail keep their
 * steppers.
 *
 * **Edit reservation** jumps to the reservation on the **Tee Sheet** destination
 * (`nav.openIn('tee', …)`) rather than pushing it over the order: the reservation's home is
 * the tee sheet, each destination keeps its own stack, and the order stays on the Register
 * destination (badge and all). When the order is next opened, its golf lines re-sync from
 * the reservation, keeping everything else on the order.
 *
 * ## The component
 *
 * `GolfSummary` in `src/pos/mobile/screens/register/OrderScreen.tsx`, on route `order`
 * (presentation **push**). It renders when `golfSummary` is true — the Weston edition, a
 * booking attached to the order, and a check-in line on it — and replaces the editable round
 * block, its player stepper and its per-seat modifier push.
 *
 * | Piece | Where from | What it does |
 * |---|---|---|
 * | `item` | the cart's check-in line | Every seat printed comes from the **cart**, so the card cannot disagree with the total |
 * | per-seat money | `playerBreakdown(unit, {…p, paid: false, noShow: false})` | A settled seat still shows what it cost, struck through — it is on the order, not on the bill |
 * | `editReservation(nav, id)` | same file | `nav.openIn('tee', { name: 'bookingDetail', bookingId })` — a destination jump |
 * | `staleGolf` | `golfLines(cart)` vs `golfLines(buildTeeTimeCart(b, courses, rates, state.orderSeats ?? undefined))` | Detects a reservation edited underneath the order |
 * | the re-sync | `rebuildOrderSeats` when `orderSeats` is set, else `loadBooking` | Reprices the **same seats**, so a split bill stays split |
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 402 × 797 (`mobile.frame`) |
 * | Card | `mx: 2`, `radius.md`, a 1px `md3.outlineVariant` border, rows divided by the same rule |
 * | Seat row | `minHeight: mobile.listItem.two` (**72**) — well over the 48 touch floor, because each row carries three lines |
 * | Line 1 | avatar · name (dimmed when the seat is unnamed) · member dot · ID.me badge |
 * | Line 2 | `{holes} holes · {transport}` and `· paid` / `· no-show` |
 * | Line 3 | `Tee fee $x` and `+ cart $y` when there is transport |
 * | Right | the seat total; **struck through** and in `md3.outline` when paid or a no-show |
 * | Header | `Golf · {round name}`, with **Edit reservation** as a small text button in the subheader action slot |
 * | Footnote | *Players, holes, tee fees and transport come from the reservation. Add food, drinks and retail below.* |
 * | Tax | `orderMoney` → `orderTotals`, identical to the terminal's |
 *
 * ## Scope
 *
 * Weston edition, phone, order screen, booking-backed orders only. A counter-rung round with no
 * reservation keeps the stepper and the modifier push. **BeforeWestonEdits** renders the base
 * edition on the same order for comparison.
 *
 * ## The stories
 *
 * | Story | Order | What it is for |
 * |---|---|---|
 * | **GolfSummary** | `loadedOrder(adjustedParty(), { extras: true })` | The whole shape: golf as a card, a Gatorade ×2 and a sleeve below with their steppers, one total |
 * | **EditReservation** | same | The play test taps it and lands on the Tee Sheet destination, on this booking's reservation |
 * | **PaidSeats** | `loadedOrder(partlyPaidNamed())` | Paid seats stay on the card so the party reads whole — struck through, not charged |
 * | **BeforeWestonEdits** | the same order, `edition="base"` | Golf as tappable player rows that push per-player modifiers, plus a round stepper — the order-first flow Weston flagged |
 * | **RetailIsTaxed** | `GolfSummary`'s order | Asserts the order's Tax and Total rows against `orderTotals`: golf by its tax line, the drink and the sleeve at the sales-tax rate |
 *
 * ## Where the phone differs from the tablet, and why
 *
 * **Edit reservation changes destination rather than opening a layer.** The tablet slides the
 * panel back over the register, so both are on screen. The phone has one screen, so it moves
 * you to the Tee Sheet destination and leaves the order sitting on the Register destination
 * with its badge — the same jump the order's *View booking* always made.
 *
 * **That is what forces the re-sync.** Because the reservation can be edited while the order is
 * parked on another destination, the order screen compares its golf lines against the booking
 * on every render and rebuilds when they differ. The tablet does not need this: the panel's
 * **Update order** is the only way out of an edit.
 *
 * **Each seat gets three lines, not one.** At 402px there is no room for the tablet's single
 * row of name · holes · glyph · amount, so the fee and the cart fee are spelled out
 * underneath — which also makes the transport charge legible without opening anything.
 *
 * ## Still open
 *
 * **The re-sync compares by `JSON.stringify` on every render.** It is correct and cheap at four
 * seats, but it is a string comparison of two cart shapes standing in for "has the reservation
 * changed". A real build wants the reservation to tell the order, not the order to keep asking.
 *
 * **A cheap seat still does not say why.** The card breaks an amount into tee fee and cart; the
 * discount reason and punch-card name that round 3 put on the reservation's player row do not
 * reach the order. Same gap as the tablet's summary.
 */
const meta = {
  title: 'Weston Edits/7 · Register Golf Summary/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * The order after Check in & pay, with a drink and a sleeve of balls added: the golf as a
 * summary card, the goods below with their steppers, and the total the reservation promised
 * plus the goods.
 */
export const GolfSummary: Story = {
  render: () => <MobileStory edition="weston" initialState={loadedOrder(adjustedParty(), { extras: true })} tab="register" stack={[{ name: 'order' }]} />,
};

/** **Edit reservation**: back on the Tee Sheet destination, on this booking's reservation. */
export const EditReservation: Story = {
  render: GolfSummary.render,
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole('button', { name: 'Edit reservation' }));
  },
};

/** Paid seats stay on the summary so the whole party is visible, struck through and not charged. */
export const PaidSeats: Story = {
  render: () => <MobileStory edition="weston" initialState={loadedOrder(partlyPaidNamed())} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * For comparison, the base edition: golf lines as tappable player rows that push
 * per-player modifiers, and a player stepper on the round — the order-first flow Weston
 * flagged.
 */
export const BeforeWestonEdits: Story = {
  render: () => <MobileStory edition="base" initialState={loadedOrder(adjustedParty(), { extras: true })} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * **Retail on a tee-time order is taxed** — the phone reads the same `orderTotals` as the
 * terminal: the golf by its booking's tax line, the drink and the sleeve at the sales-tax
 * rate. The play test checks the order's Tax and Total rows against it.
 */
export const RetailIsTaxed: Story = {
  render: GolfSummary.render,
  play: async ({ canvasElement }) => {
    const t = orderTotals(loadedOrder(adjustedParty(), { extras: true }).cart ?? []);
    await expect(t.salesTax).toBeGreaterThan(0);
    const c = within(canvasElement);
    await expect((await c.findByText('Tax')).nextElementSibling?.textContent).toBe(money(t.tax));
    await expect(c.getByText('Total').nextElementSibling?.textContent).toBe(money(t.total));
  },
};
