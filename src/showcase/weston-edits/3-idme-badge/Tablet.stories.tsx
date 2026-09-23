import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import { IdMeBadge } from '../../../pos/components/IdMeBadge';
import { Stack } from '../../../pos/components/Stack';
import { idMeGroups, md3 } from '../../../theme/tokens';
import type { IdMeGroup } from '../../../pos/types';
import { Screen } from '../../pos/screen-helpers';
import { adjustedParty, idMeParty, sheetWithPanel } from '../tablet-scenarios';

/**
 * Weston Edits / 3 · ID.me Badge / Tablet
 *
 * The smallest section here, and the one with the largest unanswered question behind it.
 *
 * Weston mentioned *"ID.me, showing their ID"* among the things today's reservation screen
 * gives the counter. What is built is **a badge only**: a seat whose customer record carries an
 * ID.me verification shows it, with the group, so a military or first-responder rate can be
 * applied without asking for a card. There is **no verify flow**, and there deliberately isn't
 * one — that has been blocked since round 1 on seeing how Birdie presents ID.me today. Building
 * a second one blind would be a guess with a green tick on it.
 *
 * The badge follows the **player**, never the booking and never the name on the seat. It is
 * drawn from whoever `seatCustomer` resolves — a linked record, or for the booker the booking's
 * phone — so a verified guest sitting in an unverified booker's group carries it and the group
 * does not.
 *
 * ## The component
 *
 * `IdMeBadge` (`src/pos/components/IdMeBadge.tsx`). Two props, no state, no actions.
 *
 * | Prop | Type | Default | What it does |
 * |---|---|---|---|
 * | `group` | `IdMeGroup` — `military` · `veteran` · `first_responder` · `nurse` · `teacher` | — | Picks the label and colours from `idMeGroups` |
 * | `compact` | `boolean` | `false` | Row size: shield + **"ID.me"**. Full size reads **"ID.me · First responder"** |
 *
 * The resolution chain, all of it in `src/pos/logic/seat-customer.ts` and `data/golfers.ts`:
 *
 * `seatIdMe(booking, seat, roster)` → `idMeGroupOf(seatCustomer(...)?.id)` → `IDME_VERIFIED[id]`
 *
 * ## The data
 *
 * `IDME_VERIFIED` in `src/pos/data/golfers.ts` — a **side table keyed by golfer id**, rather than
 * a field on each record, so the ported roster stays diffable against its source. It has exactly
 * four entries:
 *
 * | Id | Customer | Group |
 * |---|---|---|
 * | `G001` | Thompson, Michael | `veteran` |
 * | `G006` | Farnsworth, Weston | `military` |
 * | `M005` | Kim, David | `first_responder` |
 * | `M008` | Walsh, Patricia | `nurse` |
 *
 * `teacher` exists in the token set and in the type, and no demo customer carries it — the
 * **All Groups** story is the only place it is drawn.
 *
 * That the table is small is not the reason badges are rare on the sheet. **Only 93 of the
 * 18-hole club's 845 sellable bookings have a booker who resolves to a record at all**, and 11
 * of those are verified. Every other story in this section links somebody onto a seat on
 * purpose, because that is the honest way to show the badge.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Colours | `idMeGroups` in `theme/tokens.ts` — #e0ecff on #1d4ed8 for **all five groups** |
 * | Why one colour | ID.me has to read as *identity*. Green and red already mean payment state (`payBadges`); the member dot already carries tier. A per-group palette would make five more things to learn |
 * | Compact | 11px `verified_user` glyph, 9.5/800 label, 0.625 × 1px padding, `radius.xl` pill |
 * | Full | 14px glyph, 11/800 label, 1 × 0.375 padding, same pill |
 * | Tooltip | "ID.me verified · First responder" |
 * | Screen reader | `aria-label="ID.me verified, First responder"` on the badge itself |
 *
 * ## Scope
 *
 * On the **terminal** the badge has exactly one render site: the player row, compact, beside the
 * name where the counter already looks for the member dot (`PlayerRows.tsx`). The full size has
 * no live call site on the tablet — its only one was `CustomerTab.tsx`, which round 3 stopped
 * rendering when the Customer tab went. The customer record (4) shows **no ID.me badge today**.
 * See **Still open**.
 *
 * The phone draws it in three places; see the Mobile page.
 *
 * ## The stories
 *
 * | Story | What it is for |
 * |---|---|
 * | **On The Player Row** | A verified **booker** — Farnsworth, Weston (military) — resolved by the booking's phone, not by the name on the chip |
 * | **On A Linked Guest** | Seat 2 linked to Kim, David (first responder). The badge follows the player, as does the rate: Kim is a member, so the seat prices on the membership row inside a guest booking |
 * | **In The Customer Tab** | **A stale name.** The Customer tab was removed in round 3; this renders the Players tab on the same verified booking. It is kept as a second row-level shot, not as a picture of a tab that exists |
 * | **All Groups** | All five groups at both sizes, read from `idMeGroups`, so the page cannot drift from the tokens |
 *
 * ## Still open
 *
 * - **The verify flow. Open since round 1.** There is no "Verify with ID.me" action anywhere,
 *   because nobody here has seen how Birdie surfaces ID.me at the counter today — whether it is
 *   a redirect, a code read back over the phone, or something the golfer did before arriving.
 *   Until that is on screen in front of us, this section stays a badge.
 * - **The record shows no badge.** A counter looking at Kim, David's *record* cannot see that he
 *   is ID.me verified; only his seat says so. One line in `CustomerModal.tsx` fixes it, and it
 *   has not been written because nobody has said where on that surface it belongs.
 * - **Two `idMeGroupOf` functions exist.** The one everything calls reads the `IDME_VERIFIED`
 *   side table (`data/golfers.ts`); a second, in `data/customers.ts`, derives a group from the
 *   customer's own types (Military → military, Hero → first responder) and **nothing calls it**.
 *   Whichever one is meant to be true, the other should go.
 * - **Nothing is priced off the badge.** It tells the counter a qualifying rate may apply; it
 *   does not select one. Eligibility for the rate tiles is a separate rule set (11, 18).
 */
const meta = {
  title: 'Weston Edits/3 · ID.me Badge/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * On the player row: a verified booker (Farnsworth, Weston — military) shows the compact
 * badge beside their name, where the counter already looks for the member dot.
 */
export const OnThePlayerRow: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(idMeParty())} />,
};

/**
 * A verified customer linked onto a guest seat: seat 2 is Kim, David (first responder), so
 * the badge follows the *player*, not the booking — as does the rate: Kim is a member, so
 * the seat is on the member rate.
 */
export const OnALinkedGuest: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(adjustedParty())} />,
};

/** On the Players tab, where the badge sits beside the name. */
export const OnThePlayersTab: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(idMeParty(), 'players')} />,
};

/**
 * Every group, both sizes. One neutral blue family so ID.me reads as *identity* — not as
 * payment state (green/red) or membership tier (the dot colours).
 */
export const AllGroups: Story = {
  render: () => (
    <Box sx={{ p: 4, bgcolor: md3.surface, minHeight: '100vh' }}>
      <Stack gap={1.5}>
        {(Object.keys(idMeGroups) as IdMeGroup[]).map((g) => (
          <Stack key={g} direction="row" alignItems="center" gap={2}>
            <Typography sx={{ width: 140, fontSize: 13, color: md3.onSurfaceVariant }}>{g}</Typography>
            <IdMeBadge group={g} compact />
            <IdMeBadge group={g} />
          </Stack>
        ))}
      </Stack>
    </Box>
  ),
};
