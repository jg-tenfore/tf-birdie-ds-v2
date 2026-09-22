import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Button, ButtonBase, IconButton, Menu, MenuItem, ListItemIcon, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import AddShoppingCart from '@mui/icons-material/AddShoppingCart';
import ChevronRight from '@mui/icons-material/ChevronRight';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import EventAvailable from '@mui/icons-material/EventAvailable';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import ManageAccountsOutlined from '@mui/icons-material/ManageAccountsOutlined';
import MoreVert from '@mui/icons-material/MoreVert';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import Remove from '@mui/icons-material/Remove';
import Schedule from '@mui/icons-material/Schedule';
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined';
import StickyNote2Outlined from '@mui/icons-material/StickyNote2Outlined';
import SyncAlt from '@mui/icons-material/SyncAlt';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { TRANSPORT_META } from '../../../data/config';
import { COURSES, formatTimeLabel } from '../../../data/courses';
import * as cartLogic from '../../../logic/cart';
import { selectedBooking } from '../../../state/pos-store';
import { rateContext } from '../../../state/pos-store';
import { useGolferRoster, usePos } from '../../../state/PosProvider';
import type { CartItem } from '../../../types';
import { BookingMemberDot, MemberDot, PayBadge } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import { BottomActionBar, BottomSheet, MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import { useWestonEdits } from '../../../edition';
import { IdMeBadge } from '../tee/parts';
import { partyHoles, partyTransport } from '../tee/reservation-helpers';
import { seatIdMe } from '../../../logic/seat-customer';
import {
  Callout,
  SeatAvatar,
  Subheader,
  TotalsBlock,
  isNamedSeat,
  orderLines,
  orderMoney,
  seatName,
  seatSummary,
} from './parts';

/**
 * The order — the terminal's left panel, as its own screen.
 *
 * Pushed from the register (View order bar) or opened straight from the tee sheet when a
 * booking is loaded (`nav.openIn('register', { name: 'order' })`), in which case back
 * lands on the register root rather than the sheet: the order *belongs* to the register.
 *
 * Top to bottom it reads in the order an operator works: who (booking or customer), when
 * (tee time), each player and why they cost what they cost, retail, then money. The one
 * primary action is pinned at the bottom and changes with the order's state — Choose tee
 * time → Reserve → Charge — exactly as the terminal's Pay button does.
 */
export function OrderScreen() {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const booking = selectedBooking(state);
  const checkInIdx = state.cart.findIndex((i) => i.isCheckIn && !i.is18HBack);
  const checkIn = state.cart[checkInIdx];
  const back9 = state.cart.find((i) => i.is18HBack);
  const lines = orderLines(state.cart);
  const money = orderMoney(state.cart);
  const isReserve = state.flowMode === 'reserve';
  const needsTeeTime = Boolean(checkIn) && !checkIn?.teeTime && !booking;
  // Weston Edits: a round loaded from a reservation is golf already decided — the order
  // shows it read-only and sends edits back to the reservation.
  const weston = useWestonEdits();
  const golfSummary = weston && Boolean(booking) && Boolean(checkIn);

  // Weston Edits: the reservation is the source of truth for the golf, and it can change
  // after the order was opened (Edit reservation → back). When the order's golf lines no
  // longer match what the booking builds, reload it — `loadBooking` on the same booking
  // rebuilds only the golf and keeps retail, F&B and any payment already taken.
  const staleGolf =
    weston &&
    booking != null &&
    state.cart.some((i) => i.isCheckIn) &&
    JSON.stringify(golfLines(state.cart)) !== JSON.stringify(golfLines(cartLogic.buildTeeTimeCart(booking, state.courses, rateContext(state))));
  useEffect(() => {
    if (staleGolf && booking) dispatch({ type: 'loadBooking', bookingId: booking.id });
  }, [staleGolf, booking, dispatch]);

  const subtitle = booking
    ? `${booking.name} · ${booking.conf}`
    : isReserve
      ? 'Reservation'
      : checkIn
        ? 'Walk-in'
        : lines.length
          ? 'Retail sale'
          : 'Nothing added yet';

  const menuAction = (fn: () => void) => () => {
    setMenu(null);
    fn();
  };

  const clearOrder = () => {
    dispatch({ type: 'clearOrder' });
    toast('Order cleared');
    setConfirmClear(false);
    nav.popToRoot();
  };

  return (
    <MobileScreen
      topBar={
        <TopAppBar
          title="Order"
          subtitle={subtitle}
          actions={
            lines.length > 0 && (
              <IconButton aria-label="Order options" onClick={(e) => setMenu(e.currentTarget)}>
                <MoreVert />
              </IconButton>
            )
          }
        />
      }
      bottomBar={lines.length > 0 && <OrderActions needsTeeTime={needsTeeTime} isReserve={isReserve} />}
    >
      {lines.length === 0 ? (
        <Stack alignItems="center" gap={2} sx={{ pt: 12, px: 4, textAlign: 'center' }}>
          <ShoppingCartOutlined sx={{ fontSize: 48, color: md3.outline }} />
          <Box>
            <Typography variant="h6">No items yet</Typography>
            <Typography variant="body2" sx={{ color: md3.onSurfaceVariant, mt: 0.5 }}>
              Add a round or retail from the register, or open a booking from the tee sheet.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddShoppingCart />} onClick={() => nav.popToRoot()}>
            Browse catalog
          </Button>
        </Stack>
      ) : (
        <Box sx={{ pb: 2 }}>
          {/* ── Who / when ── */}
          <Box sx={{ px: 2, pt: 1 }}>
            {booking ? (
              <BookingCard />
            ) : (
              <CustomerRow />
            )}
          </Box>

          {checkIn && !booking && (
            <Box sx={{ px: 2, pt: 1.5 }}>
              <TeeTimeRow item={checkIn} back9={back9} isReserve={isReserve} />
            </Box>
          )}

          {/* ── Round ── */}
          {golfSummary && <GolfSummary item={checkIn!} />}
          {checkIn && !golfSummary && (
            <>
              <Subheader
                sx={{ mt: 1 }}
                action={
                  <Stack direction="row" alignItems="center">
                    <IconButton
                      size="small"
                      aria-label="Remove player"
                      disabled={checkIn.qty <= 1}
                      onClick={() => dispatch({ type: 'removePlayer', itemIndex: checkInIdx })}
                    >
                      <Remove />
                    </IconButton>
                    <Typography variant="subtitle2" sx={{ minWidth: 72, textAlign: 'center' }}>
                      {checkIn.qty} player{checkIn.qty === 1 ? '' : 's'}
                    </Typography>
                    <IconButton
                      size="small"
                      aria-label="Add player"
                      disabled={checkIn.qty >= 5}
                      onClick={() => dispatch({ type: 'addPlayer', itemIndex: checkInIdx })}
                    >
                      <Add />
                    </IconButton>
                  </Stack>
                }
              >
                {checkIn.name}
              </Subheader>
              <Typography variant="caption" component="div" sx={{ px: 2, mt: -1.5, mb: 0.5 }}>
                {cartLogic.money(checkIn.unitPrice ?? 0)} per player · tap a player for rates, cart and discounts
              </Typography>
              <PlayerRows item={checkIn} itemIdx={checkInIdx} />
              {back9?.teeTime && (
                <Stack direction="row" alignItems="center" gap={2} sx={{ px: 2, minHeight: mobile.listItem.two }}>
                  <SyncAlt sx={{ color: md3.onSurfaceVariant, mx: 1 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1">Back nine crossover</Typography>
                    <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
                      {back9.teeTime.label} · {back9.teeTime.courseName}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle2">
                    {cartLogic.money(
                      (back9.players ?? []).reduce((s, p) => s + cartLogic.playerPrice(back9.unitPrice ?? 0, p), 0),
                    )}
                  </Typography>
                </Stack>
              )}
            </>
          )}

          {/* ── Retail ── */}
          {lines.some((i) => !i.isCheckIn) && (
            <>
              <Subheader sx={{ mt: 1 }}>Items</Subheader>
              {state.cart.map((item, idx) =>
                item.isCheckIn || item.isSubItem ? null : <RetailRow key={`${item.name}-${idx}`} item={item} index={idx} />,
              )}
            </>
          )}

          <Box sx={{ px: 2, pt: 1.5 }}>
            <Button variant="outlined" fullWidth startIcon={<AddShoppingCart />} onClick={() => nav.popToRoot()}>
              Add items
            </Button>
          </Box>

          {/* ── Money ── */}
          <Subheader sx={{ mt: 1 }}>Summary</Subheader>
          <TotalsBlock cart={state.cart} />
          {state.lastPayment && (
            <Box sx={{ px: 2 }}>
              <Callout tone="success">
                Paid {cartLogic.money(state.lastPayment.amount)} by {state.lastPayment.method} at {state.lastPayment.time}.
              </Callout>
            </Box>
          )}
          {money.total <= 0 && !state.lastPayment && (
            <Box sx={{ px: 2, pt: 1 }}>
              <Callout tone="info">
                {cartLogic.cartIsSettled(state.cart)
                  ? 'Nothing to charge — this tee time is already paid.'
                  : 'Nothing to charge — this order is covered by member rates.'}
              </Callout>
            </Box>
          )}
        </Box>
      )}

      {/* Overflow — MD3 menu anchored to the ⋮, kept inside the phone frame. */}
      <Menu
        anchorEl={menu}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
        disablePortal
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 220, borderRadius: `${radius.sm}px` } } }}
      >
        {checkIn && !golfSummary && checkIn.qty < 5 && (
          <MenuItem onClick={menuAction(() => dispatch({ type: 'addPlayer', itemIndex: checkInIdx }))}>
            <ListItemIcon>
              <PersonAddOutlined />
            </ListItemIcon>
            Add player
          </MenuItem>
        )}
        <MenuItem onClick={menuAction(() => nav.push({ name: 'golferPicker', target: 'primary' }))}>
          <ListItemIcon>
            <ManageAccountsOutlined />
          </ListItemIcon>
          Change customer
        </MenuItem>
        <MenuItem
          onClick={menuAction(() => {
            const i = state.cart.findIndex((x) => x.name === 'Tax Exempt');
            if (i >= 0) {
              dispatch({ type: 'removeItem', index: i });
              toast('Tax exempt removed');
            } else {
              dispatch({ type: 'addRawItem', item: { name: 'Tax Exempt', price: 0, qty: 1, isSubItem: true } });
              toast('Tax exempt applied');
            }
          })}
        >
          <ListItemIcon>
            <ReceiptLongOutlined />
          </ListItemIcon>
          {money.exempt ? 'Remove tax exempt' : 'Tax exempt'}
        </MenuItem>
        <MenuItem onClick={menuAction(() => setConfirmClear(true))} sx={{ color: md3.error }}>
          <ListItemIcon sx={{ color: md3.error }}>
            <DeleteOutlined />
          </ListItemIcon>
          Clear order
        </MenuItem>
      </Menu>

      <BottomSheet open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear this order?">
        <Typography variant="body2" sx={{ px: 3, color: md3.onSurfaceVariant }}>
          Removes {lines.length} line{lines.length === 1 ? '' : 's'} and the customer.
          {booking ? ' The booking stays on the tee sheet.' : ''} This can't be undone.
        </Typography>
        <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ px: 3, pt: 3 }}>
          <Button onClick={() => setConfirmClear(false)}>Keep order</Button>
          <Button variant="contained" color="error" onClick={clearOrder}>
            Clear order
          </Button>
        </Stack>
      </BottomSheet>
    </MobileScreen>
  );
}

// ─── Who ────────────────────────────────────────────────────────────────────

/** A loaded tee-sheet booking: the facts an operator reads back at the counter. */
function BookingCard() {
  const { state } = usePos();
  const nav = useMobileNav();
  const booking = selectedBooking(state)!;
  const course = state.courses.find((c) => c.id === booking.course) ?? COURSES.find((c) => c.id === booking.course);
  const transport = TRANSPORT_META[booking.cart]?.label ?? 'Walking';
  const weston = useWestonEdits();

  return (
    <Box sx={{ borderRadius: `${radius.md}px`, bgcolor: mobile.surfaceContainerLow, border: `1px solid ${md3.outlineVariant}`, p: 2 }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <BookingMemberDot booking={booking} size={10} />
        <Typography variant="subtitle1" noWrap sx={{ flex: 1, minWidth: 0 }}>
          {booking.name}
        </Typography>
        <PayBadge pay={booking.pay} />
      </Stack>
      <Stack gap={0.75} sx={{ mt: 1.25 }}>
        <Fact icon={<Schedule fontSize="small" />}>
          {formatTimeLabel(booking.timeMin)} · {course?.name ?? booking.course}
        </Fact>
        <Fact icon={<GroupOutlined fontSize="small" />}>
          {booking.players} players · {weston ? `${partyHoles(booking)} · ${partyTransport(booking)}` : transport} · {booking.conf}
        </Fact>
        {booking.note && (
          <Fact icon={<StickyNote2Outlined fontSize="small" />}>{booking.note}</Fact>
        )}
      </Stack>
      <Button
        size="small"
        sx={{ mt: 1, ml: -1.5 }}
        onClick={() => nav.openIn('tee', { name: 'bookingDetail', bookingId: booking.id })}
      >
        {weston ? 'View reservation' : 'View booking'}
      </Button>
    </Box>
  );
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Stack direction="row" gap={1.5} sx={{ alignItems: 'flex-start', color: md3.onSurfaceVariant }}>
      {icon}
      <Typography variant="body2" sx={{ color: md3.onSurface }}>
        {children}
      </Typography>
    </Stack>
  );
}

/** Who the order is for when it didn't come from a booking. */
function CustomerRow() {
  const { state } = usePos();
  const nav = useMobileNav();
  const checkIn = cartLogic.findCheckInItem(state.cart);
  const name =
    state.selectedGolfer?.name ?? (checkIn && isNamedSeat(checkIn.players?.[0], 0) ? checkIn.players![0].name : null);

  return (
    <ListRow
      icon={<PersonOutlined />}
      primary={name ?? 'Add customer'}
      secondary={name ? (state.selectedGolfer?.phone ?? 'Player 1') : 'Optional for retail · required to reserve'}
      onClick={() => nav.push({ name: 'golferPicker', target: 'primary' })}
      trailing={name ? <MemberDot name={name} size={10} /> : undefined}
      outlined
    />
  );
}

/** The tee time — a destination in itself when missing, an editable fact once chosen. */
function TeeTimeRow({ item, back9, isReserve }: { item: CartItem; back9?: CartItem; isReserve: boolean }) {
  const nav = useMobileNav();
  const t = item.teeTime;
  const is18 = /18/.test(item.name);

  if (!t) {
    return (
      <ListRow
        icon={<EventAvailable sx={{ color: md3.primary }} />}
        primary="Choose tee time"
        secondary={`${item.players?.length ?? item.qty} players · ${is18 ? '18 holes — front and back nine' : '9 holes'}`}
        onClick={() => nav.push({ name: 'teePicker' })}
        tone
      />
    );
  }
  return (
    <ListRow
      icon={<Schedule />}
      primary={`${back9?.teeTime ? 'Front 9 · ' : ''}${t.label} · ${t.courseName}`}
      secondary={
        back9?.teeTime
          ? `Back 9 · ${back9.teeTime.label} · ${back9.teeTime.courseName}`
          : `${isReserve ? 'Reservation' : 'Walk-in'} · pending`
      }
      onClick={() => nav.push({ name: 'teePicker' })}
      trailing={<EditOutlined sx={{ color: md3.onSurfaceVariant }} />}
      outlined
    />
  );
}

function ListRow({
  icon,
  primary,
  secondary,
  trailing,
  onClick,
  outlined,
  tone,
}: {
  icon: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  trailing?: ReactNode;
  onClick: () => void;
  outlined?: boolean;
  tone?: boolean;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        gap: 2,
        px: 2,
        minHeight: mobile.listItem.two,
        borderRadius: `${radius.md}px`,
        border: outlined ? `1px solid ${md3.outlineVariant}` : 'none',
        bgcolor: tone ? md3.primaryContainer : 'transparent',
        color: tone ? md3.onPrimaryContainer : md3.onSurface,
        textAlign: 'left',
      }}
    >
      <Box sx={{ display: 'flex', color: md3.onSurfaceVariant }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" noWrap sx={{ fontWeight: tone ? 500 : 400 }}>
          {primary}
        </Typography>
        {secondary && (
          <Typography variant="body2" noWrap sx={{ color: tone ? md3.onPrimaryContainer : md3.onSurfaceVariant }}>
            {secondary}
          </Typography>
        )}
      </Box>
      {trailing ?? <ChevronRight sx={{ color: md3.onSurfaceVariant }} />}
    </ButtonBase>
  );
}

// ─── Lines ──────────────────────────────────────────────────────────────────

/**
 * One MD3 list item per player. The supporting line says *why* the seat costs what it
 * does; tapping pushes that player's modifiers — the terminal's "+ modifier" and "Guest
 * Details" buttons folded into one drill-down.
 */
function PlayerRows({ item, itemIdx }: { item: CartItem; itemIdx: number }) {
  const { state } = usePos();
  const nav = useMobileNav();
  const booking = selectedBooking(state);
  const unit = item.unitPrice ?? 0;

  return (
    <Box>
      {(item.players ?? []).map((p, i) => {
        const name = seatName(p, i);
        const total = cartLogic.playerPrice(unit, p);
        const note = booking?.playerNotes?.[i];
        return (
          <ButtonBase
            key={i}
            onClick={() => nav.push({ name: 'playerModifiers', itemIdx, playerIdx: i })}
            sx={{ width: '100%', justifyContent: 'flex-start', gap: 2, px: 2, py: 1, minHeight: mobile.listItem.two }}
          >
            <SeatAvatar name={name} index={i} />
            <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <Stack direction="row" alignItems="center" gap={0.75}>
                <Typography variant="body1" noWrap sx={{ color: isNamedSeat(p, i) ? md3.onSurface : md3.onSurfaceVariant }}>
                  {name}
                </Typography>
                <MemberDot name={p.name} memberType={p.memberType} />
              </Stack>
              <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
                {seatSummary(unit, p)}
              </Typography>
              {note && (
                <Typography variant="caption" noWrap component="div">
                  Note · {note}
                </Typography>
              )}
            </Box>
            <Typography variant="subtitle2">{cartLogic.money(total)}</Typography>
            <ChevronRight sx={{ color: md3.onSurfaceVariant, mr: -1 }} />
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/**
 * Weston Edits · Register Golf Summary. The golf on the order, read-only: who's playing,
 * holes, fee and transport, as the reservation set them. Weston: "the order comes after the
 * golf … modifiers are used for food and beverage" — so golf lines have no per-player
 * modifier push here, and no player stepper. **Edit reservation** goes back to the
 * reservation on the Tee Sheet destination (see `editReservation`), and the order follows
 * whatever is changed there.
 */
function GolfSummary({ item }: { item: CartItem }) {
  const { state } = usePos();
  const nav = useMobileNav();
  const roster = useGolferRoster();
  const booking = selectedBooking(state)!;
  const unit = item.unitPrice ?? 0;
  const players = item.players ?? [];
  return (
    <>
      <Subheader
        sx={{ mt: 1 }}
        action={
          <Button size="small" startIcon={<EditOutlined />} onClick={() => editReservation(nav, booking.id)}>
            Edit reservation
          </Button>
        }
      >
        Golf · {item.name}
      </Subheader>
      <Box sx={{ mx: 2, borderRadius: `${radius.md}px`, border: `1px solid ${md3.outlineVariant}`, overflow: 'hidden' }}>
        {players.map((p, i) => {
          const name = seatName(p, i);
          const settled = p.paid || p.noShow;
          const transport = TRANSPORT_META[p.transport]?.label ?? 'Walking';
          const idMe = seatIdMe(booking, i, roster);
          const bd = cartLogic.playerBreakdown(unit, { ...p, paid: false, noShow: false });
          return (
            <Stack
              key={i}
              direction="row"
              alignItems="center"
              gap={2}
              sx={{ px: 2, py: 1, minHeight: mobile.listItem.two, borderTop: i ? `1px solid ${md3.outlineVariant}` : 'none' }}
            >
              <SeatAvatar name={name} index={i} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" gap={0.75}>
                  <Typography variant="body1" noWrap sx={{ color: isNamedSeat(p, i) ? md3.onSurface : md3.onSurfaceVariant }}>
                    {name}
                  </Typography>
                  <MemberDot name={p.name} memberType={p.memberType} />
                  {idMe && <IdMeBadge group={idMe} compact />}
                </Stack>
                <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
                  {p.holes ?? (/18/.test(item.name) ? 18 : 9)} holes · {transport}
                  {p.noShow ? ' · no-show' : p.paid ? ' · paid' : ''}
                </Typography>
                <Typography variant="caption" noWrap component="div">
                  Tee fee {cartLogic.money(bd.fee)}
                  {bd.transport ? ` + cart ${cartLogic.money(bd.transport)}` : ''}
                </Typography>
              </Box>
              {/* A settled seat shows what it cost, struck through — it's on the order, not on the bill. */}
              <Typography variant="subtitle2" sx={{ color: settled ? md3.outline : md3.onSurface, textDecoration: settled ? 'line-through' : 'none' }}>
                {cartLogic.money(bd.total)}
              </Typography>
            </Stack>
          );
        })}
      </Box>
      <Typography variant="caption" component="div" sx={{ px: 2, pt: 1 }}>
        Players, holes, tee fees and transport come from the reservation. Add food, drinks and retail below.
      </Typography>
    </>
  );
}

/** The golf part of a cart — check-in and tax lines — for comparing against the booking. */
const golfLines = (cart: CartItem[]) => cart.filter((i) => i.isCheckIn || i.isTax || i.name === 'Taxes');

/**
 * Where Edit reservation goes: the reservation on the **Tee Sheet** destination, not a push
 * over the order. The reservation's home is the tee sheet (Weston's point is not losing the
 * sheet's context), each destination keeps its own stack, and the order stays put on the
 * Register destination — badge and all — so "Check in & pay" or the Register tab returns to
 * it. It's the same jump the order's "View booking" always made.
 */
function editReservation(nav: ReturnType<typeof useMobileNav>, bookingId: string) {
  nav.openIn('tee', { name: 'bookingDetail', bookingId });
}

/** Retail line: name, unit price, a 48dp stepper, line total. Stepping to zero removes. */
function RetailRow({ item, index }: { item: CartItem; index: number }) {
  const { dispatch } = usePos();
  const total = item.price * item.qty;
  return (
    <Stack direction="row" alignItems="center" gap={1} sx={{ pl: 2, pr: 1, minHeight: mobile.listItem.two }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" noWrap>
          {item.name}
        </Typography>
        <Typography variant="body2" sx={{ color: total < 0 ? md3.error : md3.onSurfaceVariant }}>
          {cartLogic.money(total)}
          {item.qty > 1 ? ` · ${cartLogic.money(item.price)} each` : ''}
        </Typography>
      </Box>
      <Stack
        direction="row"
        alignItems="center"
        sx={{ border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.xl}px`, height: 40 }}
      >
        <IconButton
          size="small"
          aria-label={item.qty === 1 ? `Remove ${item.name}` : `One fewer ${item.name}`}
          onClick={() => dispatch({ type: 'changeQty', index, delta: -1 })}
        >
          {item.qty === 1 ? <DeleteOutlined fontSize="small" /> : <Remove fontSize="small" />}
        </IconButton>
        <Typography variant="subtitle2" sx={{ minWidth: 20, textAlign: 'center' }}>
          {item.qty}
        </Typography>
        <IconButton
          size="small"
          aria-label={`One more ${item.name}`}
          onClick={() => dispatch({ type: 'changeQty', index, delta: 1 })}
        >
          <Add fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
}

// ─── Primary action ─────────────────────────────────────────────────────────

/**
 * The pinned action. One button in every state but reservations, where the operator
 * genuinely has two choices (hold now, pay at the counter — or take payment now), so both
 * sit side by side rather than hiding one in a menu.
 */
function OrderActions({ needsTeeTime, isReserve }: { needsTeeTime: boolean; isReserve: boolean }) {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const { total } = orderMoney(state.cart);

  if (state.lastPayment) {
    return (
      <BottomActionBar>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() => {
            dispatch({ type: 'clearOrder' });
            nav.popToRoot();
          }}
        >
          New order
        </Button>
      </BottomActionBar>
    );
  }

  if (needsTeeTime) {
    return (
      <BottomActionBar
        summary={<Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>A round needs a tee time before it can be {isReserve ? 'reserved' : 'charged'}.</Typography>}
      >
        <Button variant="contained" size="large" fullWidth startIcon={<Schedule />} onClick={() => nav.push({ name: 'teePicker' })}>
          Choose tee time
        </Button>
      </BottomActionBar>
    );
  }

  if (isReserve) {
    const t = cartLogic.findCheckInItem(state.cart)?.teeTime;
    return (
      <BottomActionBar
        summary={
          t && (
            <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
              Reserve {t.label} · {t.courseName}
            </Typography>
          )
        }
      >
        <Button
          variant="outlined"
          size="large"
          sx={{ flex: 1 }}
          onClick={() => nav.push({ name: 'reserveConfirm', payMode: 'later' })}
        >
          Pay later
        </Button>
        <Button
          variant="contained"
          size="large"
          sx={{ flex: 1.4 }}
          onClick={() => nav.push({ name: 'reserveConfirm', payMode: 'now' })}
        >
          Pay now · {cartLogic.money(total)}
        </Button>
      </BottomActionBar>
    );
  }

  // Bug fix (all editions): an order with nothing due — a paid booking reopened, or a member
  // at $0 — no longer offers "Charge $0.00". It closes the order instead, which also
  // detaches the booking so it can't ride along into the next sale.
  if (total <= 0) {
    const settled = cartLogic.cartIsSettled(state.cart);
    return (
      <BottomActionBar
        summary={
          <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
            {settled ? 'Paid in full — nothing to charge.' : 'Nothing to charge.'}
          </Typography>
        }
      >
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() => {
            dispatch({ type: 'clearOrder' });
            toast(settled ? 'Order closed · already paid' : 'Order closed');
            nav.popToRoot();
          }}
        >
          Done
        </Button>
      </BottomActionBar>
    );
  }

  return (
    <BottomActionBar>
      <Button variant="contained" size="large" fullWidth onClick={() => nav.push({ name: 'checkout' })}>
        Charge {cartLogic.money(total)}
      </Button>
    </BottomActionBar>
  );
}
