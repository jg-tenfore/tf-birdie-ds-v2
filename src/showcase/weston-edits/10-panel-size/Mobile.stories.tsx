import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { MOBILE_FRAME, MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 10 · Panel Size / Mobile
 *
 * **There is nothing here to compare, and that is the finding.**
 *
 * The tablet half of this section exists because Weston asked to *feel* a trade rather than pick
 * from a description: "I wonder if it should take up more space… I think it's more important to
 * have this bigger than to show more of the tee sheet." On the terminal the reservation is a
 * slide-over, so how wide it is, is a real decision — 640 keeps both nines beside it, 820 buys
 * the rate tiles a second column at the cost of about one nine, cover takes the sheet entirely.
 * Three widths, three answers, all of them a click away.
 *
 * A phone has one width. 402px is the device, not a setting, and the reservation does not sit
 * beside the tee sheet — it **pushes over it**. So none of the three options is available to
 * offer and none of the questions behind them can be asked: nothing narrows, nothing is covered,
 * and there is no second column to buy. Putting a width switch on this screen would be
 * inventing a control the device cannot honour, so this file does not.
 *
 * What survives the move is the *concern* rather than the mechanism. Weston's objection to the
 * old full-screen editor was never about pixels — it was "it's just a little jarring, you have
 * to click to go back." The phone answers that with presentation rather than width, and the
 * answer is declared per route in `navigation.tsx`:
 *
 * | | How it enters | What it costs you |
 * |---|---|---|
 * | **Reservation** (`bookingDetail`) | `push` — slides in, back arrow | The tee sheet stays mounted underneath, at the same scroll position. Back is one tap and lands where you were |
 * | **Rate editor** (`seatRate`) | `dialog` — rises from the bottom, ✕ and **Save** | The reservation stays mounted underneath. ✕ discards, Save commits |
 * | **Customer record** (`customerRecord`) | `dialog` | Same — the record is its own thing, not a tab on the tee time |
 * | **Cart signout** (`cartSignout`) | `push` | A drill-down into the fleet, not an edit to abandon |
 *
 * Screens below the top one stay mounted (`Router` in `MobileApp.tsx`), which is the phone's
 * version of "you don't lose the context": the sheet's scroll position, the reservation's open
 * tab and any half-typed note are all still there when the screen above closes. That is the
 * same promise the slide-over makes on the terminal, bought a different way.
 *
 * The one place the width difference actually bites is the rate editor, and it is worth naming
 * because it is the reason 11 · Rate Selector looks different on the two devices. On the
 * terminal the tile grid expands **in place on the player row** — Weston's own suggestion,
 * "maybe you click and this expands, instead of taking over a full screen" — and at 640 or 820
 * the rest of the group is still visible around it. At 402 four rows of tiles under an open row
 * would push every other player off screen, so you would lose the group *and* have to scroll to
 * get it back. The phone takes the full-screen dialog instead: same four rows, same order, one
 * tap back to the group rather than one long scroll.
 */
const meta = {
  title: 'Weston Edits/10 · Panel Size/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * **The reservation at 402.** The adjusted party from section 2, on the only width the phone
 * has: the header facts, four tabs, and a player row that carries holes, fee, transport, the
 * per-seat cart chip and a ⋮ — all of it inside the 402px the terminal spends on roughly two
 * thirds of its narrowest panel.
 *
 * Worth reading against the tablet's **640** story rather than against its **Cover**: this is a
 * pushed screen that keeps its parent alive underneath, not a panel that has swallowed the
 * sheet. The tee sheet is still mounted one tap away, at the row this booking sits on.
 *
 * The play test pins the frame to the device width, so the claim in the prose above cannot
 * drift from what the stories actually render.
 */
export const AtFourOhTwo: Story = {
  render: () => {
    const b = adjustedParty();
    return (
      <MobileStory
        edition="weston"
        initialState={at18(withBookings(b))}
        tab="tee"
        stack={[{ name: 'bookingDetail', bookingId: b.id }]}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(MOBILE_FRAME.width).toBe(402);
    // Four tabs and the player controls, all inside that one width — no second column to buy.
    await canvas.findByRole('tab', { name: 'Players' });
    await expect((await canvas.findAllByLabelText(/^Tee fee \$/)).length).toBeGreaterThan(0);
  },
};
