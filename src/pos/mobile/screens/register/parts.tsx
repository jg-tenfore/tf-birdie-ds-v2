import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Button, ButtonBase, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import Check from '@mui/icons-material/Check';
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import { md3, memberTypes, mobile, noteColors, playerAccents, radius } from '../../../../theme/tokens';
import type { MemberTypeKey } from '../../../../theme/tokens';
import { CATALOG, CHECK_IN_ITEMS, MEMBER_ITEM_TYPES } from '../../../data/catalog';
import * as cartLogic from '../../../logic/cart';
import { runsAt } from '../../../logic/bookings';
import { toDateStr } from '../../../data/courses';
import { dayBookings } from '../../../state/pos-store';
import type { PosState } from '../../../state/pos-store';
import { useGolferRoster, usePos } from '../../../state/PosProvider';
import type { Booking, CartItem, CartPlayer, CatalogItem, PlayerState } from '../../../types';
import { hexRgba } from '../../../components/PosView';
import { Stack } from '../../../components/Stack';
import { BottomSheet } from '../../chrome';
import { useMobileNav } from '../../navigation';

/**
 * Shared pieces for the Register destination.
 *
 * The terminal keeps the order permanently on screen in its left panel; on the phone the
 * order is its own screen, so the one thing every Register screen has to do is keep that
 * order *reachable* and *legible* from wherever the operator is. The bar, the money
 * helpers and the add-item routing below are what make that consistent.
 */

// ─── Money ──────────────────────────────────────────────────────────────────

/**
 * What the order costs, in one place so the bar, the order, checkout and the reader
 * never disagree.
 *
 * Tax is either the booking's own `Taxes` line (tee-sheet rounds carry one) or sales tax
 * on the goods. The terminal's checkout adds the `Taxes` line *and* counts it inside
 * `payableTotal`, so a loaded booking pays its tax twice there; the phone excludes tax
 * lines from the goods total so it's counted once.
 */
export function orderMoney(cart: CartItem[]) {
  const goodsLines = cart.filter((i) => !i.isTax && i.name !== 'Taxes');
  const goods = cartLogic.payableTotal(goodsLines);
  const totals = cartLogic.cartTotals(cart);
  const exempt = cart.some((i) => i.name === 'Tax Exempt');
  const tax = exempt ? 0 : totals.tax > 0 ? totals.tax : cartLogic.salesTax(goods);
  return {
    subtotal: totals.subtotal,
    discount: totals.discount,
    goods,
    tax,
    exempt,
    total: +(goods + tax).toFixed(2),
  };
}

/** Lines the operator thinks of as "on the order" — tax rows hang off others. */
export const orderLines = (cart: CartItem[]) => cart.filter((i) => !i.isSubItem);

/** Catalog price label: `$16.00`, `Free`, or a signed credit. */
export function priceLabel(item: CatalogItem): string {
  if (item.isOverride || item.p === 0) return 'Free';
  if (item.p < 0 || item.isDiscount) return cartLogic.creditMoney(item.p);
  return cartLogic.money(item.p);
}

/** `GOLF BALLS` → `Golf Balls`. The terminal shouts; a phone list reads in title case. */
export const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

// ─── Players ────────────────────────────────────────────────────────────────

/** A seat's display name, falling back to `Guest n` for placeholders. */
export function seatName(p: CartPlayer | undefined, i: number): string {
  const fallback = cartLogic.defaultPlayerName(i);
  if (!p?.name || ['Group Name', 'Player 1', fallback].includes(p.name)) return fallback;
  return p.name;
}

export const isNamedSeat = (p: CartPlayer | undefined, i: number) =>
  seatName(p, i) !== cartLogic.defaultPlayerName(i);

/** `Okafor, James` → `JO`; unnamed seats show their seat number. */
export function initials(name: string, i: number): string {
  if (name === cartLogic.defaultPlayerName(i)) return String(i + 1);
  const [last, first] = name.split(',').map((s) => s.trim());
  return `${(first ?? '').charAt(0)}${(last ?? '').charAt(0)}`.toUpperCase() || String(i + 1);
}

/** Round avatar in the seat's accent colour — the same ramp the terminal uses. */
export function SeatAvatar({ name, index, size = 40 }: { name: string; index: number; size?: number }) {
  const accent = playerAccents[index % playerAccents.length];
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        bgcolor: hexRgba(accent, 0.14),
        color: accent,
        fontSize: size * 0.38,
        fontWeight: 700,
      }}
    >
      {initials(name, index)}
    </Box>
  );
}

/** "Riding Cart · Military −$10.00" — why this seat costs what it costs. */
export function seatSummary(unitPrice: number, p: CartPlayer): string {
  const transport = p.modifierTags.find((t) => t.isTransport)?.name ?? 'Walking';
  const others = p.modifierTags
    .filter((t) => !t.isTransport)
    .map((t) => {
      const delta = t.isDiscount ? t.p : t.p - unitPrice;
      // Tee-sheet discounts carry long tags ("EARLY MORNING DISCOUNT"); the sign says it.
      const label = titleCase(t.tag).replace(/ Discount$/, '') + (t.isDiscount ? '' : ' rate');
      return delta === 0 ? label : `${label} ${delta < 0 ? cartLogic.creditMoney(delta) : `+${cartLogic.money(delta)}`}`;
    });
  return [transport, ...others].join(' · ');
}

// ─── Layout bits ────────────────────────────────────────────────────────────

/** MD3 list subheader — title small in primary, 16dp inset. */
export function Subheader({ children, action, sx }: { children: ReactNode; action?: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Stack direction="row" alignItems="center" sx={{ px: 2, minHeight: 48, ...sx }}>
      <Typography variant="subtitle2" sx={{ color: md3.primary, flex: 1 }}>
        {children}
      </Typography>
      {action}
    </Stack>
  );
}

/** Label / value row for totals. */
export function MoneyRow({
  label,
  value,
  strong,
  color,
}: {
  label: ReactNode;
  value: string;
  strong?: boolean;
  color?: string;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ py: 0.5 }}>
      <Typography variant={strong ? 'subtitle1' : 'body2'} sx={{ color: strong ? md3.onSurface : md3.onSurfaceVariant }}>
        {label}
      </Typography>
      <Typography variant={strong ? 'h6' : 'body2'} sx={{ fontWeight: strong ? 700 : 500, color: color ?? md3.onSurface }}>
        {value}
      </Typography>
    </Stack>
  );
}

/** The totals block used on the order and at checkout. */
export function TotalsBlock({ cart, tip = 0 }: { cart: CartItem[]; tip?: number }) {
  const m = orderMoney(cart);
  return (
    <Box sx={{ px: 2, py: 1 }}>
      <MoneyRow label="Subtotal" value={cartLogic.money(m.subtotal)} />
      {m.discount < 0 && (
        <MoneyRow label="Discounts" value={cartLogic.creditMoney(m.discount)} color={md3.error} />
      )}
      <MoneyRow label={m.exempt ? 'Tax (exempt)' : 'Tax'} value={cartLogic.money(m.tax)} />
      {tip > 0 && <MoneyRow label="Tip" value={cartLogic.money(tip)} />}
      <Box sx={{ borderTop: `1px solid ${md3.outlineVariant}`, mt: 1, pt: 1 }}>
        <MoneyRow label="Total" value={cartLogic.money(m.total + tip)} strong />
      </Box>
    </Box>
  );
}

/** Tonal callout — MD3 has no "alert" component, so this is a filled card in a note colour. */
export function Callout({
  tone = 'info',
  icon,
  children,
  sx,
}: {
  tone?: 'info' | 'warning' | 'success';
  icon?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  const c = tone === 'warning' ? noteColors.yellow : tone === 'success' ? noteColors.green : noteColors.blue;
  return (
    <Stack
      direction="row"
      gap={1.5}
      sx={{ alignItems: 'flex-start', p: 1.5, borderRadius: `${radius.md}px`, bgcolor: c.bg, color: c.text, ...sx }}
    >
      {icon && <Box sx={{ color: c.dot, display: 'flex', mt: '1px' }}>{icon}</Box>}
      <Typography variant="body2" sx={{ color: c.text, flex: 1 }}>
        {children}
      </Typography>
    </Stack>
  );
}

// ─── View-order bar ─────────────────────────────────────────────────────────

/**
 * The order, one tap away. Pinned under the register and every category while the order
 * has anything on it — the phone's stand-in for the terminal's always-visible left panel.
 *
 * It's a full-width button rather than an FAB because it carries information (line count
 * and running total) that has to stay readable, and a FAB's job is one icon-sized action.
 */
export function ViewOrderBar() {
  const { state } = usePos();
  const nav = useMobileNav();
  const count = orderLines(state.cart).length;
  if (count === 0) return null;
  const { total } = orderMoney(state.cart);

  return (
    <Box sx={{ px: 2, pt: 1, pb: 1.5, flexShrink: 0, bgcolor: md3.surface }}>
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={() => nav.push({ name: 'order' })}
        sx={{ justifyContent: 'space-between', px: 2.5, borderRadius: `${radius.lg}px` }}
      >
        <Stack direction="row" alignItems="center" gap={1.25}>
          <ShoppingCartOutlined />
          <span>View order</span>
          <Box
            component="span"
            sx={{
              minWidth: 24,
              height: 24,
              px: 0.75,
              borderRadius: 12,
              bgcolor: md3.onPrimary,
              color: md3.primary,
              fontSize: 13,
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {count}
          </Box>
        </Stack>
        <span>{cartLogic.money(total)}</span>
      </Button>
    </Box>
  );
}

// ─── Adding items ───────────────────────────────────────────────────────────

/** Would this rate mix 9 and 18 holes on one tee time? */
export function isHoleLocked(item: CatalogItem, lock: '9H' | '18H' | null): boolean {
  if (!lock || !CHECK_IN_ITEMS.has(item.n)) return false;
  if (lock === '9H' && item.n.includes('18')) return true;
  if (lock === '18H' && /\b9\b/.test(item.n)) return true;
  return false;
}

/**
 * Route a catalog tap, the same way the terminal's `PosView.handleAdd` does.
 *
 * Two kinds of item can't just be added: a modifier needs to know which player it applies
 * to, and a member rate needs a verified member. On the terminal both open a centred
 * dialog; here both open a **bottom sheet** — each is a short, contextual pick from a list,
 * which is exactly what MD3 reserves sheets for, and it keeps the operator in the category
 * they were browsing.
 */
export function useAddItem() {
  const { state, dispatch, toast } = usePos();
  const [memberItem, setMemberItem] = useState<CatalogItem | null>(null);
  const [modifier, setModifier] = useState<CatalogItem | null>(null);
  const lock = cartLogic.cartHolesLock(state.cart);

  const add = (item: CatalogItem) => {
    if (cartLogic.isModifierItem(item.n)) {
      if (!cartLogic.findCheckInItem(state.cart)) return toast('Add a round before applying a modifier');
      return setModifier(item);
    }
    if (isHoleLocked(item, lock)) return toast(`This order is locked to ${lock === '18H' ? '18' : '9'} holes`);
    if (MEMBER_ITEM_TYPES[item.n]) return setMemberItem(item);
    dispatch({ type: 'addItem', name: item.n, price: item.p });
    toast(`Added · ${item.n}`);
  };

  const sheets = (
    <>
      <MemberSheet item={memberItem} onClose={() => setMemberItem(null)} />
      <ModifierSheet item={modifier} onClose={() => setModifier(null)} />
    </>
  );

  return { add, sheets, lock };
}

/** Pick the member a member rate is for. Only eligible tiers can be chosen. */
function MemberSheet({ item, onClose }: { item: CatalogItem | null; onClose: () => void }) {
  const { dispatch, toast } = usePos();
  // The session roster, so a member created today can buy their rate like any other.
  const roster = useGolferRoster();
  const tier = item ? (MEMBER_ITEM_TYPES[item.n] as MemberTypeKey) : null;
  const cfg = tier ? memberTypes[tier] : null;
  const eligible = tier ? roster.filter((g) => g.memberType === tier) : [];

  return (
    <BottomSheet open={Boolean(item)} onClose={onClose} title="Verify membership">
      {item && cfg && (
        <>
          <Typography variant="body2" sx={{ px: 3, pb: 1.5, color: md3.onSurfaceVariant }}>
            {item.n} is for {cfg.label.toLowerCase()}s. Choose who's playing.
          </Typography>
          {eligible.map((g) => (
            <ButtonBase
              key={g.id}
              onClick={() => {
                dispatch({ type: 'selectGolfer', golfer: g });
                dispatch({ type: 'addItem', name: item.n, price: item.p });
                toast(`${item.n} · ${g.name}`);
                onClose();
              }}
              sx={{ width: '100%', justifyContent: 'flex-start', gap: 2, px: 3, minHeight: mobile.listItem.two }}
            >
              <VerifiedUserOutlined sx={{ color: cfg.color }} />
              <Box sx={{ flex: 1, textAlign: 'left' }}>
                <Typography variant="body1">{g.name}</Typography>
                <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
                  {g.phone} · HCP {g.hcp}
                </Typography>
              </Box>
            </ButtonBase>
          ))}
        </>
      )}
    </BottomSheet>
  );
}

/** Apply a modifier to one or more players on the round, toggling in place. */
function ModifierSheet({ item, onClose }: { item: CatalogItem | null; onClose: () => void }) {
  const { state, dispatch } = usePos();
  const itemIdx = state.cart.findIndex((i) => i.isCheckIn && !i.is18HBack);
  const line = state.cart[itemIdx];
  const players = line?.players ?? [];

  return (
    <BottomSheet open={Boolean(item)} onClose={onClose} title={item ? `Apply ${item.n}` : ''}>
      {item && line && (
        <>
          <Typography variant="body2" sx={{ px: 3, pb: 1.5, color: md3.onSurfaceVariant }}>
            {item.desc}. Tap each player it applies to.
          </Typography>
          {players.map((p, i) => {
            const on = p.modifierTags.some((t) => t.name === item.n);
            const name = seatName(p, i);
            return (
              <ButtonBase
                key={i}
                onClick={() =>
                  dispatch({ type: 'togglePlayerModifier', itemIndex: itemIdx, playerIndex: i, modName: item.n })
                }
                sx={{ width: '100%', justifyContent: 'flex-start', gap: 2, px: 3, minHeight: mobile.listItem.two }}
              >
                <SeatAvatar name={name} index={i} />
                <Box sx={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <Typography variant="body1" noWrap>
                    {name}
                  </Typography>
                  <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
                    {cartLogic.money(cartLogic.playerPrice(line.unitPrice ?? 0, p))}
                  </Typography>
                </Box>
                {on && <Check sx={{ color: md3.primary }} />}
              </ButtonBase>
            );
          })}
          <Box sx={{ px: 3, pt: 1.5 }}>
            <Button variant="contained" fullWidth onClick={onClose}>
              Done
            </Button>
          </Box>
        </>
      )}
    </BottomSheet>
  );
}

// ─── Reservations ───────────────────────────────────────────────────────────

/**
 * The booking a reservation writes to the tee sheet. Ported from the terminal's
 * `ReserveConfirm.finalize`, with a deterministic id so a screenshot is stable.
 * Returns null — with the reason — when the party no longer fits together at that time.
 */
export function reservationFor(
  state: PosState,
  paid: boolean,
): { booking: Booking | null; error?: string } {
  const checkIn = state.cart.find((i) => i.isCheckIn && i.teeTime && !i.is18HBack);
  if (!checkIn?.teeTime) return { booking: null, error: 'Choose a tee time first' };
  const slot = checkIn.teeTime;
  const players = checkIn.players ?? [];
  const course = state.courses.find((c) => c.id === slot.courseId);
  const runs = course ? [...runsAt(dayBookings(state), course, slot.timeMin).values()] : [];
  const fit = runs.reduce((m, r) => Math.max(m, r.size), 0);
  if (fit < players.length) {
    return { booking: null, error: `Only ${fit} slot${fit === 1 ? '' : 's'} together at ${slot.label}` };
  }
  const startSlot = runs.find((r) => r.size >= players.length)?.start ?? 0;
  const playerStates: PlayerState[] = players.map(() => ({ paid, step: -1, noShow: false }));
  const n = state.bookings.length;
  return {
    booking: {
      id: `mobile-${n}`,
      date: toDateStr(state.currentDate),
      course: slot.courseId,
      slot: startSlot,
      timeMin: slot.timeMin,
      name: players[0]?.name || 'Reservation',
      players: players.length,
      cart: players[0]?.transport ?? 'walking',
      status: 'booked',
      phone: state.selectedGolfer?.phone ?? '—',
      conf: `R-${4000 + (n % 5000)}`,
      pay: paid ? 'paid' : 'open',
      price: checkIn.unitPrice ?? 0,
      holes: /18/.test(checkIn.name) ? '18H' : '9H',
      playerStates,
      guests: players.map((p) => ({ name: p.name })),
    },
  };
}

/** A category's colours, for tinting cards and list leading elements. */
export function categoryColors(category: string) {
  const d = CATALOG[category];
  const color = d?.color ?? md3.primary;
  return { color, tc: d?.tc ?? md3.onPrimary, wash: hexRgba(color, 0.12), line: hexRgba(color, 0.32) };
}

/**
 * Record an approved payment. When the order is a reservation being paid now, this is
 * also the moment the booking is written — as paid — so a cancelled or declined payment
 * never leaves a reservation behind.
 */
export function useCompletePayment() {
  const { state, dispatch } = usePos();
  return (method: string, amount: number) => {
    if (state.flowMode === 'reserve') {
      const { booking } = reservationFor(state, true);
      if (booking) dispatch({ type: 'addBookings', bookings: [booking] });
    }
    dispatch({ type: 'recordPayment', method, amount });
  };
}
