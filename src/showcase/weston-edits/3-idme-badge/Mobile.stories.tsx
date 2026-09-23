import type { Meta, StoryObj } from '@storybook/react-vite';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, bookerWithRecord, loadedOrder, withBookings } from '../mobile-scenarios';
import { seatRecord } from '../../../pos/logic/seat-pricing';

/**
 * Weston Edits / 3 · ID.me Badge / Mobile
 *
 * Weston asked to see ID.me status on the reservation. As on the terminal it is a **badge
 * only** — a shield and the verified group, in one neutral blue so it reads as *identity*
 * rather than payment state or membership tier. There is no verify flow, and that has been
 * blocked since round 1 on seeing how Birdie presents ID.me today.
 *
 * What is different here is not the rule but the **drawing**. The phone has a badge line on
 * every player row that already carries pay state and member tier, so ID.me had to join that
 * line rather than invent its own, and it had to survive being one of three things sharing
 * 402px minus an avatar.
 *
 * ## The component
 *
 * `IdMeBadge` in `src/pos/mobile/screens/tee/parts.tsx` — a **separate implementation** from
 * `components/IdMeBadge.tsx`, sharing the `idMeGroups` tokens and the `IdMeGroup` type but not
 * the markup. It sits beside `StatusBadge` and `MemberBadge` in that file and matches them
 * exactly, which is the whole reason it is not the terminal's component with a prop.
 *
 * | Prop | Type | Default | What it does |
 * |---|---|---|---|
 * | `group` | `IdMeGroup` | — | Label and colours from `idMeGroups` |
 * | `compact` | `boolean` | `false` | Drops the "ID.me · " prefix — the shield carries it. Reads **"Veteran"**; full reads **"ID.me · Veteran"** |
 *
 * Note the compact form differs from the terminal's: the phone keeps the **group** and drops the
 * brand, the tablet keeps the brand and drops the group. On a phone row the group is the thing
 * the counter acts on, and the shield is already unmistakable at 14px.
 *
 * Resolution is the same chain the terminal uses — `idMeGroupOf(seatGolfer(...)?.id)` against
 * the four-entry `IDME_VERIFIED` side table in `data/golfers.ts`. A linked record or the
 * booker's phone; **never the name on the seat**.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Height | **22dp** — the same as `StatusBadge` and `MemberBadge`, so a row's badges sit on one line |
 * | Shape | `radius.sm / 2` (4px), 0.75 × padding, 0.5 gap |
 * | Type | 11px / 700 |
 * | Glyph | MUI `VerifiedUser` at 14px |
 * | Colours | #e0ecff on #1d4ed8, all five groups (`idMeGroups`) |
 * | Screen reader | `aria-label="ID.me verified · Veteran"` |
 * | Row slot | The badge line under the name reserves `minHeight: 22`, so a row without a badge does not sit taller or shorter than one with it |
 *
 * ## Where it appears
 *
 * | Surface | Size | File |
 * |---|---|---|
 * | Reservation player row | compact | `ReservationPlayers.tsx` |
 * | Player Detail, under the name | full | `PlayerDetailScreen.tsx` (Weston edition only) |
 * | The order's golf summary | compact | `screens/register/OrderScreen.tsx` — so the counter sees who is verified while taking payment |
 * | The customer's own record | compact | `CustomerRecordScreen.tsx`, beside the customer id |
 *
 * ## Scope
 *
 * Weston edition, 18-hole club. Only **93 of that club's 845 sellable bookings** have a booker
 * who resolves to a record at all, and 11 of those are verified, so these stories link verified
 * customers onto seats on purpose rather than hunting for a booking that happens to have one.
 *
 * ## The stories
 *
 * | Story | What it is for |
 * |---|---|
 * | **On Player Rows** | The compact badge on the reservation's rows — seat 2 is Thompson, Michael (veteran), seat 3 Walsh, Patricia (nurse), both linked in by `adjustedParty` |
 * | **On Player Detail** | The full **"ID.me · Veteran"** badge under the player's name on the pushed detail screen |
 * | **On The Customer Record** | The badge on the record itself, opened from the booker's name. Uses `bookerWithRecord()` — most demo bookings have a booker who resolves to nobody, so a story wanting a *record* has to pick one that has one |
 * | **On Order Summary** | The compact badge on the register's golf summary, where payment is actually taken |
 *
 * ## Still open
 *
 * - **The verify flow. Open since round 1**, and deliberately not guessed at. Nobody here has
 *   seen how Birdie presents ID.me at the counter today — a redirect, a code read back on the
 *   phone, or something the golfer did before arriving — and a second flow built blind is a
 *   guess with a green tick on it.
 * - **`teacher` is never drawn on the phone** — no demo customer carries it. The tablet's **All
 *   Groups** story is the only place all five are visible.
 */
const meta = {
  title: 'Weston Edits/3 · ID.me Badge/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const party = () => {
  const b = adjustedParty();
  return { b, state: at18(withBookings(b)) };
};

/** On the player rows: compact (the shield stands for "ID.me"), beside the round status. */
export const OnPlayerRows: Story = {
  render: () => {
    const { b, state } = party();
    return <MobileStory edition="weston" initialState={state} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id }]} />;
  },
};

/** On Player Detail: the full "ID.me · Veteran" badge under the player's name. */
export const OnPlayerDetail: Story = {
  render: () => {
    const { b, state } = party();
    return (
      <MobileStory
        edition="weston"
        initialState={state}
        tab="tee"
        stack={[
          { name: 'bookingDetail', bookingId: b.id },
          { name: 'playerDetail', bookingId: b.id, playerIndex: 1 },
        ]}
      />
    );
  },
};

/** On the customer's own record, opened from the player's name. */
export const OnTheCustomerRecord: Story = {
  render: () => {
    // A booking whose booker actually resolves. `adjustedParty()`'s does not, so this story
    // used to land on "Who is in seat 1?" rather than on a record — showing the assign screen
    // under a heading promising a badge.
    const b = bookerWithRecord();
    const state = at18(withBookings(b));
    return (
      <MobileStory
        edition="weston"
        initialState={state}
        tab="tee"
        stack={[
          { name: 'bookingDetail', bookingId: b.id },
          { name: 'customerRecord', customerId: seatRecord(b, 0)?.id ?? null, bookingId: b.id, seat: 0 },
        ]}
      />
    );
  },
};

/** On the order's golf summary, so the counter sees who is verified when taking payment. */
export const OnOrderSummary: Story = {
  render: () => <MobileStory edition="weston" initialState={loadedOrder(adjustedParty())} tab="register" stack={[{ name: 'order' }]} />,
};
