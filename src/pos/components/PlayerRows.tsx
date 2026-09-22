import { useEffect, useState } from 'react';
import { Box, ButtonBase, InputBase, Tooltip, Typography } from '@mui/material';
import { md3, payBadges, playerAccents, radius, reservationPanel } from '../../theme/tokens';
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
import { seatRecord } from '../logic/seat-pricing';
import { dayBookings, rateContext } from '../state/pos-store';
import { useGolferRoster, usePos } from '../state/PosProvider';
import type { Booking, Transport } from '../types';
import { RoundRail } from './BookingTabs';
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
          <PlayerRow key={i} booking={b} index={i} is18Course={course?.holeCount === 18} />
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
}: {
  booking: Booking;
  index: number;
  /** An 18-hole course sells 9 and 18; a nine-hole course sells 9 only. */
  is18Course: boolean;
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
  // Weston, round 3: "if I click on Michael Thompson… does something else open?" The record is
  // the person's, not the reservation's, so it opens over everything rather than as a tab.
  // A seat with nobody in it opens the same surface in assign mode.
  const openCustomer = () =>
    dispatch({
      type: 'openCustomerModal',
      customerId: seatRecord(b, i)?.id ?? null,
      bookingId: b.id,
      seat: i,
      assigning: seatRecord(b, i) == null,
    });

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
          title={customer ? 'Open customer profile' : 'Link a customer'}
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
          {!customer && (
            <Box
              component="span"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, fontSize: 10.5, color: md3.primary, fontWeight: 700, flexShrink: 0 }}
            >
              <Icon name="link" size={13} color={md3.primary} />
              Link
            </Box>
          )}
        </ButtonBase>

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
            sx={{ p: 0.5, borderRadius: '50%', color: p.noShow ? md3.error : md3.outline }}
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
              sx={{ p: 0.5, borderRadius: '50%', color: md3.outline, '&:hover': { color: md3.error } }}
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
            onChange={(h) => patch(setPlayerHoles(b, i, h))}
          />
          <FeeField
            label={`${name} tee fee`}
            value={fee}
            disabled={!editable}
            isDefault={feeIsDefault}
            defaultFee={holesFee(b, i, holes, rates)}
            onCommit={(v) => patch(setPlayerFee(b, i, v, rates))}
            onReset={() => patch(resetPlayerFee(b, i))}
          />
          <Box sx={{ flex: 1 }} />
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
}: {
  value: T;
  options: Array<{ value: T; label: React.ReactNode; title?: string }>;
  onChange: (v: T) => void;
  disabled?: boolean;
  ariaLabel: string;
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
        return (
          <ButtonBase
            key={String(o.value)}
            role="radio"
            aria-checked={on}
            title={o.title}
            disabled={disabled}
            onClick={() => !on && onChange(o.value)}
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
