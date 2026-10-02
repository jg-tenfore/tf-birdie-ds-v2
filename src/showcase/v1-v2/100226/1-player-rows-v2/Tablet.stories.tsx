import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { md3, radius } from '../../../../theme/tokens';
import { eligibleRates, price } from '../../../../pos/data/rate-catalog';
import { money } from '../../../../pos/logic/cart';
import { seatRateGrid } from '../../../../pos/logic/seat-pricing';
import type { Booking, PlayerState } from '../../../../pos/types';
import { Icon } from '../../../../pos/components/primitives';
import { Stack } from '../../../../pos/components/Stack';
import { Screen } from '../../../pos/screen-helpers';
import { Avatar, MockPanelHeader, WhatChanged, seatView, type SeatView } from '../../100126/mock-kit';
import { king, panelOn } from '../../100126/scenarios';
import { venueBookings } from '../../../../pos/data/venues';
import { Amount, MembershipChips, clip, PayChip, RAIL_W, Seg, SidePanel, StatusChipTouch, TOUCH, Terminal, TouchButton, orderOf, sheetWithOrder } from '../mock-kit-2';

/**
 * V1 → V2 Migration / 100226 / 1 · Player rows v2
 *
 * **Weston, on 100126's compact rows:** *"this solves the problem, but I feel like we're losing a lot
 * of data."* The counter conversation is *"Walking or riding? 9 or 18? You're paying for yourself?
 * Yes."* — then **Add, Add, Pay**. *"This is going to be the most used thing in all of our apps… it
 * just has to be fast."* Expand-all and collapse-all *"adds an extra step"*; staff like to see the tee
 * fee and the transport fee the golfer is charged; and the name is never cut short.
 *
 * **Original** — King, D.'s foursome on May 22, in the live V1 → V2 panel. Each player is a full card
 * and the 4th starts below the fold.
 *
 * **Proposal** — every player open, on two lines. Line 1: who — full name, first membership (cut at
 * ~24 characters, with **+N** when they hold more; tap for the list), status chip, paid. Line 2: the
 * sale — 9/18, Walk/Ride, the rate and transport with their prices, the total, **Add** and **⋯**.
 * **Add** puts that player straight onto the register's order: the rail opens on the left and the
 * row reads *On order ✓*. **⋯** is only for changing something — Change golfer, rate, No-show. All
 * four players fit without scrolling. Justin's call: Add goes to the rail, not to a basket in the panel.
 *
 * The rail on the left is the **live** register, mounted with the order the Adds built. One thing
 * the mock fixes on the way: today the order charges an untouched seat's cart at the class fee
 * ($20.00) while the row shows Riding Cart $26.82. Here Add rings up the row's own transport, so
 * the row, the rail and the footer show one price.
 */
const meta = {
  title: 'V1 → V2 Migration/100226/1 · Player rows v2',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Today: the live V1 → V2 panel; the 4th player is below the fold. */
export const Original: Story = {
  render: () => <Screen edition="v1v2" initialState={panelOn(king())} />,
};

// ─── The mock ───────────────────────────────────────────────────────────────

/** `b` with seat `i`'s state merged with `patch` — how the mock edits a copy of the seed. */
const editSeat = (b: Booking, i: number, patch: Partial<PlayerState>): Booking => ({
  ...b,
  playerStates: b.playerStates.map((p, j) => (j === i ? { ...p, ...patch } : p)),
});

/** Up to six rates this seat could move to — the ones the player qualifies for first. */
function rateChoices(b: Booking, s: SeatView) {
  const grid = seatRateGrid(b, s.holes);
  const eligible = eligibleRates(grid, s.record, s.holes);
  const rest = grid.filter((r) => !eligible.includes(r));
  return [...eligible, ...rest].slice(0, 6);
}

function PlayerRow({
  b,
  s,
  onOrder,
  more,
  onAdd,
  onMore,
  onEdit,
  onRemove,
}: {
  b: Booking;
  s: SeatView;
  onOrder: boolean;
  more: boolean;
  onAdd: () => void;
  onMore: () => void;
  onEdit: (patch: Partial<PlayerState>) => void;
  onRemove: () => void;
}) {
  const [rates, setRates] = useState(false);
  const done = s.paid || s.noShow;
  return (
    <Box
      data-player-row={s.i}
      data-on-order={onOrder || undefined}
      sx={{
        borderRadius: `${radius.md}px`,
        bgcolor: onOrder ? '#ecfdf3' : md3.surfaceContainer,
        borderLeft: `4px solid ${s.accent}`,
        outline: onOrder ? `1.5px solid ${md3.primary}` : 'none',
        p: '8px 12px',
        mb: 1,
        opacity: s.noShow ? 0.6 : 1,
      }}
    >
      {/* Line 1 — who they are. */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ minHeight: TOUCH }}>
        <Avatar name={s.name} color={s.accent} size={32} />
        <Typography data-player-name sx={{ fontSize: 15.5, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {s.name}
        </Typography>
        {s.i === 0 && <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: md3.onSurfaceVariant, letterSpacing: '.04em', flexShrink: 0 }}>BOOKER</Typography>}
        <MembershipChips s={s} />
        <Box sx={{ flex: 1 }} />
        <StatusChipTouch step={s.step} name={s.name} onChange={(step) => onEdit({ step })} />
        <PayChip paid={s.paid} noShow={s.noShow} />
      </Stack>

      {/* Line 2 — the sale. */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.75, minHeight: TOUCH }}>
        <Seg label={`${s.name}: holes`} value={s.holes} onChange={(holes) => onEdit({ holes })} options={[{ value: 9, label: '9' }, { value: 18, label: '18' }]} />
        <Seg
          label={`${s.name}: transport`}
          value={s.cart ? 'cart' : 'walking'}
          onChange={(transport) => onEdit({ transport, transportRateId: undefined })}
          options={[
            { value: 'walking', label: 'Walk', icon: 'directions_walk' },
            { value: 'cart', label: 'Ride', icon: 'directions_car' },
          ]}
        />
        <Box data-rate-lines sx={{ flex: 1, minWidth: 0, pl: 0.5, fontSize: 12.5, lineHeight: 1.35, color: md3.onSurfaceVariant }}>
          <Box sx={{ whiteSpace: 'nowrap' }}>
            <i>{s.price.rate?.name ?? 'Green fee'}</i> <Amount v={s.price.greenFee} />
          </Box>
          <Box sx={{ whiteSpace: 'nowrap' }}>
            <i>{s.price.transport.name}</i> <Amount v={s.price.transportFee} />
          </Box>
        </Box>
        <Typography sx={{ fontSize: 15.5, fontWeight: 800, minWidth: 68, textAlign: 'right' }}>{money(s.price.total)}</Typography>
        {s.paid ? (
          <TouchButton tone="done" icon="check" sx={{ minWidth: 112 }}>
            Paid
          </TouchButton>
        ) : onOrder ? (
          <TouchButton tone="done" label={`${s.name} is on the order`} sx={{ minWidth: 112 }}>
            On order <Icon name="check" size={17} />
          </TouchButton>
        ) : (
          <TouchButton tone="filled" icon="add_shopping_cart" label={`Add ${s.name}`} onClick={onAdd} disabled={done} sx={{ minWidth: 112 }}>
            Add
          </TouchButton>
        )}
        <TouchButton tone={more ? 'outline' : 'ghost'} icon="more_horiz" label={more ? `Close ${s.name}'s options` : `More for ${s.name}`} onClick={onMore} />
      </Stack>

      {/* ⋯ — only to change something. */}
      {more && (
        <Box data-row-more={s.i} sx={{ mt: 1, pt: 1, borderTop: `1px solid ${md3.outlineVariant}` }}>
          <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
            <TouchButton icon="swap_horiz">Change golfer</TouchButton>
            <TouchButton icon="sell" onClick={() => setRates((r) => !r)}>
              Change rate
            </TouchButton>
            <TouchButton icon="person_off" onClick={() => onEdit({ noShow: !s.noShow })}>
              {s.noShow ? 'Undo no-show' : 'No-show'}
            </TouchButton>
            {onOrder && (
              <TouchButton icon="close" onClick={onRemove}>
                Take off the order
              </TouchButton>
            )}
          </Stack>
          {rates && (
            <Stack direction="row" gap={0.75} sx={{ mt: 1, flexWrap: 'wrap' }} data-rate-choices>
              {rateChoices(b, s).map((r) => {
                const on = r.id === s.price.rate?.id;
                return (
                  <TouchButton key={r.id} tone={on ? 'done' : 'outline'} onClick={() => onEdit({ rateId: r.id, fee: undefined })} sx={{ fontSize: 12.5 }}>
                    {r.name} · {money(price(r, s.holes))}
                  </TouchButton>
                );
              })}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}

function RowsPanel({ seed, initialOrder = [] }: { seed: Booking; initialOrder?: number[] }) {
  const [b, setB] = useState(seed);
  const [order, setOrder] = useState<number[]>(initialOrder);
  const [more, setMore] = useState<number | null>(null);
  const list = b.playerStates.map((_, i) => seatView(b, i));
  const sorted = [...order].sort((x, y) => x - y);
  const due = orderOf(b, sorted);
  const all = orderOf(b, list.filter((s) => !s.paid && !s.noShow).map((s) => s.i));
  const edit = (i: number, patch: Partial<PlayerState>) => setB((cur) => editSeat(cur, i, patch));
  const everyone = (transport: 'cart' | 'walking') => setB((cur) => ({ ...cur, playerStates: cur.playerStates.map((p) => ({ ...p, transport, transportRateId: undefined })) }));
  const add = (i: number) => setOrder((o) => (o.includes(i) ? o : [...o, i]));
  const addAll = () => setOrder(list.filter((s) => !s.paid && !s.noShow).map((s) => s.i));
  const open = list.filter((s) => !s.paid && !s.noShow && !order.includes(s.i)).length;
  // The backdrop is the live app holding this order; a new order, or a change to a seat on it,
  // remounts it from the new state.
  const backdropKey = JSON.stringify(sorted.map((i) => b.playerStates[i]));

  return (
    <Terminal backdrop={sheetWithOrder(b, sorted)} backdropKey={`${sorted.join(',')}|${backdropKey}`}>
      <SidePanel scrimFrom={sorted.length ? RAIL_W : 0}>
        <MockPanelHeader b={b} />
        <Box data-panel-body sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '12px 16px' }}>
          <Box sx={{ mb: 1.25 }}>
            <WhatChanged>Every player open, on two lines. Add puts them straight on the order at the left; ⋯ is only for changes.</WhatChanged>
          </Box>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: md3.outline, flex: 1 }}>
              PLAYERS · {list.filter((s) => s.step >= 1).length}/{b.players} CHECKED IN
            </Typography>
            <TouchButton icon="directions_car" onClick={() => everyone('cart')}>
              Everyone rides
            </TouchButton>
            <TouchButton icon="directions_walk" onClick={() => everyone('walking')}>
              Everyone walks
            </TouchButton>
            <TouchButton icon="add_shopping_cart" onClick={addAll} disabled={open === 0}>
              Add all
            </TouchButton>
          </Stack>
          {list.map((s) => (
            <PlayerRow
              key={s.i}
              b={b}
              s={s}
              onOrder={order.includes(s.i)}
              more={more === s.i}
              onAdd={() => add(s.i)}
              onMore={() => setMore(more === s.i ? null : s.i)}
              onEdit={(patch) => edit(s.i, patch)}
              onRemove={() => setOrder((o) => o.filter((x) => x !== s.i))}
            />
          ))}
        </Box>
        <Stack data-panel-footer direction="row" alignItems="center" gap={1} sx={{ p: '12px 16px', borderTop: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
          <Box sx={{ flex: 1 }}>
            {sorted.length ? (
              <>
                <Typography data-order-summary sx={{ fontSize: 14, fontWeight: 800 }}>
                  {sorted.length} on the order · Pay {money(due.total)}
                </Typography>
                <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
                  {money(due.subtotal)} + tax {money(due.tax)} · {open ? `${open} still to add` : 'everyone added'}
                </Typography>
              </>
            ) : (
              <Typography data-order-summary sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>
                Nothing on the order yet · tap Add on each player paying now
              </Typography>
            )}
          </Box>
          <TouchButton>Close</TouchButton>
          {sorted.length ? (
            <TouchButton tone="filled" icon="payments">
              Pay {money(due.total)}
            </TouchButton>
          ) : (
            <TouchButton tone="filled" onClick={addAll}>
              Check in & pay all · {money(all.total)}
            </TouchButton>
          )}
        </Stack>
      </SidePanel>
    </Terminal>
  );
}

// ─── Stories ────────────────────────────────────────────────────────────────

const panelOf = (el: HTMLElement) => waitFor(() => {
  const p = el.querySelector<HTMLElement>('[data-mock-panel]');
  if (!p) throw new Error('no panel yet');
  return p;
});

/** The whole foursome fits: the body does not scroll, and the 4th row ends above the footer. */
async function expectFoursomeFits(panel: HTMLElement) {
  const rows = panel.querySelectorAll<HTMLElement>('[data-player-row]');
  await expect(rows.length).toBe(4);
  const body = panel.querySelector<HTMLElement>('[data-panel-body]')!;
  await expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight);
  const footerTop = panel.querySelector<HTMLElement>('[data-panel-footer]')!.getBoundingClientRect().top;
  await expect(rows[3].getBoundingClientRect().bottom).toBeLessThanOrEqual(footerTop);
  // Every target on a row is touch-sized.
  for (const btn of rows[0].querySelectorAll<HTMLElement>('[aria-pressed], [aria-label^="Add "], [aria-label^="More for"]')) {
    const scale = panel.getBoundingClientRect().width / 820;
    await expect(btn.getBoundingClientRect().height / scale).toBeGreaterThanOrEqual(36);
  }
}

/**
 * Text in the live register rail behind the mock: leaf elements matching `re` inside the rail's
 * 320 columns at the terminal's left (the tee sheet under the scrim carries the same names).
 */
function railText(el: HTMLElement, panel: HTMLElement, re: RegExp) {
  const p = panel.getBoundingClientRect();
  const scale = p.width / 820;
  const railRight = p.right - (1366 - RAIL_W) * scale;
  const found: HTMLElement[] = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let t = walk.nextNode(); t; t = walk.nextNode()) {
    const host = t.parentElement;
    if (host && re.test(t.textContent ?? '') && !panel.contains(host) && host.getBoundingClientRect().right <= railRight + 1) found.push(host);
  }
  return found;
}

/** Every player open, Add on each row; all four fit. */
export const Proposal: Story = {
  render: () => <RowsPanel seed={king()} />,
  play: async ({ canvasElement }) => {
    const panel = await panelOf(canvasElement);
    await expectFoursomeFits(panel);
    // Full names, rates and transport are on every row without opening anything.
    const names = [...panel.querySelectorAll('[data-player-name]')].map((n) => n.textContent);
    await expect(names).toEqual(['King, D.', 'Guest 2', 'Brennan, K.', 'Guest 4']);
    await expect(within(panel).getAllByText('Weekday Resident').length).toBe(1);
    await expect(within(panel).getAllByText('Riding Cart').length).toBe(3);
    // Nothing on the order yet: the rail is collapsed.
    await expect(canvasElement.querySelector('[aria-label="Clear order"]')).toBeNull();
    // Add, Add.
    await userEvent.click(within(panel).getByRole('button', { name: 'Add King, D.' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'Add Guest 2' }));
    await expect(within(panel).getByRole('button', { name: 'King, D. is on the order' })).toBeTruthy();
    await expect(within(panel).getByRole('button', { name: 'Guest 2 is on the order' })).toBeTruthy();
    const due = orderOf(king(), [0, 1]);
    await expect(panel.querySelector('[data-order-summary]')!.textContent).toBe(`2 on the order · Pay ${money(due.total)}`);
    // …and the live register rail opened with both players on it.
    await waitFor(() => expect(canvasElement.querySelector('[aria-label="Clear order"]')).not.toBeNull());
    await waitFor(() => expect(railText(canvasElement, panel, /King, D\./).length).toBeGreaterThan(0));
    await expect(railText(canvasElement, panel, /Guest 2/).length).toBeGreaterThan(0);
    await expect(railText(canvasElement, panel, /Brennan, K\./).length).toBe(0);
    // The rail charges what the rows and the footer say.
    await expect(railText(canvasElement, panel, new RegExp(money(due.total).replace(/[$.]/g, '\\$&'))).length).toBeGreaterThan(0);
    // ⋯ opens the changes, not the sale.
    await userEvent.click(within(panel).getByRole('button', { name: 'More for Brennan, K.' }));
    await expect(panel.querySelector('[data-row-more="2"]')).not.toBeNull();
    await expect(within(panel).getByRole('button', { name: /No-show/ })).toBeTruthy();
    await userEvent.click(within(panel).getByRole('button', { name: "Close Brennan, K.'s options" }));
    // ⋯ also takes a player back off the order; with nobody on it the rail tucks away again.
    for (const name of ['King, D.', 'Guest 2']) {
      await userEvent.click(within(panel).getByRole('button', { name: `More for ${name}` }));
      await userEvent.click(within(panel).getByRole('button', { name: 'Take off the order' }));
      await userEvent.click(within(panel).getByRole('button', { name: `Close ${name}'s options` }));
    }
    await expect(panel.querySelectorAll('[data-on-order]').length).toBe(0);
    await waitFor(() => expect(canvasElement.querySelector('[aria-label="Clear order"]')).toBeNull());
    await expect(panel.querySelector('[data-order-summary]')!.textContent).toMatch(/^Nothing on the order yet/);
  },
};

/** After Add on King, D. and Guest 2: two lines on the rail, two rows on order. */
export const AfterAddAdd: Story = {
  name: 'Proposal · after Add, Add',
  render: () => <RowsPanel seed={king()} initialOrder={[0, 1]} />,
  play: async ({ canvasElement }) => {
    const panel = await panelOf(canvasElement);
    await expectFoursomeFits(panel);
    await expect(panel.querySelectorAll('[data-on-order]').length).toBe(2);
    await expect(panel.querySelector('[data-order-summary]')!.textContent).toBe(`2 on the order · Pay ${money(orderOf(king(), [0, 1]).total)}`);
    await waitFor(() => expect(canvasElement.querySelector('[aria-label="Clear order"]')).not.toBeNull());
    // Brennan and Guest 4 still have their Add.
    await expect(within(panel).getByRole('button', { name: 'Add Brennan, K.' })).toBeTruthy();
    await expect(within(panel).getByRole('button', { name: 'Add Guest 4' })).toBeTruthy();
  },
};

/**
 * Strand, E. — May 22, 12:36 PM — holds three memberships and a customer type: the first is cut at
 * ~24 characters, **+2** stands for the rest, and a tap lists them all.
 */
const strand = () => {
  const b = venueBookings('eighteen').find((x) => x.id === 'p42_p1');
  if (!b) throw new Error('100226: no booking p42_p1');
  return b;
};

export const SeveralMemberships: Story = {
  name: 'Proposal · several memberships',
  render: () => <RowsPanel seed={strand()} />,
  play: async ({ canvasElement }) => {
    const panel = await panelOf(canvasElement);
    const chips = panel.querySelector<HTMLElement>('[data-membership-chips="0"]')!;
    await expect(within(chips).getByText(clip('Couple Premium Membership'))).toBeTruthy();
    await expect(clip('Couple Premium Membership').length).toBeLessThanOrEqual(24);
    await expect(within(chips).getByText('+2')).toBeTruthy();
    await userEvent.click(chips);
    const card = panel.querySelector<HTMLElement>('[data-membership-card="0"]')!;
    await expect(within(card).getByText('Couple Premium Membership')).toBeTruthy();
    await expect(within(card).getByText('12-Month Member-only Simulator Membership')).toBeTruthy();
    await expect(within(card).getByText('Family Fitness Membership (3 Persons)')).toBeTruthy();
    // The name itself is never cut.
    const name = panel.querySelector<HTMLElement>('[data-player-row="0"] [data-player-name]')!;
    await expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
  },
};
