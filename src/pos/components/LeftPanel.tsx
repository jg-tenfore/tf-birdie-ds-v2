import { useState } from 'react';
import { Box, Button, ButtonBase, Divider, Menu, MenuItem, Typography } from '@mui/material';
import { elevation, grid, md3, radius } from '../../theme/tokens';
import { SETTINGS_MENU_ITEMS, TRANSPORT_META } from '../data/config';
import { COURSES, TIMES } from '../data/courses';
import * as cart from '../logic/cart';
import { dominantTransport, selectedBooking } from '../state/pos-store';
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
  const totals = cart.cartTotals(state.cart);
  const payable = cart.payableTotal(state.cart);

  const [cogAnchor, setCogAnchor] = useState<HTMLElement | null>(null);

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
        return toast('Promo code — enter at checkout');
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
      default:
        return toast(`${action} — coming soon`);
    }
  };

  return (
    <Box
      sx={{
        width: state.leftPanelCollapsed ? 0 : grid.leftPanelW,
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
      {/* ── Header ── */}
      <Box sx={{ p: '14px 14px 10px', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.25 }}>
          <ButtonBase
            onClick={() => dispatch({ type: 'clearOrder' })}
            title="Clear order"
            sx={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              color: md3.onSurfaceVariant,
              '&:hover': { bgcolor: md3.surfaceHigh },
            }}
          >
            <Icon name="arrow_back" size={20} />
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
            {SETTINGS_MENU_ITEMS.map((item) => (
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
                    dispatch({
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
            {[
              { label: 'Walk-in', icon: 'directions_walk', mode: 'walkin' as const },
              { label: 'Reserve tee time', icon: 'event_available', mode: 'reserve' as const },
            ].map((a) => (
              <ButtonBase
                key={a.mode}
                onClick={() => {
                  dispatch({ type: 'setFlowMode', mode: a.mode });
                  dispatch({ type: 'setCategory', category: 'CHECK IN' });
                }}
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
          <EmptyState icon="shopping_cart" label="No items added yet" />
        ) : (
          <>
            <TeeTimeSummaryCard />
            {state.cart.map((item, i) =>
              item.isSubItem ? null : item.isCheckIn ? (
                <CheckInLines key={`${item.name}-${i}`} item={item} index={i} />
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
          <span>Tax</span>
          <Box sx={{ textAlign: 'right', fontWeight: 600, color: md3.onSurface }}>
            {cart.money(totals.tax)}
          </Box>
        </Box>

        <PayButton payable={payable} />
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
    const course = COURSES.find((c) => c.id === booking.course);
    const time = TIMES.find((t) => t.totalMin === booking.timeMin);
    const statusLabels: Record<string, string> = {
      booked: 'Reserved',
      walkin: 'Walk-in',
      member: 'Member',
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
          value={statusLabels[booking.status] ?? booking.status}
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
  const booking = selectedBooking(state);
  const unitPrice = item.unitPrice ?? item.price;
  const players = item.players ?? [];

  return (
    <>
      {players.map((p, pi) => {
        const b = cart.playerBreakdown(unitPrice, p);
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
                {cart.money(unitPrice)}/ea
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
              <Typography sx={{ fontSize: 14, fontWeight: 800 }}>
                {cart.money(b.total)}
              </Typography>
            </Stack>

            <SubLine
              label={transportTag ? transportTag.name : 'Walking'}
              amount={b.transport}
            />
            {otherTags.map((t) => {
              const delta = t.isDiscount ? t.p : t.p - unitPrice;
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
          </Box>
        );
      })}
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
  const { dispatch } = usePos();
  const total = item.price * item.qty;

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
