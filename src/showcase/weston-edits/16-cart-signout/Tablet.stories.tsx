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
 * The old prototype put **Cart signout** on every player row and a key glyph on the booking
 * once a cart was out. It is a small feature with a real constraint behind it: the course owns
 * a fixed number of carts, two players cannot both be given cart 14, and the person at the
 * counter needs to know what is already gone *before* reaching for a key.
 *
 * It comes back here on the player row, beside the transport toggle, as a key glyph that turns
 * into the cart's number once one is signed out. Tapping it opens the fleet.
 *
 * **Availability is derived, never stored.** A cart is out because a seat on the day's sheet
 * is holding its number (`PlayerState.cartKey`); the picker reads the day's bookings and
 * subtracts. That is worth saying plainly because it decides how the whole feature behaves:
 *
 * - returning a cart is just **clearing that seat** — there is no second list to forget to
 *   update, and no way for the fleet view and the tee sheet to disagree;
 * - a past tee time still holds its keys, which is correct: a cart does not come back because
 *   its tee time passed;
 * - moving or deleting a booking takes its keys with it, for free.
 *
 * **A taken cart is shown, not hidden.** It is struck through, disabled, and its tooltip names
 * who has it and when they went out — "cart 14 is out with the 6:00" is the answer to the
 * question actually being asked. Hiding it would answer a different one. Under the grid, the
 * first few carts that are out are listed by name and tee time, so the counter can read the
 * fleet without hovering anything.
 *
 * **Signing out a cart implies riding.** A player holding cart 14 who still reads as walking is
 * a row that contradicts itself, so the transport follows the key (`signOutCart`). The fleet
 * numbers skip 13, the way most fleets do.
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
 * Big numbers on 46×40 targets rather than a dropdown of "Cart 01 — available": this is a
 * decision made while holding a key ring, and it should take one look and one tap.
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
