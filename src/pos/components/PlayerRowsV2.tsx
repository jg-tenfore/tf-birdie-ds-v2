import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, noteColors, playerAccents, radius, reservationPanel } from '../../theme/tokens';
import { ROUND_STEP } from '../data/config';
import { money } from '../logic/cart';
import {
  bookingHoles,
  holesFee,
  isEditableSeat,
  maxPlayers,
  playerFee,
  playerHoles,
  playerIsAdjusted,
  playerName,
  playerTransport,
  removePlayer,
  resetPlayerFee,
  resizeParty,
  setGroupTransport,
  setPlayerFee,
  setPlayerHoles,
  setPlayerTransport,
} from '../logic/reservation';
import { seatIdMe } from '../logic/seat-customer';
import { seatCanSwitchHoles, seatPrice, seatRecord } from '../logic/seat-pricing';
import { dayBookings, rateContext } from '../state/pos-store';
import { orderSeatsOf } from '../state/order-seats';
import { useGolferRoster, usePos } from '../state/PosProvider';
import type { Booking, Transport } from '../types';
import { IdMeBadge } from './IdMeBadge';
import { CountStepper, FeeField, PaidPill, initials } from './PlayerRows';
import { RateExpand } from './RateExpand';
import { MembershipChips, RoundStatusChip } from './SeatChips';
import { Seg, TOUCH, TouchButton } from './Touch';
import { Icon, SectionLabel } from './primitives';
import { Stack } from './Stack';

/**
 * The reservation's players, V1 → V2 (100226 · Player rows v2, approved Oct 3).
 *
 * Weston, on the compact rows of 100126: *"this solves the problem, but I feel like we're losing a
 * lot of data."* The counter conversation is *"Walking or riding? 9 or 18? You're paying for
 * yourself? Yes."* — then **Add, Add, Pay**. *"This is going to be the most used thing in all of our
 * apps… it just has to be fast."*
 *
 * So every player is open, on two lines, with nothing to expand first:
 *
 * - **Who** — the full name (never cut), membership and customer type, where they are in the round,
 *   paid or not.
 * - **The sale** — 9 / 18, Walk / Ride / Push, the rate and the transport with what each costs, the
 *   seat's total, **Add** and **⋯**.
 *
 * **Add** puts that player straight onto the register's order: the rail opens on the left, beside
 * the panel, and the row reads *On order ✓*. **⋯** is only for changing something — Change golfer,
 * the rate, the tee fee, a cart key, No-show, Take off the order, Remove. Everything is touch-sized.
 */
export function PlayerRowsV2({ booking: b }: { booking: Booking }) {
  const { state, dispatch, toast } = usePos();
  const course = state.courses.find((c) => c.id === b.course);
  const cap = maxPlayers(b, course, dayBookings(state));
  const patch = (p: Partial<Booking>) => dispatch({ type: 'patchBooking', bookingId: b.id, patch: p });
  // ⋯ is open on one row at a time. It reuses the panel's `expandedSeat`, so a QA link that opens a
  // seat's rate editor (`rate=`) lands on that row's ⋯ with the rates showing.
  const openSeat = state.reservationPanel?.expandedSeat ?? null;
  const setOpenSeat = (seat: number | null) => dispatch({ type: 'expandSeat', seat });

  const setCount = (n: number) => {
    if (n < 1) return;
    if (n > cap) return toast(`Only ${cap} can play here — the next slot is taken`);
    const p = resizeParty(b, n, course, dayBookings(state));
    if (!Object.keys(p).length) return toast('No room beside this tee time');
    patch(p);
  };

  const checkedIn = b.playerStates.filter((p) => p.step >= 0 && !p.noShow).length;
  const onOrder = orderSeatsOf(state.selectedBookingId, state.orderSeats, b);
  const toAdd = b.playerStates.map((p, i) => ({ p, i })).filter(({ p, i }) => isEditableSeat(p) && !onOrder.includes(i));
  const groupNote = (b.groupNote ?? b.note ?? '').trim();

  return (
    <Box data-player-rows-v2>
      {groupNote && (
        <ButtonBase
          data-group-note
          aria-label="Group note"
          onClick={() => dispatch({ type: 'setReservationTab', tab: 'notes' })}
          sx={{
            width: '100%',
            mb: 1.25,
            p: '9px 12px',
            gap: 1,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            textAlign: 'left',
            borderRadius: `${radius.md}px`,
            bgcolor: noteColors.yellow.bg,
            color: noteColors.yellow.text,
            border: `1px solid ${noteColors.yellow.text}22`,
          }}
        >
          <Icon name="sticky_note_2" size={17} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.04em', opacity: 0.8 }}>GROUP NOTE</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 }}>{groupNote}</Typography>
          </Box>
        </ButtonBase>
      )}

      {/* ── The party, and what to do to all of it ── */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
        <SectionLabel color={md3.outline} sx={{ flex: 1 }}>
          Players · {checkedIn}/{b.players} checked in
        </SectionLabel>
        <CountStepper value={b.players} max={cap} onChange={setCount} />
      </Stack>
      <Stack direction="row" gap={1} sx={{ mb: 1.25, flexWrap: 'wrap' }}>
        <TouchButton icon="directions_car" onClick={() => patch(setGroupTransport(b, 'cart'))}>
          Everyone rides
        </TouchButton>
        <TouchButton icon="directions_walk" onClick={() => patch(setGroupTransport(b, 'walking'))}>
          Everyone walks
        </TouchButton>
        <Box sx={{ flex: 1 }} />
        <TouchButton
          icon="add_shopping_cart"
          disabled={toAdd.length === 0}
          onClick={() => toAdd.forEach(({ i }) => dispatch({ type: 'addSeatToOrder', bookingId: b.id, seat: i }))}
        >
          Add all
        </TouchButton>
      </Stack>

      {b.playerStates.map((_, i) => (
        <PlayerRowV2 key={i} booking={b} index={i} onOrder={onOrder.includes(i)} open={openSeat === i} onToggle={() => setOpenSeat(openSeat === i ? null : i)} />
      ))}

      {b.players < cap && (
        <ButtonBase
          onClick={() => setCount(b.players + 1)}
          sx={{
            width: '100%',
            minHeight: TOUCH,
            gap: 0.75,
            borderRadius: `${radius.md}px`,
            border: `1.5px dashed ${md3.outlineVariant}`,
            fontSize: 13,
            fontWeight: 700,
            color: md3.onSurfaceVariant,
            '&:hover': { borderColor: md3.primary, color: md3.primary, bgcolor: md3.primaryContainer },
          }}
        >
          <Icon name="person_add" size={17} />
          Add player · {cap - b.players} open beside this tee time
        </ButtonBase>
      )}
    </Box>
  );
}

function RateLine({ name, amount, note }: { name: string; amount: number; note?: string | null }) {
  return (
    <Stack direction="row" alignItems="baseline" gap={0.5} sx={{ minWidth: 0 }}>
      <Box component="i" title={name} sx={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
      </Box>
      <Box component="b" sx={{ color: md3.onSurface, flexShrink: 0 }}>
        {money(amount)}
      </Box>
      {note && (
        <Box component="span" sx={{ color: md3.primary, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
          · {note}
        </Box>
      )}
    </Stack>
  );
}

// ─── One player ─────────────────────────────────────────────────────────────

function PlayerRowV2({ booking: b, index: i, onOrder, open, onToggle }: { booking: Booking; index: number; onOrder: boolean; open: boolean; onToggle: () => void }) {
  const { state, dispatch, toast } = usePos();
  const roster = useGolferRoster();
  const rates = rateContext(state);
  const p = b.playerStates[i];
  const name = playerName(b, i);
  const idMe = seatIdMe(b, i, roster);
  const editable = isEditableSeat(p);
  const adjusted = playerIsAdjusted(b, i);
  const accent = playerAccents[i % playerAccents.length];
  const holes = playerHoles(b, i);
  const fee = playerFee(b, i, rates);
  const ctx = { catalog: state.weston.rateCatalog, customers: state.customerEdits };
  const sp = seatPrice(b, i, fee, ctx);
  const record = seatRecord(b, i, state.customerEdits);
  const course = state.courses.find((c) => c.id === b.course);
  const holeOptions = course?.holeCount === 18 || bookingHoles(b) === 18 ? [9, 18] : [9];
  const note = b.playerNotes?.[i]?.trim() || record?.notes?.trim() || '';

  const patch = (x: Partial<Booking>) => dispatch({ type: 'patchBooking', bookingId: b.id, patch: x });
  const setSeat = (x: Partial<typeof p>) => patch({ playerStates: b.playerStates.map((s, j) => (j === i ? { ...s, ...x } : s)) });
  const openCustomer = () =>
    dispatch({ type: 'openCustomerModal', customerId: record?.id ?? null, bookingId: b.id, seat: i, assigning: record == null });

  return (
    <Box
      data-player-row={i}
      data-on-order={onOrder || undefined}
      sx={{
        mb: 1,
        p: '8px 12px',
        borderRadius: `${radius.md}px`,
        bgcolor: onOrder ? '#ecfdf3' : adjusted ? reservationPanel.adjusted.bg : md3.surfaceContainer,
        borderLeft: `4px solid ${accent}`,
        outline: onOrder ? `1.5px solid ${md3.primary}` : adjusted ? `1px solid ${reservationPanel.adjusted.border}` : 'none',
        opacity: p.noShow ? 0.6 : 1,
      }}
    >
      {/* ── Line 1: who ── */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ minHeight: TOUCH }}>
        <ButtonBase
          onClick={openCustomer}
          title={record ? 'Open customer profile' : 'Find this golfer in the database'}
          sx={{ gap: 0.875, borderRadius: `${radius.sm}px`, flexShrink: 0, minHeight: TOUCH }}
        >
          <Box
            sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: accent, color: md3.onPrimary, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {initials(name)}
          </Box>
          {/* The whole name, never cut — Weston, Oct 2: "we'd probably want to show the full name." */}
          <Typography data-player-name sx={{ fontSize: 15.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
            {name}
          </Typography>
        </ButtonBase>
        {i === 0 && <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: md3.onSurfaceVariant, letterSpacing: '.04em', flexShrink: 0 }}>BOOKER</Typography>}
        {idMe && <IdMeBadge group={idMe} compact />}
        {record ? (
          <MembershipChips record={record} />
        ) : (
          <Typography sx={{ fontSize: 10.5, color: md3.outline, fontWeight: 800, flexShrink: 0 }}>NOT LINKED</Typography>
        )}
        <Box sx={{ flex: 1 }} />
        {!p.noShow && <RoundStatusChip step={p.step} label={name} onStep={(step) => setSeat({ step })} />}
        <PaidPill paid={p.paid} noShow={p.noShow} />
      </Stack>

      {note && (
        <ButtonBase
          data-player-note={i}
          aria-label={`Note about ${name}`}
          onClick={() => dispatch({ type: 'setReservationTab', tab: 'notes' })}
          sx={{ width: '100%', gap: 0.625, justifyContent: 'flex-start', color: noteColors.yellow.text, fontSize: 11.5, fontWeight: 600, minWidth: 0 }}
        >
          <Icon name="sticky_note_2" size={14} />
          <Box component="span" sx={{ flex: 1, minWidth: 0, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {note}
          </Box>
        </ButtonBase>
      )}

      {/* ── Line 2: the sale ── */}
      {!p.noShow && (
        <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.5, minHeight: TOUCH }}>
          <Box sx={{ opacity: editable ? 1 : 0.55, pointerEvents: editable ? undefined : 'none', display: 'flex', gap: 1 }}>
            <Seg
              label={`${name}: holes`}
              value={holes}
              options={holeOptions.filter((h) => seatCanSwitchHoles(b, i, h as 9 | 18, ctx) || h === holes).map((h) => ({ value: h, label: `${h}` }))}
              onChange={(h) => patch(setPlayerHoles(b, i, h as 9 | 18))}
            />
            <Seg
              label={`${name}: transport`}
              value={playerTransport(b, i)}
              options={[
                { value: 'walking' as Transport, label: 'Walk', icon: 'directions_walk' },
                { value: 'cart' as Transport, label: 'Ride', icon: 'directions_car' },
                { value: 'push' as Transport, label: 'Push', icon: 'shopping_cart' },
              ]}
              onChange={(t) => patch(setPlayerTransport(b, i, t))}
            />
          </Box>
          <Box data-rate-lines sx={{ flex: 1, minWidth: 0, pl: 0.5, fontSize: 12.5, lineHeight: 1.35, color: md3.onSurfaceVariant }}>
            {/* The rate's name can be long; it gives way, the amount never does. */}
            <RateLine name={sp.rate?.name ?? 'Green fee'} amount={sp.greenFee} note={sp.reason && (sp.usesPunch || sp.discount > 0) ? sp.reason : null} />
            <RateLine name={sp.transport.name} amount={sp.transportFee} />
          </Box>
          <Typography data-seat-total sx={{ fontSize: 15.5, fontWeight: 800, minWidth: 68, textAlign: 'right' }}>
            {money(sp.total)}
          </Typography>
          {p.paid ? (
            <TouchButton tone="done" icon="check" sx={{ minWidth: 112 }}>
              Paid
            </TouchButton>
          ) : onOrder ? (
            <TouchButton tone="done" label={`${name} is on the order`} sx={{ minWidth: 112 }}>
              On order <Icon name="check" size={17} />
            </TouchButton>
          ) : (
            <TouchButton
              tone="filled"
              icon="add_shopping_cart"
              label={`Add ${name}`}
              disabled={!editable}
              onClick={() => dispatch({ type: 'addSeatToOrder', bookingId: b.id, seat: i })}
              sx={{ minWidth: 112 }}
            >
              Add
            </TouchButton>
          )}
          <TouchButton tone={open ? 'outline' : 'ghost'} icon="more_horiz" label={open ? `Close ${name}'s options` : `More for ${name}`} onClick={onToggle} />
        </Stack>
      )}
      {p.noShow && (
        <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mt: 0.5 }}>
          <TouchButton tone={open ? 'outline' : 'ghost'} icon="more_horiz" label={open ? `Close ${name}'s options` : `More for ${name}`} onClick={onToggle} />
        </Stack>
      )}

      {/* ── ⋯: only to change something ── */}
      {open && (
        <Box data-row-more={i} sx={{ mt: 1, pt: 1, borderTop: `1px solid ${md3.outlineVariant}` }}>
          <Stack direction="row" alignItems="center" gap={1} sx={{ flexWrap: 'wrap' }}>
            {editable && (
              <TouchButton icon="swap_horiz" onClick={() => dispatch({ type: 'openCustomerModal', customerId: null, bookingId: b.id, seat: i, assigning: true })}>
                Change golfer
              </TouchButton>
            )}
            {editable && (
              <Stack direction="row" alignItems="center" gap={0.75}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: md3.onSurfaceVariant }}>Tee fee</Typography>
                <FeeField
                  label={`${name} tee fee`}
                  value={sp.greenFee}
                  isDefault={p.fee == null && !sp.usesPunch && sp.discount === 0}
                  defaultFee={holesFee(b, i, holes, rates)}
                  onCommit={(v) => patch(setPlayerFee(b, i, v, rates))}
                  onReset={() => patch(resetPlayerFee(b, i))}
                />
              </Stack>
            )}
            {editable && (
              <TouchButton icon="vpn_key" onClick={() => dispatch({ type: 'openModal', modal: { kind: 'cartSignout', bookingId: b.id, seat: i } })}>
                {p.cartKey != null ? `Cart ${p.cartKey}` : 'Cart key'}
              </TouchButton>
            )}
            {!p.paid && (
              <TouchButton icon="person_off" onClick={() => setSeat({ noShow: !p.noShow, step: ROUND_STEP.notArrived })}>
                {p.noShow ? 'Undo no-show' : 'No-show'}
              </TouchButton>
            )}
            {onOrder && !p.paid && (
              <TouchButton icon="remove_shopping_cart" onClick={() => dispatch({ type: 'removeSeatFromOrder', bookingId: b.id, seat: i })}>
                Take off the order
              </TouchButton>
            )}
            {i > 0 && editable && (
              <TouchButton
                icon="close"
                onClick={() => {
                  patch(removePlayer(b, i));
                  toast(`${name} removed`);
                }}
              >
                Remove
              </TouchButton>
            )}
          </Stack>
          {/* The rate editor in place — the same one every edition uses. */}
          {editable && !p.noShow && <RateExpand booking={b} seat={i} onClose={onToggle} />}
        </Box>
      )}
    </Box>
  );
}
