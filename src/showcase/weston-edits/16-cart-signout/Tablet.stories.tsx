import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { CART_FLEET, availableCarts } from '../../../pos/data/carts';
import { playerName } from '../../../pos/logic/reservation';
import { Screen } from '../../pos/screen-helpers';
import {
  CARTS_OUT,
  cartsAlreadyOut,
  openParty,
  sheetWithPanel,
  withBookings,
  withCartKey,
} from '../tablet-scenarios';

/**
 * Weston Edits / 16 · Cart Signout / Tablet
 *
 * The old prototype put **Cart signout** on every player row and a key glyph on the booking once
 * a cart was out. It is a small feature with a real constraint behind it: the course owns a fixed
 * number of carts, two players cannot both be given cart 14, and the person at the counter needs
 * to know what is already gone *before* reaching for a key.
 *
 * It comes back here on the player row, beside the transport toggle, as a key glyph that turns
 * into the cart's number once one is signed out. Tapping it opens the fleet.
 *
 * ## The components
 *
 * | | |
 * |---|---|
 * | The glyph | `PlayerRows.tsx` — a `vpn_key` button labelled `{name} cart signout`, printing `PlayerState.cartKey` beside itself and turning `md3.primary` once there is one. Disabled on a locked seat |
 * | The picker | `CartSignoutModal` in `src/pos/components/CartSignout.tsx`, opened by `{ kind: 'cartSignout', bookingId, seat }` on `state.modal` |
 * | The fleet | `src/pos/data/carts.ts` — `CART_FLEET`, `signedOutCarts`, `availableCarts`, `cartHolder`, `bookingCarts` |
 * | The writes | `signOutCart` / `returnCart` in `logic/reservation.ts`, dispatched as `patchBooking` |
 *
 * **Availability is derived, never stored.** A cart is out because a seat on the day's sheet is
 * holding its number (`PlayerState.cartKey`); `availableCarts(dayBookings(state))` reads the
 * day's bookings and subtracts. That is worth saying plainly because it decides how the whole
 * feature behaves:
 *
 * - returning a cart is just **clearing that seat** — there is no second list to forget to
 *   update, and no way for the fleet view and the tee sheet to disagree;
 * - a past tee time still holds its keys, which is correct: a cart does not come back because its
 *   tee time passed;
 * - moving or deleting a booking takes its keys with it, for free.
 *
 * **A taken cart is shown, not hidden.** It is struck through, `disabled`, and its tooltip names
 * who has it and when they went out — "cart 14 is out with the 6:00" is the answer to the
 * question actually being asked. Hiding it would answer a different one.
 *
 * **Signing out a cart implies riding.** A player holding cart 14 who still reads as walking is a
 * row that contradicts itself, so `signOutCart` moves the seat to `transport: 'cart'` and clears
 * any chosen transport row. `returnCart` deliberately leaves them riding — handing the key back
 * is not a decision to walk.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Fleet | **35 carts**, numbered 1–12 and 14–36 — the numbers **skip 13**, the way most fleets do |
 * | Dialog | `ModalFrame`, 520px, icon `golf_course`, title `Cart signout · {name}` |
 * | Subtitle | `{free} of 35 available`, recomputed from the day |
 * | Number target | **4-column grid, 56dp tall**, `radius.sm`, 17px/800 — big numbers, one look and one tap, made while holding a key ring |
 * | Gap | **8px**. It was `<Stack gap={6}>`, and `gap` goes through MUI's spacing scale — so six meant 48px, which is the whole reason this grid looked the way it did |
 * | Taken | `md3.surfaceContainer` fill, `md3.outline` text, `line-through`, `disabled`, tooltip `Out with {player} · {time}` |
 * | This seat's own | `md3.primary` border on `md3.primaryContainer`, **enabled**, tooltip `Signed out to {name}` |
 * | Under the grid | "A struck-through number is already out. Hover to see who has it." then the **first 4** carts out, as `Cart {n} · {player} · {time}` |
 * | Footer | **Return cart {n}** when the seat holds one, and Cancel |
 * | Toast | `Cart {n} → {name}` on signout, `Cart {n} returned` on return |
 * | Row glyph | `vpn_key` at 14px, `md3.primary` with a number, `md3.outline` without |
 *
 * ## Scope
 *
 * Weston edition only, on the reservation panel's **Players** tab, on editable seats. The modal
 * portals to the document body, so it sits outside the panel's inert region (10 · Panel Size) and
 * stays live behind a scrim.
 *
 * The cart number also reaches **12 · Player Row Detail** — the seat's meta line picks it up as
 * `cart {n}` — and the booking's tee-sheet chip through `bookingCarts`.
 *
 * None of the four Storybook toolbar globals change this section.
 *
 * ## The stories
 *
 * Every story runs on a day where the morning's first two groups already hold **cart 14** and
 * **cart 7** (`cartsAlreadyOut`), so the picker has something real to subtract.
 *
 * | Story | State | What it is for |
 * |---|---|---|
 * | **The Key Picker** | picker open on seat 1 | The fleet as the counter sees it. Asserts **33 of 35 available**, that 14 is disabled, that its tooltip says *Out with*, and — from `availableCarts` directly — that nothing offered is held |
 * | **Signing One Out** | reservation, key not yet tapped | The round trip: tap the glyph, pick 3, and find the number **on the row** and on the seat's meta line. That is the whole point of putting it there rather than in a separate fleet screen |
 * | **The Key On The Row** | `withCartKey(openParty(), 0, 22)` | The key at rest. Nothing else about the row changes — a cart key is information about this seat, not a state the reservation is in |
 * | **Returning It** | picker open on a seat holding 22 | 22 shows **selected**, not struck through: it is not "taken" from this player's point of view, it is theirs. Returns it, reopens, and finds 22 offered again with the count up by one (32 → 33) |
 *
 * ## Still open
 *
 * - **The fleet is one pool.** No cart types, no out-of-service flag, no maintenance. A course
 *   with ten range carts and twenty-five ride carts cannot express that here.
 * - **Nothing ever ends a round.** Keys come back only by someone pressing Return, so yesterday's
 *   carts would still be out if the demo day rolled over. `signedOutCarts` says as much in its
 *   own comment — "until the round is marked finished" — and there is no such mark yet.
 * - **Who has it is a hover.** On a touch terminal a tooltip needs a mouse; the four-line list
 *   under the grid is the fallback, and it caps at four. The phone solved this by listing six and
 *   putting the holder in the accessible name.
 * - **One key per seat.** `cartKey` is a single number, so two players sharing a cart is modelled
 *   as one of them holding it.
 */
const meta = {
  title: 'Weston Edits/16 · Cart Signout/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Seat `i`'s row, scoped for queries. */
const row = (canvasElement: HTMLElement, i: number) =>
  within(canvasElement.querySelector<HTMLElement>(`[data-player-row="${i}"]`)!);

/** The dialog, wherever it portalled to — the picker is a modal over the frame. */
const picker = () => within(document.body).findByRole('dialog');

/** The afternoon party, on a day where two carts are already out with earlier groups. */
const dayWithCartsOut = (extra: Parameters<typeof sheetWithPanel>[2] = {}) => {
  const b = openParty();
  return sheetWithPanel(b, 'players', {
    bookings: withBookings(b, ...cartsAlreadyOut()),
    ...extra,
  });
};

/**
 * **The fleet, as the counter sees it.** Thirty-five numbers, two of them struck through
 * because earlier groups have them, and the subtitle counting what is left. The play test
 * checks the count, that cart 14 is disabled, and that its tooltip names the group holding it.
 *
 * Big numbers on a tight four-column grid rather than a dropdown of "Cart 01 — available": this
 * is a decision made while holding a key ring, and it should take one look and one tap.
 *
 * It did not always look like this. Weston, round 4, clicking into it: *"the hell is that? Oh,
 * that grid's nasty. Yikes."* The keys were 46×40 floating **48px** apart, because the layout
 * was a `<Stack gap={6}>` and MUI's `gap` is a spacing multiplier, not pixels. Justin's note
 * afterwards: *"make sure this grid in the cart number is super cleaned up, it's too spaced
 * out — 4 column grid maybe with bigger buttons and a lot tighter."*
 *
 * So: a real CSS grid, four columns of full-width keys 8px apart, each 56dp tall. The keys
 * roughly doubled in area while the block they sit in got shorter. Thirty-five of them do not
 * fit a dialog at that size, so the fleet scrolls rather than pushing the hint and the out-list
 * off the bottom.
 */
export const TheKeyPicker: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={dayWithCartsOut({ modal: { kind: 'cartSignout', bookingId: openParty().id, seat: 0 } })}
    />
  ),
  play: async () => {
    const dialog = within(await picker());
    const free = CART_FLEET.length - 2;
    await expect(dialog.getByText(`${free} of ${CART_FLEET.length} available`)).toBeTruthy();
    const taken = dialog.getByRole('button', { name: String(CARTS_OUT.early) });
    await expect(taken).toBeDisabled();
    await expect(taken).toHaveAttribute('title', expect.stringContaining('Out with'));
    await expect(dialog.getByRole('button', { name: '1' })).toBeEnabled();
    // Nothing on the day holds the numbers the picker is offering.
    await expect(availableCarts(cartsAlreadyOut()).includes(CARTS_OUT.early)).toBe(false);
  },
};

/**
 * **Handing over a key.** From the reservation: tap the key glyph on the booker's row, pick a
 * number, done. The play test presses the row's control, chooses a free cart, and checks the
 * number has landed **on the row** — that is the whole point of putting it there rather than in
 * a separate fleet screen. The row's line also picks up `cart 3` beside the customer's id, so
 * the seat reads back completely when the golfer asks what they have.
 */
export const SigningOneOut: Story = {
  render: () => <Screen edition="weston" initialState={dayWithCartsOut()} />,
  play: async ({ canvasElement }) => {
    const b = openParty();
    const seat = row(canvasElement, 0);
    const key = seat.getByRole('button', { name: `${playerName(b, 0)} cart signout` });
    await expect(key).toHaveTextContent('');
    await userEvent.click(key);

    const dialog = within(await picker());
    await expect(dialog.getByText(`Cart signout · ${playerName(b, 0)}`)).toBeTruthy();
    await userEvent.click(dialog.getByRole('button', { name: '3' }));

    await waitFor(() =>
      expect(row(canvasElement, 0).getByRole('button', { name: `${playerName(b, 0)} cart signout` })).toHaveTextContent('3'),
    );
    await expect(row(canvasElement, 0).getByText(/cart 3/)).toBeTruthy();
  },
};

/**
 * The key on the row, at rest: the glyph carries the number, and the seat's detail line repeats
 * it. Nothing else about the row changes — the cart key is information about this seat, not a
 * state the reservation is in.
 */
export const TheKeyOnTheRow: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(withCartKey(openParty(), 0, 22))} />,
};

/**
 * **Bringing it back.** The picker opened on a seat that already holds a cart shows that number
 * selected rather than struck through — it is not "taken" from this player's point of view, it
 * is theirs — and the footer offers **Return cart 22**.
 *
 * Returning clears the seat, and because availability is derived that is the entire operation:
 * the play test returns the cart, reopens the picker, and finds 22 offered again and the free
 * count back up by one.
 */
export const ReturningIt: Story = {
  render: () => {
    const b = withCartKey(openParty(), 0, 22);
    return (
      <Screen
        edition="weston"
        initialState={sheetWithPanel(b, 'players', {
          bookings: withBookings(b, ...cartsAlreadyOut()),
          modal: { kind: 'cartSignout', bookingId: b.id, seat: 0 },
        })}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const b = openParty();
    const free = CART_FLEET.length - 3;
    const dialog = within(await picker());
    await expect(dialog.getByText(`${free} of ${CART_FLEET.length} available`)).toBeTruthy();
    await userEvent.click(dialog.getByRole('button', { name: 'Return cart 22' }));

    await waitFor(() =>
      expect(row(canvasElement, 0).getByRole('button', { name: `${playerName(b, 0)} cart signout` })).toHaveTextContent(''),
    );
    // Reopened: the number is free again, and the fleet count says so.
    await userEvent.click(row(canvasElement, 0).getByRole('button', { name: `${playerName(b, 0)} cart signout` }));
    const reopened = within(await picker());
    await expect(reopened.getByText(`${free + 1} of ${CART_FLEET.length} available`)).toBeTruthy();
    await expect(reopened.getByRole('button', { name: '22' })).toBeEnabled();
  },
};

/**
 * **The grid, measured.** Four columns, 8px apart, keys at least 56dp tall — asserted rather
 * than described, because this is a layout that has already drifted once without anybody
 * noticing until it was on a call.
 */
export const TheGridIsTight: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={dayWithCartsOut({ modal: { kind: 'cartSignout', bookingId: openParty().id, seat: 0 } })}
    />
  ),
  play: async () => {
    const dialog = await picker();
    const keys = [...(dialog as unknown as HTMLElement).querySelectorAll<HTMLElement>('button')].filter((el) =>
      /^\d+$/.test(el.textContent ?? ''),
    );
    await expect(keys.length).toBe(35);
    await expect(keys[0].getBoundingClientRect().height).toBeGreaterThanOrEqual(56);

    // Four per row: the first four keys share a top edge, the fifth starts a new one.
    const top = (n: number) => Math.round(keys[n].getBoundingClientRect().top);
    await expect(top(3)).toBe(top(0));
    await expect(top(4)).toBeGreaterThan(top(0));

    // And they are 8px apart, not 48.
    const gap = keys[1].getBoundingClientRect().left - keys[0].getBoundingClientRect().right;
    await expect(Math.round(gap)).toBe(8);
  },
};
