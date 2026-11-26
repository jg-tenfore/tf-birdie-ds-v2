import { useState } from 'react';
import { Box, Button, ButtonBase, Divider, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import { elevation, md3, payBadges, radius } from '../../theme/tokens';
import { SETTINGS_MENU_ITEMS, TRANSPORT_META } from '../data/config';
import { COURSES, TIMES } from '../data/courses';
import { useV1V2, useWestonEdits } from '../edition';
import { useLeftPanelWidth } from '../device-context';
import { CASH_PAYOUT_MENU_ITEM } from '../data/register-extras';
import { productSettings } from '../data/products';
import { VENUES } from '../data/venues';
import { lineDiscountAmount, lineDiscountOffers } from '../logic/discounts';

/** V1 → V2 (Nov 26): Buck's discount types on the whole order, from the cog. */
const ORDER_DISCOUNT_MENU_ITEM: (typeof SETTINGS_MENU_ITEMS)[number] = { label: 'Discount Order', icon: 'sell', action: 'orderDiscount', chevron: true };
import { ComboLine, GiftCardLine, HeldOrdersBar, HoldButton } from './RegisterExtras';
import { RailDishLine } from './restaurant/DishLine';
import { roundLabel } from '../logic/reservation';
import { seatRecord } from '../logic/seat-pricing';
import { useStartWalkIn } from './use-start-walk-in';
import { RegisterGolfSummary } from './RegisterGolfSummary';
import { ReturnToLeague } from './league/LeagueWayIn';
import * as cart from '../logic/cart';
import { dominantTransport, selectedBooking } from '../state/pos-store';
import { amountDue, registerTotals } from '../state/operations';
import { usePos } from '../state/PosProvider';
import type { CartItem } from '../types';
import {
  BookingMemberDot,
  EmptyState,
  Icon,
  MemberDot,
  SectionLabel,
  deltaMoney,
  signedMoney,
} from './primitives';
import { Stack } from './Stack';

/**
 * The POS left panel: who is being served, what they're buying, and what it costs.
 *
 * Fixed at 320px and shared by both views — it collapses to zero on the tee sheet
 * so the grid gets full width, then springs back when the operator returns to the
 * POS or loads a booking.
 *
 * Top to bottom: golfer chip + settings cog, guest chips, action buttons (only
 * before a round is on the order), the cart, then the totals and Pay footer.
 */
export function LeftPanel() {
  const { state, dispatch, toast } = usePos();
  const booking = selectedBooking(state);
  const checkIn = cart.findCheckInItem(state.cart);
  // One calculation for the whole order — the same one checkout and the reader charge.
  const totals = registerTotals(state);

  const [cogAnchor, setCogAnchor] = useState<HTMLElement | null>(null);
  const weston = useWestonEdits();
  const v1v2 = useV1V2();
  const railW = useLeftPanelWidth();
  // V1 → V2 adds Cash payout to the cog — a drawer action, not part of any order.
  // Nov 26: Buck's discounts on the whole order sit beside the promo code.
  const menuItems = v1v2 ? [...SETTINGS_MENU_ITEMS.flatMap((i) => (i.action === 'promoCode' ? [ORDER_DISCOUNT_MENU_ITEM, i] : [i])), CASH_PAYOUT_MENU_ITEM] : SETTINGS_MENU_ITEMS;
  const orderCount = orderItemCount(state.cart);
  const hasOrder = orderCount > 0;
  const runQuickAction = useQuickAction();

  // The chip shows the primary golfer: the booking name, the looked-up golfer, or
  // player 1's name once a round has been rung up for a walk-in.
  const primaryName =
    booking?.name ??
    state.selectedGolfer?.name ??
    (checkIn?.players?.[0]?.name && checkIn.players[0].name !== 'Guest 1'
      ? checkIn.players[0].name
      : null);
  const chipLoaded = Boolean(primaryName);

  const guests = checkIn?.players?.slice(1) ?? [];
  const showActions = !booking && !state.flowMode && state.cart.length === 0;

  const handleSettingsAction = (action: string) => {
    setCogAnchor(null);
    switch (action) {
      case 'addGuest': {
        const idx = state.cart.findIndex((i) => i.isCheckIn);
        if (idx === -1) return toast('Add a round first');
        dispatch({ type: 'addPlayer', itemIndex: idx });
        return toast('Guest added');
      }
      case 'changeCustomer':
        return dispatch({ type: 'openModal', modal: { kind: 'golferSearch', target: 'primary' } });
      case 'promoCode':
        // V1 → V2 (Nov 26): a real code table, applied as an order discount.
        if (v1v2) return hasOrder ? dispatch({ type: 'openModal', modal: { kind: 'orderDiscount', tab: 'promo' } }) : toast('Add something to the order first');
        return toast('Promo code — enter at checkout');
      case 'orderDiscount':
        return hasOrder ? dispatch({ type: 'openModal', modal: { kind: 'orderDiscount', tab: 'types' } }) : toast('Add something to the order first');
      case 'taxExempt': {
        const has = state.cart.some((i) => i.name === 'Tax Exempt');
        if (has) {
          const i = state.cart.findIndex((x) => x.name === 'Tax Exempt');
          dispatch({ type: 'removeItem', index: i });
          return toast('Tax exempt removed');
        }
        dispatch({ type: 'addRawItem', item: { name: 'Tax Exempt', price: 0, qty: 1 } });
        return toast('Tax exempt applied');
      }
      case 'removeTeeTime':
        return dispatch({
          type: 'openModal',
          modal: {
            kind: 'confirm',
            title: 'Void tee time?',
            body: 'This releases the slot and clears the order. It cannot be undone.',
            confirmLabel: 'Void tee time',
            onConfirm: 'voidTeeTime',
          },
        });
      case 'refund':
        return dispatch({ type: 'openModal', modal: { kind: 'actionPanel', action: 'refund' } });
      case 'raincheck':
        return dispatch({ type: 'openModal', modal: { kind: 'actionPanel', action: 'raincheck' } });
      case 'cashPayout':
        return dispatch({ type: 'openModal', modal: { kind: 'cashPayout' } });
      // V1 → V2 (Nov 26): the order tools that used to toast "coming soon".
      case 'split':
      case 'transferCourse':
      case 'serviceCharge':
        if (!v1v2) return toast(`${action} — coming soon`);
        if (!hasOrder || state.lastPayment) return toast('Add something to the order first');
        return dispatch({
          type: 'openModal',
          modal: { kind: action === 'split' ? 'splitCheck' : action === 'transferCourse' ? 'transferOrder' : 'serviceCharge' },
        });
      case 'reprintReceipt':
        return v1v2 ? dispatch({ type: 'openModal', modal: { kind: 'receipt' } }) : toast(`${action} — coming soon`);
      default:
        return toast(`${action} — coming soon`);
    }
  };

  // Weston: "this takes up a lot of space if there's nothing in it… on the tee sheet we always
  // want to maximise the space we have." Collapsing is the operator's call, not automatic, so
  // the rail keeps a strip with the control on it rather than vanishing to nothing — a panel you
  // cannot get back is worse than one that is too wide.
  if (weston && state.leftPanelCollapsed) return <RailStrip />;

  return (
    <Box
      sx={{
        // 320, or 380 on the large display (`useLeftPanelWidth`).
        width: state.leftPanelCollapsed ? 0 : railW,
        flexShrink: 0,
        bgcolor: '#fff',
        borderRight: state.leftPanelCollapsed ? 'none' : `1px solid ${md3.outlineVariant}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2,
        transition: 'width .25s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
        minWidth: 0,
        pointerEvents: state.leftPanelCollapsed ? 'none' : 'auto',
      }}
    >
      {/* ── Back to the reservation ──
          Only after arriving by tapping an order number, which closes the panel it came from.
          Without this the way back is a fresh hunt through the tee sheet for a tee time the
          operator was reading a second ago. */}
      <ReturnToReservation />
      {/* V1 → V2, 100226: back to the league an Extra came from. */}
      <ReturnToLeague />

      {/* ── Held orders (V1 → V2) ── only while something is held. */}
      {v1v2 && <HeldOrdersBar />}
      {/* ── Orders sent here from another course (Nov 26) ── */}
      {v1v2 && <ArrivedOrdersBar />}

      {/* ── Header ── */}
      <Box sx={{ p: '14px 14px 10px', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.25 }}>
          {/*
            One button, two jobs, never both at once.

            With something in the order it is the back arrow, and it clears — behind a confirm,
            because clearing an order is destructive and there is no undo. Once the order is
            empty there is nothing to clear, so it becomes the hamburger. In Weston's editions
            that opens the navigation — the same thing it does on the collapsed strip. The base
            edition has no navigation, so there it still collapses the rail. A hamburger that means
            "menu" in one state and "collapse" in another is the ambiguity Weston ran into
            ("it can't expand the nav and do the cart"), so it means one thing everywhere.

            Collapsing is the empty state's job instead: see the cart block below.
          */}
          <ButtonBase
            aria-label={hasOrder ? 'Clear order' : weston ? 'Open navigation' : 'Collapse the order rail'}
            onClick={() =>
              hasOrder
                ? dispatch({
                    type: 'openModal',
                    modal: {
                      kind: 'confirm',
                      title: 'Clear this order?',
                      body: `${orderCount} item${orderCount === 1 ? '' : 's'} will be removed. This cannot be undone.`,
                      confirmLabel: 'Clear order',
                      onConfirm: 'clearOrder',
                    },
                  })
                : weston
                  ? dispatch({ type: 'setNavOpen', open: true })
                  // The base edition has no main nav, so its hamburger still collapses the
                  // rail. Round 5 changed this for every edition and left the base prototypes
                  // with no way to put the rail away at all — see 8 · Bug Fixes.
                  : dispatch({ type: 'toggleLeftPanel', collapsed: true })
            }
            title={hasOrder ? 'Clear order' : weston ? 'Menu' : 'Collapse the order rail'}
            sx={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              color: md3.onSurfaceVariant,
              '&:hover': { bgcolor: md3.surfaceHigh },
            }}
          >
            <Icon name={hasOrder ? 'arrow_back' : 'menu'} size={20} />
          </ButtonBase>

          <ButtonBase
            onClick={() =>
              dispatch({ type: 'openModal', modal: { kind: 'golferSearch', target: 'primary' } })
            }
            sx={{
              flex: 1,
              gap: 0.875,
              px: 1.5,
              py: 1,
              justifyContent: 'flex-start',
              bgcolor: chipLoaded ? md3.primaryContainer : md3.surfaceContainer,
              border: `1.5px solid ${chipLoaded ? md3.primary : md3.outlineVariant}`,
              borderRadius: `${radius.xl}px`,
              fontSize: 13,
              fontWeight: 500,
              color: chipLoaded ? md3.onPrimaryContainer : md3.onSurface,
              transition: 'all .13s',
              '&:hover': { bgcolor: md3.primaryContainer, borderColor: md3.primary },
            }}
          >
            <Icon name="person" size={17} />
            {booking ? <BookingMemberDot booking={booking} size={6} /> : null}
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {primaryName ?? (state.flowMode ? 'Group Name' : 'Golfer Name')}
            </Box>
          </ButtonBase>

          <ButtonBase
            onClick={(e) => setCogAnchor(e.currentTarget)}
            title="Order settings"
            sx={{
              width: 38,
              height: 38,
              borderRadius: `${radius.sm}px`,
              border: `1.5px solid ${cogAnchor ? md3.primary : md3.outlineVariant}`,
              color: cogAnchor ? md3.primary : md3.onSurfaceVariant,
              bgcolor: cogAnchor ? md3.primaryContainer : 'transparent',
              '&:hover': { bgcolor: md3.surfaceContainer },
            }}
          >
            <Icon name="settings" size={18} />
          </ButtonBase>

          <Menu
            anchorEl={cogAnchor}
            open={Boolean(cogAnchor)}
            onClose={() => setCogAnchor(null)}
            slotProps={{ paper: { sx: { width: 264 } } }}
          >
            {menuItems.map((item) => (
              <MenuItem
                key={item.action}
                onClick={() => handleSettingsAction(item.action)}
                sx={{
                  gap: 1.375,
                  fontSize: 14,
                  fontWeight: 500,
                  color: item.destructive ? md3.error : md3.onSurface,
                  '&:hover': { bgcolor: item.destructive ? '#fff0ee' : md3.surfaceContainer },
                }}
              >
                <Icon
                  name={item.icon}
                  size={18}
                  color={item.destructive ? md3.error : md3.onSurfaceVariant}
                />
                <Box component="span" sx={{ flex: 1 }}>
                  {item.label}
                </Box>
                {item.chevron && <Icon name="chevron_right" size={16} color={md3.outline} />}
              </MenuItem>
            ))}
          </Menu>
        </Stack>

        {/* ── Guest chips ── */}
        {guests.length > 0 && (
          <Stack direction="row" gap={1} sx={{ pt: 0.75, pb: 0.25, flexWrap: 'wrap' }}>
            {guests.map((p, i) => {
              const playerIdx = i + 1;
              const named = p.name && p.name !== `Guest ${playerIdx + 1}`;
              return (
                <ButtonBase
                  key={playerIdx}
                  onClick={() =>
                    // Weston Edits: a booked player's record opens over everything, from the
                    // name — it belongs to the person, not to this order.
                    weston && booking
                      ? dispatch({
                          type: 'openCustomerModal',
                          customerId: seatRecord(booking, playerIdx)?.id ?? null,
                          bookingId: booking.id,
                          seat: playerIdx,
                          assigning: seatRecord(booking, playerIdx) == null,
                        })
                      : dispatch({
                          type: 'openModal',
                          modal: { kind: 'guestDetail', guestIndex: playerIdx },
                        })
                  }
                  sx={{
                    gap: 0.625,
                    px: 1.25,
                    py: 0.625,
                    bgcolor: named ? md3.primaryContainer : md3.surfaceContainer,
                    border: `1.5px solid ${named ? md3.primary : md3.outlineVariant}`,
                    borderRadius: `${radius.xl}px`,
                    fontSize: 12,
                    fontWeight: 600,
                    color: named ? md3.onPrimaryContainer : md3.onSurfaceVariant,
                  }}
                >
                  {named && <MemberDot name={p.name} size={6} />}
                  {named ? p.name : `Guest ${playerIdx + 1}`}
                </ButtonBase>
              );
            })}
          </Stack>
        )}

        {/* ── Action buttons (pre-order only) ── */}
        {showActions && (
          <Stack gap={0.75} sx={{ mt: 0.75 }}>
            {QUICK_ACTIONS.map((a) => (
              <ButtonBase
                key={a.mode}
                onClick={() => runQuickAction(a.mode)}
                sx={{
                  gap: 1.125,
                  px: 1.375,
                  py: 1.125,
                  justifyContent: 'flex-start',
                  borderRadius: `${radius.md}px`,
                  border: `1.5px solid ${md3.outlineVariant}`,
                  fontSize: 13,
                  fontWeight: 500,
                  color: md3.onSurfaceVariant,
                  '&:hover': {
                    bgcolor: md3.surfaceContainer,
                    color: md3.onSurface,
                    borderColor: md3.outline,
                  },
                }}
              >
                <Icon name={a.icon} size={18} />
                {a.label}
              </ButtonBase>
            ))}
          </Stack>
        )}
      </Box>

      {/* ── Cart ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: '10px 14px', minHeight: 0 }}>
        {state.cart.length === 0 ? (
          weston ? (
            /*
              The empty state is how you collapse the rail (Weston's ask on the fifth call).
              An empty order is the only time the rail is pure cost, so the thing saying it is
              empty is the thing that gets it out of the way — no extra chevron to find, and
              the gesture pairs with tapping the strip to bring it back.
            */
            <ButtonBase
              aria-label="Collapse the order rail"
              data-rail-collapse
              onClick={() => dispatch({ type: 'toggleLeftPanel', collapsed: true })}
              sx={{ width: '100%', height: '100%', borderRadius: `${radius.md}px` }}
            >
              <EmptyState icon="shopping_cart" label="No items added yet" />
            </ButtonBase>
          ) : (
            <EmptyState icon="shopping_cart" label="No items added yet" />
          )
        ) : (
          <>
            {weston && booking ? (
              // Weston Edits: the golf is a read-only summary; edit it on the reservation.
              <RegisterGolfSummary booking={booking} lines={state.cart.filter((i) => i.isCheckIn)} />
            ) : (
              <TeeTimeSummaryCard />
            )}
            {state.cart.map((item, i) =>
              item.isSubItem || (weston && booking && item.isCheckIn) ? null : item.isCheckIn ? (
                <CheckInLines key={`${item.name}-${i}`} item={item} index={i} />
              ) : item.dish ? (
                <RailDishLine key={item.dish.lineId} item={item} />
              ) : item.combo ? (
                <ComboLine key={`${item.name}-${i}`} item={item} index={i} />
              ) : item.giftCard ? (
                <GiftCardLine key={`${item.name}-${i}`} item={item} index={i} />
              ) : item.serviceCharge ? (
                <ServiceChargeLine key={`${item.name}-${i}`} item={item} index={i} amount={totals.serviceCharges?.find((c) => c.id === `${item.serviceCharge!.id}-${i}`)?.amount ?? 0} />
              ) : item.orderDiscount ? (
                <OrderDiscountLine key={`${item.name}-${i}`} item={item} index={i} amount={-(totals.discountLines?.find((d) => d.id === `order-${i}`)?.amount ?? 0)} />
              ) : (
                <StandardLine key={`${item.name}-${i}`} item={item} index={i} />
              ),
            )}
          </>
        )}
      </Box>

      {/* ── Add items ── */}
      <Box sx={{ p: '6px 14px 10px', borderTop: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
        <ButtonBase
          onClick={() => dispatch({ type: 'setView', view: 'pos' })}
          sx={{
            width: '100%',
            gap: 0.875,
            px: 1.5,
            py: 1.125,
            justifyContent: 'flex-start',
            borderRadius: `${radius.md}px`,
            border: `1.5px dashed ${md3.outlineVariant}`,
            fontSize: 13,
            color: md3.onSurfaceVariant,
            '&:hover': {
              borderColor: md3.primary,
              color: md3.primary,
              bgcolor: md3.primaryContainer,
            },
          }}
        >
          <Icon name="add_shopping_cart" size={17} />
          Add items
        </ButtonBase>
      </Box>

      {/* ── Footer: totals + Pay ── */}
      <Box sx={{ p: '10px 14px 14px', borderTop: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
        <Stack direction="row" gap={1} sx={{ mb: 1 }}>
          {[
            { label: 'Check-in', icon: 'how_to_reg', action: 'checkin' as const },
            { label: 'Rain check', icon: 'wb_cloudy', action: 'raincheck' as const },
          ].map((b) => (
            <ButtonBase
              key={b.action}
              onClick={() => dispatch({ type: 'openModal', modal: { kind: 'actionPanel', action: b.action } })}
              sx={{
                flex: 1,
                gap: 0.625,
                py: 1.125,
                borderRadius: `${radius.md}px`,
                border: `1.5px solid ${md3.outlineVariant}`,
                fontSize: 12,
                fontWeight: 500,
                color: md3.onSurfaceVariant,
                '&:hover': { bgcolor: md3.surfaceContainer },
              }}
            >
              <Icon name={b.icon} size={15} />
              {b.label}
            </ButtonBase>
          ))}
          {v1v2 && <HoldButton />}
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1px 12px',
            fontSize: 12,
            color: md3.onSurfaceVariant,
            mb: 1,
          }}
        >
          <span>Discount</span>
          <Box sx={{ textAlign: 'right', fontWeight: 600, color: md3.error }}>
            {totals.discount < 0 ? signedMoney(totals.discount) : '$0.00'}
          </Box>
          <span>Subtotal</span>
          <Box sx={{ textAlign: 'right', fontWeight: 600, color: md3.onSurface }}>
            {cart.money(totals.subtotal)}
          </Box>
          {/* Buck's service charges (V1 → V2, Nov 26): each its own line on the order. */}
          {(totals.serviceCharges ?? []).map((c) => (
            <Box key={c.id} data-rail-service-charge={c.id} sx={{ display: 'contents' }}>
              <span>{c.label}</span>
              <Box sx={{ textAlign: 'right', fontWeight: 600, color: md3.onSurface }}>{cart.money(c.amount)}</Box>
            </Box>
          ))}
          <span>Tax</span>
          <Box sx={{ textAlign: 'right', fontWeight: 600, color: md3.onSurface }}>
            {cart.money(totals.tax)}
          </Box>
          {/* More than one tax type on the order (Buck's per line, Nov 26): each beneath, as the receipt prints them. */}
          {totals.taxes && totals.taxes.length > 1 &&
            totals.taxes.map((t) => (
              <Box key={t.id} data-rail-tax-line={t.id} sx={{ display: 'contents', fontSize: 11 }}>
                <Box component="span" sx={{ pl: 1, fontSize: 11 }}>
                  {t.label}
                </Box>
                <Box sx={{ textAlign: 'right', fontSize: 11 }}>{cart.money(t.amount)}</Box>
              </Box>
            ))}
        </Box>

        {/* What is left to pay: a part already paid by gift card comes off (V1 → V2, Wave 3). */}
        <PayButton payable={amountDue(state)} />
      </Box>
    </Box>
  );
}

// ─── Tee-time summary card ──────────────────────────────────────────────────

/**
 * The green-accented card at the top of the cart summarising the round.
 *
 * Two variants: a loaded tee-sheet booking (opens booking detail) and a pending
 * walk-in or reservation (opens the tee picker to change the slot).
 */
function TeeTimeSummaryCard() {
  const { state, dispatch } = usePos();
  const booking = selectedBooking(state);
  const checkIn = state.cart.find((i) => i.isCheckIn && i.teeTime);

  if (!booking && !checkIn) return null;

  const shellSx = {
    bgcolor: md3.surfaceContainer,
    borderRadius: `${radius.md}px`,
    p: '11px 12px',
    mb: 1.25,
    borderLeft: `3px solid ${md3.primary}`,
    cursor: 'pointer',
  } as const;

  if (booking) {
    // The venue's courses — the three-nines `COURSES` has no 18-hole or single-nine courses,
    // so at those clubs the card used to show a blank course name.
    const course =
      state.courses.find((c) => c.id === booking.course) ?? COURSES.find((c) => c.id === booking.course);
    const time = TIMES.find((t) => t.totalMin === booking.timeMin);
    const holesText = booking.status === 'member' ? booking.holes : roundLabel(booking).replace('Tee Time ', '');
    // Kind of booking. The demo data now marks only true walk-ins `walkin` (an `R-` code is a
    // reservation — `statusForConf`), so a walk-in reads "Walk-in" and a reservation "Reserved".
    const statusLabels: Record<string, string> = {
      member: 'Member',
      walkin: 'Walk-in',
      checkedin: 'Checked In',
      group: 'Group',
      event: 'Event',
      block: 'Blocked',
    };
    return (
      <Box
        sx={shellSx}
        onClick={() =>
          dispatch({ type: 'openModal', modal: { kind: 'bookingDetail', bookingId: booking.id } })
        }
        title="View full booking details"
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <SectionLabel color={md3.primary}>Tee Time · {booking.conf}</SectionLabel>
          <Icon name="open_in_full" size={16} color={md3.primary} />
        </Stack>
        <InfoLine icon="schedule" value={time?.label ?? '?'} note={`· ${course?.name ?? ''}`} />
        <InfoLine icon="group" value={`${booking.players} Players`} />
        <InfoLine
          icon={TRANSPORT_META[booking.cart]?.icon ?? 'directions_walk'}
          value={TRANSPORT_META[booking.cart]?.label ?? 'Walking'}
        />
        <InfoLine
          icon="label"
          value={`${statusLabels[booking.status] ?? 'Reserved'} · ${holesText}`}
          valueColor={md3.primary}
        />
        {booking.note && (
          <Stack
            direction="row"
            gap={0.625}
            sx={{
              alignItems: 'flex-start',
              mt: 0.5,
              p: '6px 8px',
              borderRadius: '6px',
              bgcolor: '#fffbeb',
              border: '1px solid #fde68a',
            }}
          >
            <Icon name="sticky_note_2" size={14} color="#f59e0b" sx={{ mt: '1px' }} />
            <Typography sx={{ fontSize: 12, lineHeight: 1.4, wordBreak: 'break-word' }}>
              {booking.note}
            </Typography>
          </Stack>
        )}
      </Box>
    );
  }

  // Pending walk-in / reservation
  const slot = checkIn!.teeTime!;
  const players = checkIn!.players ?? [];
  const isReserve = state.flowMode === 'reserve';
  const back9 = state.cart.find((c) => c.is18HBack);

  const counts = { cart: 0, push: 0, walking: 0 };
  players.forEach((p) => (counts[p.transport] += 1));
  const parts = [
    counts.cart && `${counts.cart} Riding Cart`,
    counts.push && `${counts.push} Push Cart`,
    counts.walking && `${counts.walking} Walking`,
  ].filter(Boolean);

  return (
    <Box
      sx={shellSx}
      onClick={() => dispatch({ type: 'openModal', modal: { kind: 'teePicker' } })}
      title="Change tee time"
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <SectionLabel color={md3.primary}>
          {isReserve ? 'Reservation' : 'Walk-in'} · Pending
        </SectionLabel>
        <Icon name="edit" size={16} color={md3.primary} />
      </Stack>
      {checkIn!.is18HFront ? (
        <>
          <InfoLine icon="schedule" prefix="FRONT 9" value={slot.label} note={`· ${slot.courseName}`} />
          {back9?.teeTime && (
            <InfoLine
              icon="schedule"
              prefix="BACK 9"
              prefixColor={md3.onSurfaceVariant}
              value={back9.teeTime.label}
              note={`· ${back9.teeTime.courseName}`}
            />
          )}
        </>
      ) : (
        <InfoLine icon="schedule" value={slot.label} note={`· ${slot.courseName}`} />
      )}
      <InfoLine icon="group" value={`${players.length} Player${players.length > 1 ? 's' : ''}`} />
      <InfoLine
        icon={counts.cart ? 'directions_car' : counts.push ? 'electric_scooter' : 'directions_walk'}
        value={parts.join(' · ') || 'Walking'}
      />
      <InfoLine
        icon={isReserve ? 'event_available' : 'directions_walk'}
        value={isReserve ? 'Reserved' : 'Walk-in'}
        valueColor={isReserve ? '#d97706' : md3.primary}
      />
    </Box>
  );
}

function InfoLine({
  icon,
  value,
  note,
  prefix,
  prefixColor = md3.primary,
  valueColor = md3.onSurface,
}: {
  icon: string;
  value: string;
  note?: string;
  prefix?: string;
  prefixColor?: string;
  valueColor?: string;
}) {
  return (
    <Stack direction="row" alignItems="center" gap={0.75} sx={{ fontSize: 12, mb: '3px' }}>
      <Icon name={icon} size={14} color={md3.onSurfaceVariant} />
      {prefix && (
        <Box component="span" sx={{ fontSize: 10, fontWeight: 800, color: prefixColor }}>
          {prefix}
        </Box>
      )}
      <Box component="span" sx={{ fontWeight: 600, color: valueColor }}>
        {value}
      </Box>
      {note && (
        <Box component="span" sx={{ color: md3.onSurfaceVariant, fontWeight: 400 }}>
          {note}
        </Box>
      )}
    </Stack>
  );
}

// ─── Cart lines ─────────────────────────────────────────────────────────────

/**
 * A check-in line renders as one block *per player*, stacked into a single
 * rounded group. Each block shows the rate, that player's name and total, then a
 * sub-line per charge (transport, then each modifier as a delta) — so an operator
 * can see exactly why one player in a foursome costs more than another.
 */
function CheckInLines({ item, index }: { item: CartItem; index: number }) {
  const { state, dispatch } = usePos();
  // Weston Edits: golf is adjusted on the reservation, never with modifiers at the register.
  const weston = useWestonEdits();
  const booking = selectedBooking(state);
  const unitPrice = item.unitPrice ?? item.price;
  const players = item.players ?? [];

  return (
    <>
      {players.map((p, pi) => {
        const b = cart.playerBreakdown(unitPrice, p);
        const seatPrice = p.fee ?? unitPrice;
        const settled = p.paid || p.noShow;
        const transportTag = (p.modifierTags ?? []).find((t) => t.isTransport);
        const otherTags = (p.modifierTags ?? []).filter((t) => !t.isTransport);
        const rowLabel = `Guest ${pi + 1}`;
        const displayName =
          p.name && !['Group Name', 'Player 1', rowLabel].includes(p.name) ? p.name : rowLabel;

        const isFirst = pi === 0;
        const isLast = pi === players.length - 1;
        const r = `${radius.md}px`;

        return (
          <Box
            key={pi}
            sx={{
              bgcolor: md3.surfaceContainer,
              p: '11px 14px',
              borderTop: isFirst ? 'none' : `1px solid ${md3.outlineVariant}`,
              borderRadius:
                isFirst && isLast ? r : isFirst ? `${r} ${r} 0 0` : isLast ? `0 0 ${r} ${r}` : 0,
              mb: isLast ? 0.75 : 0,
            }}
          >
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.75 }}>
              <SectionLabel sx={{ flex: 1, fontSize: 11, letterSpacing: '.4px' }}>
                {item.name}
              </SectionLabel>
              <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
                {cart.money(seatPrice)}/ea
              </Typography>
              {isFirst ? (
                <ButtonBase
                  onClick={() => dispatch({ type: 'removeItem', index })}
                  sx={{ color: md3.outline, p: '1px', '&:hover': { color: md3.error } }}
                  title="Remove round"
                >
                  <Icon name="close" size={15} />
                </ButtonBase>
              ) : (
                <Box sx={{ width: 20 }} />
              )}
            </Stack>

            <Stack
              direction="row"
              alignItems="baseline"
              justifyContent="space-between"
              sx={{ mb: 0.625 }}
            >
              <Stack direction="row" alignItems="center" gap={0.5}>
                {pi === 0 ? (
                  <BookingMemberDot booking={booking} />
                ) : (
                  <MemberDot name={displayName} />
                )}
                <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{displayName}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: settled ? md3.primary : md3.onSurface }}>
                {p.noShow ? 'No-show' : p.paid ? 'Paid' : cart.money(b.total)}
              </Typography>
            </Stack>

            <SubLine
              label={transportTag ? transportTag.name : 'Walking'}
              amount={b.transport}
            />
            {otherTags.map((t) => {
              const delta = t.isDiscount ? t.p : t.p - seatPrice;
              return (
                <SubLine
                  key={t.name}
                  label={`${t.tag}${t.isDiscount ? ' Discount' : ' Rate'}`}
                  amount={delta}
                  onRemove={() =>
                    dispatch({
                      type: 'togglePlayerModifier',
                      itemIndex: index,
                      playerIndex: pi,
                      modName: t.name,
                    })
                  }
                />
              );
            })}

            {booking?.playerNotes?.[pi] && (
              <Stack
                direction="row"
                gap={0.625}
                sx={{
                  alignItems: 'flex-start',
                  mt: 0.625,
                  p: '5px 8px',
                  bgcolor: '#fff8e1',
                  border: '1px solid #ffe082',
                  borderRadius: '5px',
                }}
              >
                <Icon name="sticky_note_2" size={13} color="#f59e0b" sx={{ mt: '1px' }} />
                <Typography sx={{ fontSize: 11, color: '#7a5b00', lineHeight: 1.35 }}>
                  {booking.playerNotes[pi]}
                </Typography>
              </Stack>
            )}

            {!settled && !weston && (
            <Stack direction="row" gap={0.75} sx={{ mt: 0.75 }}>
              <MicroButton
                dashed
                onClick={() =>
                  dispatch({
                    type: 'openModal',
                    modal: { kind: 'playerModifier', itemIdx: index, playerIdx: pi },
                  })
                }
              >
                + modifier
              </MicroButton>
              <MicroButton
                onClick={() =>
                  dispatch({ type: 'openModal', modal: { kind: 'guestDetail', guestIndex: pi } })
                }
              >
                Guest Details
              </MicroButton>
            </Stack>
            )}
          </Box>
        );
      })}
      {/* V1 → V2 (Nov 26): a Buck discount on the round rung at the counter — League Pass, Memberships, Senior. */}
      {state.buckCheckout && !booking && !state.splitTender && lineDiscountOffers(item, true).length > 0 && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mt: -0.5, mb: 0.75, px: 0.5 }}>
          {item.lineDiscount ? (
            <Typography data-line-discount={index} sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, flex: 1 }}>
              {item.lineDiscount.label}{' '}
              <Box component="span" sx={{ color: md3.error, fontWeight: 700 }}>
                {cart.creditMoney(lineDiscountAmount(item, cart.payableTotal([item])))}
              </Box>
            </Typography>
          ) : (
            <Box sx={{ flex: 1 }} />
          )}
          <Box data-line-discount-button={index}>
            <MicroButton dashed onClick={() => dispatch({ type: 'openModal', modal: { kind: 'lineDiscount', index } })}>
              {item.lineDiscount ? 'Edit discount' : 'Discount round'}
            </MicroButton>
          </Box>
        </Stack>
      )}
    </>
  );
}

function SubLine({
  label,
  amount,
  onRemove,
}: {
  label: string;
  amount: number;
  onRemove?: () => void;
}) {
  const isDiscount = amount < 0;
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: '1px' }}>
      <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>{label}</Typography>
      <Stack direction="row" alignItems="center" gap={0.5}>
        <Typography sx={{ fontSize: 12, color: isDiscount ? md3.error : md3.onSurfaceVariant }}>
          {deltaMoney(amount)}
        </Typography>
        {onRemove && (
          <ButtonBase
            onClick={onRemove}
            sx={{ color: md3.outline, fontSize: 11, lineHeight: 1, p: 0 }}
            title="Remove modifier"
          >
            ×
          </ButtonBase>
        )}
      </Stack>
    </Stack>
  );
}

function MicroButton({
  children,
  dashed,
  onClick,
}: {
  children: React.ReactNode;
  dashed?: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        px: 1.125,
        py: 0.25,
        borderRadius: '3px',
        border: `1.5px ${dashed ? 'dashed' : 'solid'} ${md3.outlineVariant}`,
        fontSize: 9,
        fontWeight: 700,
        color: dashed ? md3.outline : md3.onSurfaceVariant,
        transition: 'all .12s',
        '&:hover': {
          borderColor: md3.primary,
          color: md3.primary,
          bgcolor: dashed ? 'transparent' : md3.primaryContainer,
        },
      }}
    >
      {children}
    </ButtonBase>
  );
}

/** Merchandise line: name, quantity stepper, line total, remove. */
function StandardLine({ item, index }: { item: CartItem; index: number }) {
  const { state, dispatch } = usePos();
  const total = item.price * item.qty;
  // V1 → V2 (Nov 26): Buck's discount types and the price override, from the line.
  const discountable = state.buckCheckout && !state.splitTender && (lineDiscountOffers(item, true).length > 0 || Boolean(productSettings(item.name)?.priceOverride));
  const off = item.lineDiscount ? lineDiscountAmount(item, total) : 0;

  return (
    <Stack
      direction="row"
      gap={1}
      sx={{
        alignItems: 'flex-start',
        p: '9px 10px',
        borderRadius: `${radius.md}px`,
        bgcolor: md3.surfaceContainer,
        mb: 0.75,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{item.name}</Typography>
        {item.lesson && (
          <Typography data-lesson-instructor={item.lesson.instructorId} sx={{ fontSize: 11, color: md3.onSurfaceVariant, mt: 0.25 }}>
            With {item.lesson.instructor}
          </Typography>
        )}
        {item.priceOverride && (
          <Typography data-price-was sx={{ fontSize: 11, color: md3.onSurfaceVariant, mt: 0.25 }}>
            {cart.money(item.price)} each · was {cart.money(item.priceOverride.from)}
          </Typography>
        )}
        {item.lineDiscount && off > 0 && (
          <Stack data-line-discount={index} direction="row" justifyContent="space-between" sx={{ mt: 0.25 }}>
            <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
              {item.lineDiscount.label}
              {item.lineDiscount.approvedBy ? ' · approved' : ''}
            </Typography>
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: md3.error }}>{cart.creditMoney(off)}</Typography>
          </Stack>
        )}
        <Stack direction="row" alignItems="center" gap={0.375} sx={{ mt: 0.625 }}>
          {[-1, 1].map((d) => (
            <ButtonBase
              key={d}
              onClick={() => dispatch({ type: 'changeQty', index, delta: d })}
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: `1px solid ${md3.outlineVariant}`,
                bgcolor: '#fff',
                fontSize: 14,
                lineHeight: 1,
                order: d === -1 ? 0 : 2,
                '&:hover': { bgcolor: md3.primaryContainer },
              }}
            >
              {d === -1 ? '−' : '+'}
            </ButtonBase>
          ))}
          <Box
            sx={{ order: 1, fontSize: 12, fontWeight: 700, width: 18, textAlign: 'center' }}
          >
            {item.qty}
          </Box>
          {discountable && (
            <Box sx={{ order: 3, ml: 1 }} data-line-discount-button={index}>
              <MicroButton dashed onClick={() => dispatch({ type: 'openModal', modal: { kind: 'lineDiscount', index } })}>
                {item.lineDiscount || item.priceOverride ? 'Edit discount' : 'Discount'}
              </MicroButton>
            </Box>
          )}
        </Stack>
      </Box>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 700,
          minWidth: 52,
          textAlign: 'right',
          color: total < 0 ? md3.error : md3.primary,
        }}
      >
        {signedMoney(total)}
      </Typography>
      <ButtonBase
        onClick={() => dispatch({ type: 'removeItem', index })}
        sx={{ color: md3.outline, p: '1px', '&:hover': { color: md3.error } }}
      >
        <Icon name="close" size={16} />
      </ButtonBase>
    </Stack>
  );
}

/** A service charge added by hand (Nov 26), as its own line: its name, what it comes to, remove. */
function ServiceChargeLine({ item, index, amount }: { item: CartItem; index: number; amount: number }) {
  const { state, dispatch } = usePos();
  const c = item.serviceCharge!;
  return (
    <Stack data-service-charge-line={c.id} direction="row" gap={1} sx={{ alignItems: 'center', p: '9px 10px', borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer, mb: 0.75 }}>
      <Icon name="add_circle" size={16} color={md3.onSurfaceVariant} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{c.percent != null ? `${c.label} ${c.percent}%` : c.label}</Typography>
        <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>{c.appliesTo === 'fnb' ? 'On the food and drink' : 'On the order'} · {state.clubPricing.taxServiceCharges ? 'taxed' : 'untaxed'}</Typography>
      </Box>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: md3.primary }}>{cart.money(amount)}</Typography>
      {!state.splitTender && (
        <ButtonBase aria-label={`Remove ${c.label}`} onClick={() => dispatch({ type: 'removeItem', index })} sx={{ color: md3.outline, p: '1px', '&:hover': { color: md3.error } }}>
          <Icon name="close" size={16} />
        </ButtonBase>
      )}
    </Stack>
  );
}

/** Orders another course sent this register (Nov 26, Transfer to course): open one to ring it up here. */
function ArrivedOrdersBar() {
  const { state, dispatch } = usePos();
  const arrived = state.transferredOrders.filter((t) => t.toVenue === state.venueId && !t.receivedAt);
  if (!arrived.length) return null;
  const busy = state.cart.length > 0 && !state.lastPayment;
  return (
    <Box data-arrived-orders sx={{ p: '8px 14px', bgcolor: md3.primaryContainer, borderBottom: `1px solid ${md3.outlineVariant}` }}>
      <SectionLabel color={md3.onPrimaryContainer}>Arrived from another course</SectionLabel>
      {arrived.map((t) => (
        <Stack key={t.id} direction="row" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
          <Typography sx={{ fontSize: 12, flex: 1, color: md3.onPrimaryContainer }}>
            {VENUES[t.fromVenue].name} · {t.customer ?? `${t.cart.length} lines`} · {cart.money(t.total)}
          </Typography>
          <Button size="small" disabled={busy} data-receive-transfer={t.id} onClick={() => dispatch({ type: 'receiveTransfer', id: t.id })}>
            Open
          </Button>
        </Stack>
      ))}
    </Box>
  );
}

/**
 * An order discount (Nov 26) — a Buck type or a promo code — as its own line, by name, negative.
 * What it comes to is worked out from the lines it applies to (`discountedNets`).
 */
function OrderDiscountLine({ item, index, amount }: { item: CartItem; index: number; amount: number }) {
  const { state, dispatch } = usePos();
  const d = item.orderDiscount!;
  return (
    <Stack
      data-order-discount={d.code ?? d.typeId}
      direction="row"
      gap={1}
      sx={{ alignItems: 'center', p: '9px 10px', borderRadius: `${radius.md}px`, bgcolor: '#fff1f0', mb: 0.75 }}
    >
      <Icon name="sell" size={16} color={md3.error} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{d.label}</Typography>
        {d.approvedBy && <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>Approved by a manager</Typography>}
      </Box>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: md3.error }}>{cart.creditMoney(amount)}</Typography>
      {!state.splitTender && (
        <ButtonBase aria-label={`Remove ${d.label}`} onClick={() => dispatch({ type: 'removeItem', index })} sx={{ color: md3.outline, p: '1px', '&:hover': { color: md3.error } }}>
          <Icon name="close" size={16} />
        </ButtonBase>
      )}
    </Stack>
  );
}

// ─── Pay button ─────────────────────────────────────────────────────────────

/**
 * The footer CTA. Its label depends on where the order is:
 *
 *  - nothing on the order → disabled
 *  - a round with no tee time yet → "Select tee time" (opens the picker)
 *  - a reservation → "Reserve" (confirms without taking payment now)
 *  - anything else → "Pay $x.xx"
 *  - after a successful checkout → a static paid receipt state
 */
function PayButton({ payable }: { payable: number }) {
  const { state, dispatch, toast } = usePos();
  const checkIn = cart.findCheckInItem(state.cart);
  const needsTeeTime = Boolean(checkIn) && !checkIn?.teeTime && !state.selectedBookingId;
  const isReserve = state.flowMode === 'reserve';

  if (state.lastPayment) {
    return (
      <Box>
        <Box
          sx={{
            width: '100%',
            p: '14px',
            borderRadius: '14px',
            bgcolor: '#f0fdf4',
            color: '#16a34a',
            border: '1.5px solid #86efac',
            fontSize: 14,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          Paid · {cart.money(state.lastPayment.amount)}
        </Box>
        <Box
          sx={{
            mt: 1,
            p: '8px 10px',
            bgcolor: md3.surfaceContainer,
            borderRadius: `${radius.md}px`,
            fontSize: 11,
            color: md3.onSurfaceVariant,
          }}
        >
          <Stack direction="row" justifyContent="space-between">
            <span>Method</span>
            <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>
              {state.lastPayment.method}
            </span>
          </Stack>
          <Divider sx={{ my: 0.5 }} />
          <Stack direction="row" justifyContent="space-between" sx={{ fontWeight: 700, color: md3.onSurface }}>
            <span>Total</span>
            <span>{cart.money(state.lastPayment.amount)}</span>
          </Stack>
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.5, color: md3.outline }}>
            <Icon name="schedule" size={11} />
            {state.lastPayment.time}
          </Stack>
        </Box>
        <Button
          fullWidth
          variant="text"
          onClick={() => dispatch({ type: 'clearOrder' })}
          sx={{ mt: 1 }}
        >
          New order
        </Button>
      </Box>
    );
  }

  // A booking whose players have all paid (or no-showed) has nothing to take: say so rather
  // than offering "Pay $0.00" — or, as before, charging it again at the status rate.
  if (cart.cartIsSettled(state.cart)) {
    return (
      <Box
        data-pay-state="settled"
        sx={{
          width: '100%',
          p: '14px',
          borderRadius: '14px',
          bgcolor: payBadges.paid.bg,
          color: payBadges.paid.text,
          fontSize: 14,
          fontWeight: 700,
          textAlign: 'center',
        }}
      >
        {checkIn?.players?.every((p) => p.noShow) ? 'No-show · nothing due' : 'Paid in full · nothing due'}
      </Box>
    );
  }

  const disabled = state.cart.length === 0;
  const label = needsTeeTime
    ? 'Select tee time'
    : isReserve
      ? `Reserve · ${cart.money(payable)}`
      : `Pay ${cart.money(payable)}`;

  const onClick = () => {
    if (needsTeeTime) return dispatch({ type: 'openModal', modal: { kind: 'teePicker' } });
    if (isReserve)
      return dispatch({ type: 'openModal', modal: { kind: 'reserveConfirm', payMode: 'later' } });
    if (payable <= 0) return toast('Nothing to charge');
    return dispatch({ type: 'openModal', modal: { kind: 'checkout' } });
  };

  return (
    <ButtonBase
      disabled={disabled}
      onClick={onClick}
      sx={{
        width: '100%',
        p: '14px',
        borderRadius: '14px',
        bgcolor: md3.onSurface,
        color: '#fff',
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: '.2px',
        boxShadow: elevation.e2,
        transition: 'all .13s',
        '&:hover': { bgcolor: '#2d3330', boxShadow: elevation.e3 },
        '&.Mui-disabled': {
          bgcolor: md3.surfaceHighest,
          color: md3.onSurfaceVariant,
          boxShadow: 'none',
          opacity: 0.55,
        },
      }}
    >
      {label}
    </ButtonBase>
  );
}

/** Re-exported so the tee sheet can show the dominant-transport summary too. */
export { dominantTransport };

/**
 * The order rail, collapsed.
 *
 * A 56px strip rather than nothing at all, so the tee sheet gets its width back without the
 * order disappearing entirely.
 *
 * ## The hamburger changed jobs
 *
 * It used to expand this rail. Weston, fifth call: *"I actually don't hate this to be the main
 * nav. But it can't expand the nav and do the cart."* One control cannot own both, so the
 * hamburger now opens the navigation and the rail is expanded by **tapping the strip itself** —
 * the empty space between the hamburger and the cart. A large, obvious target that cannot be
 * confused with going somewhere else.
 *
 * Walk-in and Reserve came off the strip in the same pass ("I wouldn't have these 2 options
 * there"). They live in the expanded rail, which is one tap away.
 *
 * Adding anything to the order re-expands automatically: an order you cannot see is one nobody
 * checks before charging it.
 */
function RailStrip() {
  const { state, dispatch } = usePos();
  // Same count the clear-confirm uses. Tax is a line on the order but not a thing anyone
  // added, and the strip badging 4 while the confirm offers to remove 3 is the kind of
  // disagreement that makes someone stop trusting both numbers.
  const count = orderItemCount(state.cart);
  const expand = () => dispatch({ type: 'toggleLeftPanel', collapsed: false });

  return (
    <Box
      data-order-rail="collapsed"
      sx={{
        width: 56,
        flexShrink: 0,
        bgcolor: '#fff',
        borderRight: `1px solid ${md3.outlineVariant}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        pt: 1.25,
        zIndex: 2,
        transition: 'width .25s cubic-bezier(.4,0,.2,1)',
      }}
    >
      <Tooltip title="Menu" placement="right">
        <ButtonBase
          aria-label="Open navigation"
          onClick={() => dispatch({ type: 'setNavOpen', open: true })}
          sx={{ width: 34, height: 34, borderRadius: `${radius.sm}px`, color: md3.onSurfaceVariant }}
        >
          <Icon name="menu" size={18} />
        </ButtonBase>
      </Tooltip>

      {/* The strip's own body is the expand control — see the note above. It fills the space
          the quick actions used to occupy, so the target is most of the rail's height. */}
      <ButtonBase
        aria-label="Expand the order rail"
        data-rail-expand
        onClick={expand}
        sx={{ flex: 1, width: '100%', borderRadius: 0 }}
      />

      <Tooltip title={count ? `${count} in the order` : 'Order is empty'} placement="right">
        <ButtonBase
          aria-label={count ? `Order · ${count} items` : 'Order is empty'}
          onClick={expand}
          sx={{
            width: 34,
            height: 34,
            mb: 1.5,
            borderRadius: `${radius.sm}px`,
            color: count ? md3.primary : md3.outline,
            position: 'relative',
          }}
        >
          <Icon name="shopping_cart" size={18} />
          {count > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: 1,
                right: 1,
                minWidth: 15,
                height: 15,
                px: '3px',
                borderRadius: 999,
                bgcolor: md3.primary,
                color: md3.onPrimary,
                fontSize: 9,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {count}
            </Box>
          )}
        </ButtonBase>
      </Tooltip>
    </Box>
  );
}

/**
 * The rail's quick actions — one definition, used expanded and collapsed.
 *
 * They were written twice, which is how the collapsed Walk-in ended up opening the old walk-in
 * dialog while the expanded one booked the next open tee time as a reservation, and how the
 * collapsed Reserve ended up on an icon name that does not exist (rendering as a dot, because
 * `iconFor` falls back to a bullet rather than failing). Label, glyph and behaviour now come
 * from one place, so the two states cannot drift again.
 */
const QUICK_ACTIONS = [
  { label: 'Walk-in', icon: 'directions_walk', mode: 'walkin' as const },
  { label: 'Reserve tee time', icon: 'event_available', mode: 'reserve' as const },
];

function useQuickAction() {
  const { dispatch } = usePos();
  const walkIn = useStartWalkIn();
  return (mode: 'walkin' | 'reserve') => {
    // Weston Edits: a walk-in is a reservation first — at the next open tee time, opened in the
    // panel — and reaches the order through Check in & pay.
    if (walkIn.routes && mode === 'walkin') return void walkIn.start();
    dispatch({ type: 'setFlowMode', mode });
    dispatch({ type: 'setCategory', category: 'CHECK IN' });
  };
}

/**
 * How many things are on the order, as a person would count them.
 *
 * Tax is a line but not a thing anyone added, so it is excluded — clearing a threesome's golf
 * offers to remove three items, not four, and the collapsed rail badges the same number.
 */
function orderItemCount(cart: CartItem[]): number {
  return cart.filter((i) => !i.isTax && i.name !== 'Taxes').reduce((n, i) => n + (i.qty ?? 1), 0);
}

/**
 * A way back to the reservation whose order number was tapped.
 *
 * Tapping the number is the route Weston asked for — *"a way for them to easily go to that
 * order and refund"* — but it is one-way: `loadBooking` closes the panel, switches to the
 * register and leaves no trail. This is the trail. It appears only on that route, so an order
 * reached any other way does not grow a back button pointing at a reservation nobody opened.
 *
 * Going back returns to the tee sheet with the reservation open, and clears the flag so it does
 * not linger over the next order.
 */
function ReturnToReservation() {
  const { state, dispatch } = usePos();
  const id = state.returnToBooking;
  const booking = id ? state.bookings.find((b) => b.id === id) : null;
  if (!booking) return null;

  return (
    <ButtonBase
      data-return-to-reservation
      aria-label={`Back to the reservation for ${booking.name}`}
      onClick={() => {
        dispatch({ type: 'clearReturnToBooking' });
        // `openReservation` alone would float the panel over the register. The trip started on
        // the tee sheet, so it ends there.
        dispatch({ type: 'setView', view: 'tee' });
        dispatch({ type: 'openReservation', bookingId: booking.id });
      }}
      sx={{
        width: '100%',
        gap: 0.75,
        px: 1.75,
        py: 1.125,
        justifyContent: 'flex-start',
        flexShrink: 0,
        bgcolor: md3.primaryContainer,
        color: md3.onPrimaryContainer,
        fontSize: 12.5,
        fontWeight: 700,
        borderBottom: `1px solid ${md3.outlineVariant}`,
      }}
    >
      <Icon name="arrow_back" size={16} />
      Back to {booking.name}
    </ButtonBase>
  );
}
