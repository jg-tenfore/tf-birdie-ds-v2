import { useEffect, useState } from 'react';
import { Box, ButtonBase, InputBase, Tooltip, Typography } from '@mui/material';
import { md3, noteColors, payBadges, playerAccents, radius, reservationPanel } from '../../theme/tokens';
import { ROUND_STEP, TRANSPORT_META } from '../data/config';
import { checkInPlayer } from '../logic/bookings';
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
import { seatCustomer, seatIdMe } from '../logic/seat-customer';
import { seatCanSwitchHoles, seatPrice, seatRecord } from '../logic/seat-pricing';
import type { SeatPrice } from '../logic/seat-pricing';
import type { Customer } from '../data/customers';
import { dayBookings, rateContext } from '../state/pos-store';
import { useGolferRoster, usePos } from '../state/PosProvider';
import type { Booking, Transport } from '../types';
import { RoundRail } from './BookingTabs';
import { RateExpand } from './RateExpand';
import { IdMeBadge } from './IdMeBadge';
import { Icon, MemberDot, SectionLabel } from './primitives';
import { Stack } from './Stack';

/**
 * The reservation's players, one row each (Weston Edits · Players tab).
 *
 * This is where the golf gets "massaged" before anything reaches the register: holes, tee
 * fee and transport are set *per player* here, and the order is built from exactly this.
 * Modifiers — which Weston pointed out are a food-and-beverage idea — never touch golf.
 *
 * Paid and no-show seats are read-only: their money is settled, and changing it is a
 * refund or a rain check (Financial tab), not an edit.
 */
export function PlayerRows({ booking: b }: { booking: Booking }) {
  const { state, dispatch, toast } = usePos();
  // Panel state rather than component state, so a QA link can open the editor on a seat.
  // See `ReservationPanelState.expandedSeat`.
  const expandedSeat = state.reservationPanel?.expandedSeat ?? null;
  const setExpandedSeat = (seat: number | null) => dispatch({ type: 'expandSeat', seat });
  const course = state.courses.find((c) => c.id === b.course);
  const cap = maxPlayers(b, course, dayBookings(state));
  const patch = (p: Partial<Booking>) => dispatch({ type: 'patchBooking', bookingId: b.id, patch: p });

  const setCount = (n: number) => {
    if (n < 1) return;
    if (n > cap) return toast(`Only ${cap} can play here — the next slot is taken`);
    const p = resizeParty(b, n, course, dayBookings(state));
    if (!Object.keys(p).length) return toast('No room beside this tee time');
    patch(p);
  };

  const checkedIn = b.playerStates.filter((p) => p.step >= 0 && !p.noShow).length;

  return (
    <Box>
      {/* ── Party size + group actions ── */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
        <SectionLabel color={md3.outline} sx={{ flex: 1 }}>
          Players · {checkedIn}/{b.players} checked in
        </SectionLabel>
        <CountStepper value={b.players} max={cap} onChange={setCount} />
      </Stack>
      <Stack direction="row" gap={0.75} sx={{ mb: 1.75, flexWrap: 'wrap' }}>
        <QuickAction
          icon="directions_car"
          label="Everyone rides"
          active={b.playerStates.every((_, i) => playerTransport(b, i) === 'cart')}
          onClick={() => patch(setGroupTransport(b, 'cart'))}
        />
        <QuickAction
          icon="directions_walk"
          label="Everyone walks"
          active={b.playerStates.every((_, i) => playerTransport(b, i) === 'walking')}
          onClick={() => patch(setGroupTransport(b, 'walking'))}
        />
        <QuickAction
          icon="how_to_reg"
          label="Check in all"
          active={checkedIn === b.players}
          onClick={() => {
            patch({ playerStates: b.playerStates.map(checkInPlayer) });
            toast(`${b.name} · all checked in`);
          }}
        />
      </Stack>

      <Stack gap={1}>
        {b.playerStates.map((_, i) => (
          <PlayerRow
            key={i}
            booking={b}
            index={i}
            is18Course={course?.holeCount === 18}
            expanded={expandedSeat === i}
            onToggleExpand={setExpandedSeat}
          />
        ))}
      </Stack>

      {b.players < cap && (
        <ButtonBase
          onClick={() => setCount(b.players + 1)}
          sx={{
            mt: 1,
            width: '100%',
            gap: 0.75,
            py: 1.125,
            borderRadius: `${radius.md}px`,
            border: `1.5px dashed ${md3.outlineVariant}`,
            fontSize: 12.5,
            fontWeight: 600,
            color: md3.onSurfaceVariant,
            '&:hover': { borderColor: md3.primary, color: md3.primary, bgcolor: md3.primaryContainer },
          }}
        >
          <Icon name="person_add" size={16} />
          Add player · {cap - b.players} open beside this tee time
        </ButtonBase>
      )}
    </Box>
  );
}

// ─── One player ─────────────────────────────────────────────────────────────

/**
 * One seat: who (name, member dot, ID.me), what they play (9/18, fee, transport), where
 * they are (the round rail) and whether they've paid. The row tints amber when anything
 * differs from the booking, so an adjusted foursome reads at a glance.
 */
export function PlayerRow({
  booking: b,
  index: i,
  is18Course,
  expanded = false,
  onToggleExpand = () => {},
}: {
  booking: Booking;
  index: number;
  /** An 18-hole course sells 9 and 18; a nine-hole course sells 9 only. */
  is18Course: boolean;
  /** Whether this row's rate editor is open. One at a time, held by the list. */
  expanded?: boolean;
  onToggleExpand?: (seat: number | null) => void;
}) {
  const { state, dispatch, toast } = usePos();
  const roster = useGolferRoster();
  // The rate card (and any price override on this row) prices a player switched to the
  // other hole count, and a player whose class isn't the booking's (a member in a guest's
  // group); the booked length on the booking's own class keeps the booking's rate.
  const rates = rateContext(state);
  const p = b.playerStates[i];
  const name = playerName(b, i);
  const customer = seatCustomer(b, i, roster);
  const idMe = seatIdMe(b, i, roster);
  const editable = isEditableSeat(p);
  const adjusted = playerIsAdjusted(b, i);
  const accent = playerAccents[i % playerAccents.length];
  const holes = playerHoles(b, i);
  const fee = playerFee(b, i, rates);
  const feeIsDefault = p.fee == null;

  const patch = (x: Partial<Booking>) => dispatch({ type: 'patchBooking', bookingId: b.id, patch: x });
  const ctx = { catalog: state.weston.rateCatalog, customers: state.customerEdits };
  const money9 = seatPrice(b, i, fee, ctx);
  const dense = state.weston.rowDensity === 'dense';
  const inOrder = state.selectedBookingId === b.id && (state.orderSeats?.includes(i) ?? false);
  const liveRecord = seatRecord(b, i, state.customerEdits);
  // Weston, round 3: "if I click on Michael Thompson… does something else open?" The record is
  // the person's, not the reservation's, so it opens over everything rather than as a tab.
  // A seat with nobody in it opens the same surface in assign mode.
  const openCustomer = () =>
    dispatch({
      type: 'openCustomerModal',
      customerId: liveRecord?.id ?? null,
      bookingId: b.id,
      seat: i,
      assigning: liveRecord == null,
    });

  /**
   * Swap the person in this position for somebody else.
   *
   * Round 4 spent a while on what to call this. "Link" meant nothing to Weston — *"I don't
   * understand this link thing"* — and **Edit** was worse, because both of us read it as
   * editing the profile you are standing on: *"I'd be thinking, wait, I'm editing, I want to
   * edit his profile."* His own answer was **Change golfer**, and it is a separate control
   * rather than a mode of the name, because the name already has a job: tapping it opens that
   * person's record, which he agreed with immediately — *"I agree with clicking on the name,
   * it should open."*
   *
   * The unlink-then-search two-step this replaces was the thing he pushed back on: *"seems
   * like a lot of steps to click unlink, and then go back… then it's a guest, then I'm
   * clicking on guest, and then I'm searching."* One tap, straight to search.
   */
  const changeGolfer = () =>
    dispatch({
      type: 'openCustomerModal',
      customerId: null,
      bookingId: b.id,
      seat: i,
      assigning: true,
    });

  // A note written about this player. Weston: "I don't even know if we need to show the note…
  // maybe it just alerts, right? It shows you that there's a note and you click on it." The
  // note itself lives in the Notes tab, which is where this goes.
  const note = b.playerNotes?.[i]?.trim() || liveRecord?.notes?.trim() || '';

  return (
    <Box
      data-player-row={i}
      sx={{
        bgcolor: adjusted ? reservationPanel.adjusted.bg : md3.surfaceContainer,
        border: `1px solid ${adjusted ? reservationPanel.adjusted.border : 'transparent'}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: `${radius.md}px`,
        p: '10px 12px',
        opacity: p.noShow ? 0.62 : 1,
      }}
    >
      {/* ── Who ── */}
      <Stack direction="row" alignItems="center" gap={1}>
        <ButtonBase
          onClick={openCustomer}
          title={liveRecord ? 'Open customer profile' : 'Find this golfer in the database'}
          sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', gap: 0.75, borderRadius: `${radius.sm}px` }}
        >
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              bgcolor: accent,
              color: md3.onPrimary,
              fontSize: 10.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {initials(name)}
          </Box>
          {customer && <MemberDot memberType={customer.memberType} size={7} />}
          <Typography
            sx={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {name}
          </Typography>
          {i === 0 && (
            <Typography sx={{ fontSize: 10, color: md3.outline, fontWeight: 700, flexShrink: 0 }}>BOOKER</Typography>
          )}
          {idMe && <IdMeBadge group={idMe} compact />}
          {/*
            Keyed off `liveRecord`, the same thing the name tap branches on.

            It used to read `customer`, which is `seatCustomer` — the *golfer* projection the
            member dot uses, resolved by a different path. The two disagree: a seat linked to a
            CRM record but with no golfer entry printed **NOT LINKED** while its name opened a
            full profile. Two answers to one question, on the same row, a centimetre apart.
          */}
          {!liveRecord && (
            <Box
              component="span"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, fontSize: 10.5, color: md3.outline, fontWeight: 700, flexShrink: 0 }}
            >
              NOT LINKED
            </Box>
          )}
        </ButtonBase>

        {/* The note alert, not the note. Tapping it goes to where the note is written. */}
        {note && (
          <Tooltip title={note}>
            <ButtonBase
              aria-label={`Note about ${name}`}
              onClick={() => dispatch({ type: 'setReservationTab', tab: 'notes' })}
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                color: noteColors.yellow.text,
                bgcolor: noteColors.yellow.bg,
                flexShrink: 0,
              }}
            >
              <Icon name="sticky_note_2" size={17} />
            </ButtonBase>
          </Tooltip>
        )}

        {editable && (
          <Tooltip title={customer ? 'Put a different golfer in this position' : 'Find this golfer in the database'}>
            <ButtonBase
              aria-label={`Change golfer in position ${i + 1}`}
              onClick={changeGolfer}
              sx={{
                height: 40,
                px: 1.25,
                gap: 0.5,
                borderRadius: `${radius.sm}px`,
                fontSize: 11.5,
                fontWeight: 700,
                color: liveRecord ? md3.onSurfaceVariant : md3.primary,
                bgcolor: liveRecord ? 'transparent' : md3.primaryContainer,
                flexShrink: 0,
                '&:hover': { bgcolor: md3.primaryContainer },
              }}
            >
              <Icon name="swap_horiz" size={15} />
              Change golfer
            </ButtonBase>
          </Tooltip>
        )}

        {/* Weston: "you hit add to cart for each player, and then you hit save." The fast path
            (Check in & pay) stays; this is for a group splitting the bill. */}
        {editable && (
          <Tooltip title={inOrder ? 'On the order' : 'Add this player to the order'}>
            <ButtonBase
              aria-label={`Add ${name} to the order`}
              aria-pressed={inOrder}
              onClick={() => dispatch({ type: 'addSeatToOrder', bookingId: b.id, seat: i })}
              sx={{
                height: 40,
                px: 1.25,
                gap: 0.5,
                borderRadius: `${radius.sm}px`,
                fontSize: 11.5,
                fontWeight: 700,
                flexShrink: 0,
                color: inOrder ? md3.primary : md3.onSurfaceVariant,
                bgcolor: inOrder ? md3.primaryContainer : 'transparent',
                '&:hover': { bgcolor: md3.primaryContainer },
              }}
            >
              <Icon name={inOrder ? 'shopping_cart' : 'add_shopping_cart'} size={13} />
              {inOrder ? 'In order' : 'Add'}
            </ButtonBase>
          </Tooltip>
        )}

        <PaidPill paid={p.paid} noShow={p.noShow} />

        <Tooltip title={p.noShow ? 'Undo no-show' : 'Mark no-show'}>
          <ButtonBase
            onClick={() =>
              patch({
                playerStates: b.playerStates.map((x, j) =>
                  j === i ? { ...x, noShow: !x.noShow, step: ROUND_STEP.notArrived } : x,
                ),
              })
            }
            sx={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, color: p.noShow ? md3.error : md3.outline }}
          >
            <Icon name="person_off" size={16} />
          </ButtonBase>
        </Tooltip>
        {i > 0 && (
          <Tooltip title="Remove player">
            <ButtonBase
              onClick={() => {
                patch(removePlayer(b, i));
                toast(`${name} removed`);
              }}
              sx={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, color: md3.outline, '&:hover': { color: md3.error } }}
            >
              <Icon name="close" size={16} />
            </ButtonBase>
          </Tooltip>
        )}
      </Stack>

      {/* ── What they play ── */}
      {!p.noShow && (
        <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1 }}>
          <Segmented
            ariaLabel={`${name} holes`}
            disabled={!editable}
            value={holes}
            options={(is18Course || bookingHoles(b) === 18 ? [9, 18] : [9]).map((h) => ({
              value: h as 9 | 18,
              label: `${h}`,
            }))}
            optionDisabled={(h) => !seatCanSwitchHoles(b, i, h as 9 | 18, ctx)}
            optionTitle={(h) =>
              seatCanSwitchHoles(b, i, h as 9 | 18, ctx)
                ? undefined
                : `${money9.rate?.name} is ${h === 9 ? 18 : 9} holes only — change the rate first`
            }
            onChange={(h) => patch(setPlayerHoles(b, i, h))}
          />
          <FeeField
            label={`${name} tee fee`}
            value={money9.greenFee}
            disabled={!editable}
            isDefault={feeIsDefault && !money9.usesPunch && money9.discount === 0}
            defaultFee={holesFee(b, i, holes, rates)}
            onCommit={(v) => patch(setPlayerFee(b, i, v, rates))}
            onReset={() => patch(resetPlayerFee(b, i))}
          />
          {/* Weston: "maybe you click and this expands, instead of taking over a full screen." */}
          <Tooltip title={expanded ? 'Close rates' : 'Choose a rate'}>
            <Box component="span" sx={{ display: 'inline-flex' }}>
              <ButtonBase
                aria-label={`${name} rates`}
                aria-expanded={expanded}
                disabled={!editable}
                onClick={() => onToggleExpand(expanded ? null : i)}
                sx={{ width: 40, height: 40, borderRadius: `${radius.sm}px`, flexShrink: 0, color: expanded ? md3.primary : md3.outline }}
              >
                <Icon name={expanded ? 'expand_less' : 'tune'} size={16} />
              </ButtonBase>
            </Box>
          </Tooltip>
          <Box sx={{ flex: 1 }} />
          {/* Cart signout — a key glyph once one is out, so the row says what the player has. */}
          <Tooltip title={p.cartKey != null ? `Cart ${p.cartKey} — tap to change` : 'Sign out a cart'}>
            <Box component="span" sx={{ display: 'inline-flex' }}>
              <ButtonBase
                aria-label={`${name} cart signout`}
                disabled={!editable}
                onClick={() =>
                  dispatch({ type: 'openModal', modal: { kind: 'cartSignout', bookingId: b.id, seat: i } })
                }
                sx={{
                  px: 0.5,
                  py: 0.25,
                  gap: 0.25,
                  borderRadius: `${radius.sm}px`,
                  fontSize: 11,
                  fontWeight: 700,
                  color: p.cartKey != null ? md3.primary : md3.outline,
                }}
              >
                <Icon name="vpn_key" size={14} />
                {p.cartKey != null ? p.cartKey : ''}
              </ButtonBase>
            </Box>
          </Tooltip>
          <Segmented
            ariaLabel={`${name} transport`}
            disabled={!editable}
            value={playerTransport(b, i)}
            options={(['walking', 'cart', 'push'] as Transport[]).map((t) => ({
              value: t,
              label: <Icon name={TRANSPORT_META[t].icon} size={15} />,
              title: TRANSPORT_META[t].label,
            }))}
            onChange={(t) => patch(setPlayerTransport(b, i, t))}
          />
        </Stack>
      )}

      {/* ── What they're sold on ── */}
      {!p.noShow && <SeatMeta booking={b} seat={i} price={money9} dense={dense} record={liveRecord} />}

      {/* ── The rate editor, in place ── */}
      {expanded && !p.noShow && <RateExpand booking={b} seat={i} onClose={() => onToggleExpand(null)} />}

      {/* ── Where they are ── */}
      {!p.noShow && (
        <RoundRail
          dense
          state={p}
          onStep={(step) =>
            patch({ playerStates: b.playerStates.map((x, j) => (j === i ? { ...x, step } : x)) })
          }
        />
      )}
    </Box>
  );
}

/**
 * The line under the name: what this seat is actually sold on.
 *
 * Weston, on the old screen: "we want to display that there… we displayed those for a reason."
 * A bare dollar amount cannot answer "why is he paying that", and the rate's *name* is the
 * answer. The customer id, rewards and rounds come along because that is the line the counter
 * reads back to the golfer.
 *
 * Two densities, as agreed: comfortable gives the rate and the ride their own lines so a long
 * rate name never truncates; dense packs it the way the old prototype did, which fits four
 * seats at 640 without scrolling.
 */
function SeatMeta({
  booking: b,
  seat: i,
  price: sp,
  dense,
  record,
}: {
  booking: Booking;
  seat: number;
  price: SeatPrice;
  dense: boolean;
  /** The seat's record *with session edits applied*, resolved once by the row. */
  record: Customer | null;
}) {
  const bits = [
    record && `ID ${record.id}`,
    record && record.rewardsBalance > 0 && `+${record.rewardsBalance}`,
    record && record.teeTimes.length > 0 && `${record.teeTimes.length} rounds`,
    b.playerStates[i]?.cartKey != null && `cart ${b.playerStates[i]?.cartKey}`,
  ].filter(Boolean) as string[];

  // Why the seat is cheap, when it is.
  const reason = sp.usesPunch
    ? sp.reason
    : sp.discount > 0
      ? `${sp.reason} · was ${money(sp.gross)}`
      : null;

  if (dense) {
    return (
      <Box sx={{ mt: 0.5 }}>
        <Typography
          sx={{
            fontSize: 10.5,
            color: md3.onSurfaceVariant,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {[
            sp.rate && `${sp.rate.name} : ${money(sp.greenFee)}`,
            `${sp.transport.name} : ${money(sp.transportFee)}`,
            ...bits,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Typography>
        {/*
          Dense takes a second line only when there is a reason to give. An ordinary seat keeps
          the one-liner dense exists for; a comped or punch-paid seat would otherwise read as a
          bare $0.00, and an unexplained zero is the thing that gets queried at month end.
        */}
        {reason && (
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: md3.primary }}>{reason}</Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 0.5 }}>
      <MetaLine left={sp.rate?.name ?? 'Green fee'} right={money(sp.greenFee)} note={reason} />
      <MetaLine left={sp.transport.name} right={money(sp.transportFee)} />
      {bits.length > 0 && (
        <Typography sx={{ fontSize: 10.5, color: md3.outline, mt: 0.125 }}>{bits.join(' · ')}</Typography>
      )}
    </Box>
  );
}

function MetaLine({ left, right, note }: { left: string; right: string; note?: string | null }) {
  return (
    <Stack direction="row" alignItems="baseline" gap={0.75}>
      <Typography
        sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {left}
      </Typography>
      {note && (
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: md3.primary, flexShrink: 0 }}>{note}</Typography>
      )}
      <Box sx={{ flex: 1, borderBottom: `1px dotted ${md3.outlineVariant}`, mx: 0.25 }} />
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>{right}</Typography>
    </Stack>
  );
}

// ─── Controls ───────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

function PaidPill({ paid, noShow }: { paid: boolean; noShow: boolean }) {
  const cfg = noShow ? payBadges.no_show : paid ? payBadges.paid : payBadges.open;
  return (
    <Box
      component="span"
      sx={{
        px: 1,
        py: '2px',
        borderRadius: `${radius.xl}px`,
        bgcolor: cfg.bg,
        color: cfg.text,
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: '.3px',
        flexShrink: 0,
      }}
    >
      {noShow ? 'NO SHOW' : paid ? 'PAID' : 'UNPAID'}
    </Box>
  );
}

/** A small segmented control: holes (9 / 18) and transport (walk / cart / push). */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
  optionDisabled,
  optionTitle,
}: {
  value: T;
  options: Array<{ value: T; label: React.ReactNode; title?: string }>;
  onChange: (v: T) => void;
  disabled?: boolean;
  ariaLabel: string;
  /** Disables one option — a rate sold for 18 only blocks the 9, rather than repricing. */
  optionDisabled?: (v: T) => boolean;
  optionTitle?: (v: T) => string | undefined;
}) {
  return (
    <Stack
      role="radiogroup"
      aria-label={ariaLabel}
      direction="row"
      sx={{
        border: `1.5px solid ${md3.outlineVariant}`,
        borderRadius: `${radius.sm}px`,
        overflow: 'hidden',
        bgcolor: md3.onPrimary,
        flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {options.map((o, k) => {
        const on = o.value === value;
        const off = Boolean(optionDisabled?.(o.value));
        return (
          <ButtonBase
            key={String(o.value)}
            role="radio"
            aria-checked={on}
            title={optionTitle?.(o.value) ?? o.title}
            disabled={disabled || off}
            onClick={() => !on && !off && onChange(o.value)}
            sx={{
              minWidth: 34,
              height: 28,
              px: 0.875,
              fontSize: 12.5,
              fontWeight: 800,
              borderLeft: k ? `1px solid ${md3.outlineVariant}` : 'none',
              bgcolor: on ? md3.onSurface : 'transparent',
              color: on ? md3.onPrimary : md3.onSurfaceVariant,
            }}
          >
            {o.label}
          </ButtonBase>
        );
      })}
    </Stack>
  );
}

/**
 * The per-player tee fee. Commits on blur or Enter (typing "4" on the way to "45" must not
 * reprice the order); a reset appears once it differs from the default for their holes.
 */
function FeeField({
  label,
  value,
  isDefault,
  defaultFee,
  disabled,
  onCommit,
  onReset,
}: {
  label: string;
  value: number;
  isDefault: boolean;
  defaultFee: number;
  disabled?: boolean;
  onCommit: (v: number) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(value.toFixed(2));
  useEffect(() => setDraft(value.toFixed(2)), [value]);
  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n >= 0 && n !== value) onCommit(n);
    else setDraft(value.toFixed(2));
  };

  return (
    <Stack direction="row" alignItems="center" gap={0.25}>
      <Stack
        direction="row"
        alignItems="center"
        sx={{
          height: 28,
          px: 0.875,
          border: `1.5px solid ${isDefault ? md3.outlineVariant : reservationPanel.adjusted.text}`,
          borderRadius: `${radius.sm}px`,
          bgcolor: disabled ? 'transparent' : md3.onPrimary,
          width: 84,
        }}
      >
        <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, mr: 0.25 }}>$</Typography>
        <InputBase
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          inputProps={{ 'aria-label': label, inputMode: 'decimal' }}
          sx={{ flex: 1, fontSize: 13, fontWeight: 700, '& input': { p: 0 } }}
        />
      </Stack>
      {!isDefault && !disabled && (
        <Tooltip title={`Reset to ${money(defaultFee)}`}>
          <ButtonBase onClick={onReset} sx={{ p: 0.375, borderRadius: '50%', color: reservationPanel.adjusted.text }}>
            <Icon name="restart_alt" size={15} />
          </ButtonBase>
        </Tooltip>
      )}
    </Stack>
  );
}

function CountStepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  const btn = (delta: number, disabled: boolean) => (
    <ButtonBase
      aria-label={delta > 0 ? 'Add a player' : 'Remove the last player'}
      disabled={disabled}
      onClick={() => onChange(value + delta)}
      sx={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: `1.5px solid ${md3.outlineVariant}`,
        bgcolor: md3.onPrimary,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon name={delta > 0 ? 'add' : 'remove'} size={15} />
    </ButtonBase>
  );
  return (
    <Stack direction="row" alignItems="center" gap={0.75}>
      {btn(-1, value <= 1)}
      <Typography sx={{ fontSize: 14, fontWeight: 800, minWidth: 16, textAlign: 'center' }}>{value}</Typography>
      {btn(1, value >= max)}
      <Typography sx={{ fontSize: 11, color: md3.outline }}>of {max}</Typography>
    </Stack>
  );
}

function QuickAction({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        gap: 0.625,
        px: 1.25,
        py: 0.625,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${active ? md3.primary : md3.outlineVariant}`,
        bgcolor: active ? md3.primaryContainer : md3.onPrimary,
        color: active ? md3.onPrimaryContainer : md3.onSurfaceVariant,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <Icon name={icon} size={15} />
      {label}
    </ButtonBase>
  );
}
