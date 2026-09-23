import type { Meta, StoryObj } from '@storybook/react-vite';
import { Screen } from '../../pos/screen-helpers';
import { adjustedParty, noShowParty, openParty, paidTwilight, sheetWithPanel } from '../tablet-scenarios';

/**
 * Weston Edits / 5 · Financial, Notes & Activity / Tablet
 *
 * The rest of the old Booking Detail dialog, moved into the panel so the reservation is one
 * place. Weston's ask was that the golf be worked before the order — "you're still massaging
 * the reservation before you submit it to the cart" — and the balance, the notes and the
 * history are part of that reservation. Moving them meant *not* rewriting them: these are the
 * same three components the dialog renders, so the slide-over and the dialog cannot drift into
 * two ideas of what a booking owes.
 *
 * One behavioural change, in both: **Financial** reads each player's own fee, so a seat
 * switched to 18 holes, put on another rate or given a typed-over price owes that, not the
 * booking's flat rate.
 *
 * ## The component
 *
 * `src/pos/components/BookingTabs.tsx` — three exported bodies plus the round-progress rail,
 * with no chrome of their own. `ReservationPanel` renders them for tabs 2–4 of
 * `RESERVATION_TABS` (`players · financial · notes · activity`); the base edition's
 * `src/pos/modals/BookingDetail.tsx` renders the same three at its tabs 2–4. One copy, two
 * surfaces.
 *
 * | Export | What it renders | What it reads off the booking |
 * |---|---|---|
 * | `BookingFinancial` | Balance, per-player money, group actions, the financial trail | `playerStates[].fee · .paid · .noShow`, `price`, `financialActions` |
 * | `BookingNotes` | Tags, group note, per-player notes | `tags` (default `[]`), `groupNote ?? note`, `playerNotes` (default `{}`) |
 * | `BookingActivity` | The audit trail | `activityLog`, `financialActions`, else a seed from `timeMin` / `playerStates` |
 * | `RoundRail` | The five `ROUND_STEPS` as clickable dots. `dense` is the panel's one-line form | `playerStates[i].step` via `roundStepOf` |
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Outstanding | `reservationDue(b, rateContext(state))` — unpaid, non-no-show seats, **net** of a discount or punch card (`seatNetGreenFee`) |
 * | Per-player amount | `playerFee(b, i, rates)` — the seat's own fee, **gross**. `Paid` in green, `—` for a no-show |
 * | Rate per player | `b.price`, with `· adjusted per player` appended when any seat's `playerFee` differs from it |
 * | Balance colours | owed > 0 → `md3.error`; settled → `#16a34a` |
 * | Refund / rain check | Per player and per group. Appends to `financialActions` and sets `pay` to `refund` or `rain_chk`; the row icons are `reply` and `wb_cloudy` |
 * | Timestamps | `demoNow()` — May 21 2026, 12:00 PM — so a logged action reads the same in every screenshot |
 * | Tags | Five: VIP · Rain check · Accessibility · Birthday · Corporate. Applied on tap, no save |
 * | Group note | Written to **both** `groupNote` and `note`, because `note` is what the tee-sheet chip and the register's golf summary print |
 * | Player notes | Keyed by seat index; surface on that player's line at point of sale |
 * | Notes save | One **Save notes** commit for both text fields (tags are immediate) |
 * | Activity seed | Booking created at `timeMin − 240`, Payment taken at `−30` (when any seat is paid), Checked in at `−15` (when any seat has started) |
 * | Panel body | Scrolls independently at `14px 16px`; the `CheckInFooter` below it never scrolls away |
 *
 * ## Scope
 *
 * The **tabs** are Weston-edition only — they only exist because the panel does. The
 * **components** are shared, so the per-player fee reading in Financial reaches the base
 * edition's Booking Detail dialog in all eight prototypes. Nothing here is edition-branched;
 * the two surfaces differ only in what wraps them.
 *
 * ## The stories
 *
 * | Story | Booking | Tab | What it is for |
 * |---|---|---|---|
 * | **FinancialAdjusted** | `adjustedParty()` — Kim linked (member rate), seat 3 on 18, booker typed to $25 | Financial | The sum of four different fees, and the `· adjusted per player` note that says why it isn't 4 × `price` |
 * | **FinancialPaid** | `paidTwilight()` — Morris, G. from the Loom | Financial | Nothing outstanding, every seat **Paid**, balance in green |
 * | **FinancialNoShow** | `noShowParty()` | Financial | Nobody owes, every amount `—`, and the rain-check trail is where the action is |
 * | **Notes** | `openParty()` | Notes | Tags, the group note that reaches the chip and the cart, per-player notes |
 * | **Activity** | `paidTwilight()` | Activity | The seeded trail — created, paid, checked in — so the tab is never empty |
 *
 * ## Still open
 *
 * **The per-player row is gross; the balance above it is net.** Round 3 put discounts and punch
 * cards behind a seat's price and ran them through `seatNetGreenFee`, which `reservationDue`
 * reads — so Outstanding is correct. The **Per player** rows still print `playerFee`, the rate
 * before the concession, so a seat comped by a discount preset or settled by a punch card shows
 * its rate here while the balance above has already taken it off. A seat whose fee was *typed*
 * to $0 reads $0.00, because that is `playerFee` too. This is the same display-only class of
 * bug round 3 fixed in the cart; it has not been carried into this tab yet.
 *
 * **Refund and rain check log, they do not move money.** Both write a trail entry and flip
 * `pay`; no amount is chosen, no tender is reversed. What a real refund asks for — which seats,
 * how much, back to what — is undecided.
 *
 * **Activity is seeded, not recorded.** Demo bookings carry no `activityLog`, so three plausible
 * events are synthesised from the booking's state. Edits made in the panel do not append to it.
 */
const meta = {
  title: 'Weston Edits/5 · Financial, Notes & Activity/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * Financial on an adjusted party: the outstanding balance is the sum of each player's own
 * fee (the 18-hole player owes more, the booker's $25 less), and the rate line says it is
 * adjusted per player. Refund and rain check stay per player.
 */
export const FinancialAdjusted: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(adjustedParty(), 'financial')} />,
};

/** Financial on a paid booking — nothing outstanding; the same $29 the reservation shows. */
export const FinancialPaid: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(paidTwilight(), 'financial')} />,
};

/** Financial on a no-show party: nobody owes, and the rain-check trail is where action is. */
export const FinancialNoShow: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(noShowParty(), 'financial')} />,
};

/** Notes: tags, the group note (shown on the chip and cart), and per-player notes. */
export const Notes: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty(), 'notes')} />,
};

/** Activity: the audit trail, seeded from the booking's state so it is never empty. */
export const Activity: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(paidTwilight(), 'activity')} />,
};
