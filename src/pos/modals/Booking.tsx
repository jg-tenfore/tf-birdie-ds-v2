import { useMemo, useState } from 'react';
import { Box, ButtonBase, Divider, Typography } from '@mui/material';
import { md3, playerAccents, radius, shifts } from '../../theme/tokens';
import { CATALOG } from '../data/catalog';
import { TIMES, formatTimeLabel, toDateStr } from '../data/courses';
import { ALL_GOLFERS } from '../data/golfers';
import { slotsFree } from '../logic/bookings';
import * as cart from '../logic/cart';
import { dayBookings } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import type { Booking, CartTeeTime, PlayerState } from '../types';
import { Icon, MemberDot } from '../components/primitives';
import {
  Callout,
  Field,
  FilledButton,
  ModalFrame,
  ModalSection,
  OutlineButton,
  PillGroup,
  ResultList,
  ResultRow,
  SelectField,
} from './ModalFrame';
import { Stack } from '../components/Stack';

/**
 * Booking creation: picking a tee time for an order, confirming a reservation, and
 * creating a booking directly from an empty grid cell.
 */

// ─── Tee picker ─────────────────────────────────────────────────────────────

/**
 * Choose a slot for the round already on the order.
 *
 * Only slots with room for the whole party are offered — a threesome never sees a
 * time with two seats left, because splitting a group across tee times is a
 * different (and deliberate) operation.
 *
 * For 18 holes the picker runs twice: front nine, then back nine on a *different*
 * course, which is how this club sequences a full round across its three nines.
 */
export function TeePicker({ is18H }: { is18H?: boolean }) {
  const { state, dispatch, toast } = usePos();
  const checkIn = cart.findCheckInItem(state.cart);
  const partySize = checkIn?.players?.length ?? 1;

  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [step, setStep] = useState<'front9' | 'back9'>('front9');
  const [front9, setFront9] = useState<CartTeeTime | null>(null);

  // 18 holes is inferred from the rate on the order unless forced by the caller.
  const wants18 = is18H ?? /18/.test(checkIn?.name ?? '');
  const bookings = dayBookings(state);

  const courses = state.courses.filter(
    (c) => c.visible && !c.locked && (step === 'back9' && front9 ? c.id !== front9.courseId : true),
  );
  const shown = courseFilter === 'all' ? courses : courses.filter((c) => c.id === courseFilter);

  // The back nine can only start after the front nine has teed off.
  const minTime = step === 'back9' && front9 ? front9.timeMin + 60 : 0;

  const pick = (courseId: string, timeMin: number) => {
    const course = state.courses.find((c) => c.id === courseId);
    const slot: CartTeeTime = {
      courseId,
      courseName: course?.name ?? courseId,
      timeMin,
      label: formatTimeLabel(timeMin),
      shiftLabel: bandFor(timeMin),
    };

    if (wants18 && step === 'front9') {
      setFront9(slot);
      setStep('back9');
      setCourseFilter('all');
      return;
    }

    if (wants18 && front9) {
      dispatch({ type: 'attachTeeTime', teeTime: front9, back9: slot });
      toast(`18 holes · ${front9.label} ${front9.courseName} → ${slot.label} ${slot.courseName}`);
    } else {
      dispatch({ type: 'attachTeeTime', teeTime: slot });
      toast(`Tee time ${slot.label} · ${slot.courseName}`);
    }
    dispatch({ type: 'closeModal' });
  };

  return (
    <ModalFrame
      width={620}
      tall
      title={wants18 ? (step === 'front9' ? 'Select front nine' : 'Select back nine') : 'Select tee time'}
      subtitle={
        wants18 && step === 'back9' && front9
          ? `Front nine ${front9.label} · ${front9.courseName} — pick a crossover on another course`
          : `${partySize} player${partySize === 1 ? '' : 's'} · ${state.currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
      }
      icon="schedule"
      actions={
        <>
          {step === 'back9' && (
            <OutlineButton
              onClick={() => {
                setStep('front9');
                setFront9(null);
              }}
            >
              Back
            </OutlineButton>
          )}
          <Box sx={{ flex: 1 }} />
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
        </>
      }
    >
      <PillGroup
        value={courseFilter}
        options={[
          { label: 'All courses', value: 'all' },
          ...courses.map((c) => ({ label: c.name, value: c.id })),
        ]}
        onChange={setCourseFilter}
      />

      <Box sx={{ mt: 2 }}>
        {shown.map((course) => {
          const open = TIMES.filter(
            (t) => t.totalMin >= minTime && slotsFree(bookings, course, t.totalMin) >= partySize,
          );
          return (
            <ModalSection
              key={course.id}
              title={course.name}
              hint={`${open.length} time${open.length === 1 ? '' : 's'} with room for ${partySize}`}
            >
              {open.length === 0 ? (
                <Callout tone="warning">No slot on this course fits {partySize} players today.</Callout>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0.75 }}>
                  {open.map((t) => {
                    const band = bandFor(t.totalMin);
                    const tint = band === 'Early Morning' ? '#f59e0b' : band === 'Twilight' ? '#7c3aed' : '#16a34a';
                    return (
                      <ButtonBase
                        key={t.totalMin}
                        onClick={() => pick(course.id, t.totalMin)}
                        sx={{
                          flexDirection: 'column',
                          gap: '2px',
                          py: 0.875,
                          borderRadius: `${radius.md}px`,
                          border: `1.5px solid ${md3.outlineVariant}`,
                          bgcolor: '#fff',
                          fontSize: 11.5,
                          fontWeight: 700,
                          '&:hover': { borderColor: tint, bgcolor: `${tint}14`, color: tint },
                        }}
                      >
                        {t.label}
                        <Box component="span" sx={{ fontSize: 9, fontWeight: 600, color: md3.outline }}>
                          {slotsFree(bookings, course, t.totalMin)} open
                        </Box>
                      </ButtonBase>
                    );
                  })}
                </Box>
              )}
            </ModalSection>
          );
        })}
      </Box>
    </ModalFrame>
  );
}

/** Which time-of-day band a minute falls in. */
function bandFor(timeMin: number): string {
  const h = Math.floor(timeMin / 60);
  if (h < 10) return shifts.early.label;
  if (h < 14) return shifts.peak.label;
  return shifts.twilight.label;
}

// ─── Reserve confirmation ───────────────────────────────────────────────────

/**
 * Confirm a reservation without taking payment.
 *
 * Shows the per-player total so staff can read the balance back over the phone, then
 * writes the booking onto the tee sheet as unpaid.
 */
export function ReserveConfirm({ payMode }: { payMode: 'now' | 'later' }) {
  const { state, dispatch, toast } = usePos();
  const checkIn = state.cart.find((i) => i.isCheckIn && i.teeTime);
  if (!checkIn?.teeTime) return null;

  const back9 = state.cart.find((i) => i.is18HBack);
  const players = checkIn.players ?? [];
  const unitPrice = checkIn.unitPrice ?? 0;
  const lineTotal = players.reduce((s, p) => s + cart.playerPrice(unitPrice, p), 0);
  const back9Total = back9
    ? (back9.players ?? []).reduce((s, p) => s + cart.playerPrice(back9.unitPrice ?? 0, p), 0)
    : 0;
  const others = state.cart.filter((i) => !i.isCheckIn && !i.isSubItem);
  const otherTotal = others.reduce((s, i) => s + i.price * i.qty, 0);
  const grand = lineTotal + back9Total + otherTotal;

  const finalize = () => {
    const slot = checkIn.teeTime!;
    const course = state.courses.find((c) => c.id === slot.courseId);
    const free = slotsFree(dayBookings(state), course ?? state.courses[0], slot.timeMin);
    if (free < players.length) {
      toast(`Only ${free} slot${free === 1 ? '' : 's'} left at ${slot.label}`);
      return;
    }

    const playerStates: PlayerState[] = players.map(() => ({
      paid: payMode === 'now',
      step: -1,
      noShow: false,
    }));

    const booking: Booking = {
      id: `new-${Date.now()}`,
      date: toDateStr(state.currentDate),
      course: slot.courseId,
      slot: course ? course.slots - free : 0,
      timeMin: slot.timeMin,
      name: players[0]?.name || 'Reservation',
      players: players.length,
      cart: players[0]?.transport ?? 'walking',
      status: 'booked',
      phone: state.selectedGolfer?.phone ?? '—',
      conf: `R-${Math.floor(Math.random() * 9000 + 1000)}`,
      pay: payMode === 'now' ? 'paid' : 'open',
      price: unitPrice,
      holes: /18/.test(checkIn.name) ? '18H' : '9H',
      playerStates,
      guests: players.map((p) => ({ name: p.name })),
    };

    dispatch({ type: 'addBookings', bookings: [booking] });
    dispatch({ type: 'clearOrder' });
    toast(`Reserved · ${booking.conf} · ${slot.label} ${slot.courseName}`);
  };

  return (
    <ModalFrame
      width={480}
      title="Confirm reservation"
      subtitle={`${checkIn.teeTime.label} · ${checkIn.teeTime.courseName}`}
      icon="event_available"
      iconColor="#d97706"
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Back</OutlineButton>
          <FilledButton onClick={finalize}>
            {payMode === 'now' ? `Reserve & charge ${cart.money(grand)}` : 'Reserve · pay at counter'}
          </FilledButton>
        </>
      }
    >
      <ModalSection title="Players">
        <Stack gap={0.75}>
          {players.map((p, i) => {
            const b = cart.playerBreakdown(unitPrice, p);
            return (
              <Stack
                key={i}
                direction="row"
                alignItems="center"
                gap={1}
                sx={{ p: '9px 12px', bgcolor: md3.surfaceContainer, borderRadius: `${radius.md}px` }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: playerAccents[i % playerAccents.length],
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: md3.onSurfaceVariant }}>
                    {[p.transport, ...(p.modifierTags ?? []).map((t) => t.tag)].join(' · ')}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{cart.money(b.total)}</Typography>
              </Stack>
            );
          })}
        </Stack>
      </ModalSection>

      {back9?.teeTime && (
        <ModalSection title="Back nine">
          <Callout tone="info" icon="sync_alt">
            Crossover at {back9.teeTime.label} · {back9.teeTime.courseName} · {cart.money(back9Total)}
          </Callout>
        </ModalSection>
      )}

      <Divider sx={{ my: 1.5 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>Total</Typography>
        <Typography sx={{ fontSize: 20, fontWeight: 800 }}>{cart.money(grand)}</Typography>
      </Stack>
      {payMode === 'later' && (
        <Box sx={{ mt: 1.5 }}>
          <Callout tone="warning">
            The tee sheet will show this as an open balance until it's settled at the counter.
          </Callout>
        </Box>
      )}
    </ModalFrame>
  );
}

// ─── New booking from an empty cell ─────────────────────────────────────────

/**
 * Three-step booking creation: type → rate → details.
 *
 * The steps exist because each answer narrows the next: walk-in versus reservation
 * decides whether payment is due now, the rate decides the hole count and price, and
 * only then does the golfer/party detail matter.
 */
export function NewBooking({
  courseId,
  timeMin,
  startSlot,
}: {
  courseId: string;
  timeMin: number;
  startSlot: number;
}) {
  const { state, dispatch, toast } = usePos();
  const course = state.courses.find((c) => c.id === courseId);
  const free = slotsFree(dayBookings(state), course ?? state.courses[0], timeMin);

  const [step, setStep] = useState(1);
  const [type, setType] = useState<'walkin' | 'reservation'>('walkin');
  const [rate, setRate] = useState<{ name: string; price: number } | null>(null);
  const [golfer, setGolfer] = useState<{ name: string; phone: string } | null>(null);
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState(Math.min(2, free));
  const [transport, setTransport] = useState<'walking' | 'cart' | 'push'>('cart');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_GOLFERS.slice(0, 6);
    return ALL_GOLFERS.filter(
      (g) => g.name.toLowerCase().includes(q) || g.phone.includes(q),
    ).slice(0, 8);
  }, [query]);

  const rates = CATALOG['CHECK IN'].items;
  const is18 = /18/.test(rate?.name ?? '');

  const confirm = () => {
    if (!golfer?.name.trim()) return toast('Pick or enter a golfer');
    if (players > free) return toast(`Only ${free} slot${free === 1 ? '' : 's'} free here`);

    const isMemberRate = /Member/.test(rate?.name ?? '');
    const booking: Booking = {
      id: `new-${Date.now()}`,
      date: toDateStr(state.currentDate),
      course: courseId,
      slot: startSlot,
      timeMin,
      name: golfer.name,
      players,
      cart: transport,
      status: isMemberRate ? 'member' : type === 'walkin' ? 'walkin' : 'booked',
      phone: golfer.phone || '—',
      conf: `${isMemberRate ? 'M' : 'R'}-${Math.floor(Math.random() * 9000 + 1000)}`,
      pay: type === 'walkin' ? 'paid' : 'open',
      price: rate?.price ?? 0,
      holes: is18 ? '18H' : '9H',
      playerStates: Array.from({ length: players }, () => ({
        paid: type === 'walkin',
        step: type === 'walkin' ? 0 : -1,
        noShow: false,
      })),
      guests: Array.from({ length: players }, (_, i) => ({
        name: i === 0 ? golfer.name : `Guest ${i + 1}`,
      })),
    };

    dispatch({ type: 'addBookings', bookings: [booking] });
    dispatch({ type: 'closeModal' });
    toast(`${booking.name} booked · ${formatTimeLabel(timeMin)} · ${course?.name}`);
  };

  return (
    <ModalFrame
      width={520}
      title="New tee time"
      subtitle={`${formatTimeLabel(timeMin)} · ${course?.name} · ${free} slot${free === 1 ? '' : 's'} free`}
      icon="add_circle"
      actions={
        <>
          {step > 1 && <OutlineButton onClick={() => setStep(step - 1)}>Back</OutlineButton>}
          <Box sx={{ flex: 1 }} />
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          {step === 3 && <FilledButton onClick={confirm}>Create booking</FilledButton>}
        </>
      }
    >
      {/* Stepper */}
      <Stack direction="row" gap={0} sx={{ mb: 2.5 }}>
        {['Type', 'Rate', 'Details'].map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <Stack key={label} alignItems="center" gap={0.5} sx={{ flex: 1, position: 'relative' }}>
              {i < 2 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 13,
                    left: '50%',
                    right: '-50%',
                    height: 2,
                    bgcolor: done ? md3.primary : md3.outlineVariant,
                  }}
                />
              )}
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  border: `2px solid ${done || active ? md3.primary : md3.outlineVariant}`,
                  bgcolor: done ? md3.primary : active ? md3.primaryContainer : md3.surfaceContainer,
                  color: done ? '#fff' : active ? md3.primary : md3.outline,
                }}
              >
                {done ? <Icon name="check" size={14} /> : n}
              </Box>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: active ? md3.onSurface : md3.outline }}>
                {label}
              </Typography>
            </Stack>
          );
        })}
      </Stack>

      {step === 1 && (
        <Stack gap={1}>
          {(
            [
              ['walkin', 'directions_walk', 'Walk-in', 'Golfer is at the counter now · pay immediately'],
              ['reservation', 'event_available', 'Reservation', 'Booked ahead · balance settled at check-in'],
            ] as const
          ).map(([v, icon, title, desc]) => (
            <ButtonBase
              key={v}
              onClick={() => {
                setType(v);
                setStep(2);
              }}
              sx={{
                gap: 1.5,
                p: 2,
                justifyContent: 'flex-start',
                textAlign: 'left',
                borderRadius: `${radius.md}px`,
                border: `1.5px solid ${type === v ? md3.primary : md3.outlineVariant}`,
                bgcolor: type === v ? md3.primaryContainer : '#fff',
                '&:hover': { borderColor: md3.primary, bgcolor: md3.primaryContainer },
              }}
            >
              <Icon name={icon} size={22} color={md3.primary} />
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{title}</Typography>
                <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>{desc}</Typography>
              </Box>
              <Box sx={{ flex: 1 }} />
              <Icon name="chevron_right" size={18} color={md3.outline} />
            </ButtonBase>
          ))}
        </Stack>
      )}

      {step === 2 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0.75 }}>
          {rates.map((item) => (
            <ButtonBase
              key={item.n}
              onClick={() => {
                setRate({ name: item.n, price: item.p });
                setStep(3);
              }}
              sx={{
                flexDirection: 'column',
                gap: 0.5,
                py: 1.5,
                px: 1,
                minHeight: 64,
                borderRadius: `${radius.md}px`,
                border: `1.5px solid ${rate?.name === item.n ? md3.primary : md3.outlineVariant}`,
                bgcolor: rate?.name === item.n ? md3.primaryContainer : '#fff',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                textAlign: 'center',
                lineHeight: 1.3,
                '&:hover': { borderColor: md3.primary },
              }}
            >
              {item.n}
              <Box component="span" sx={{ fontSize: 10, fontWeight: 500, opacity: 0.72 }}>
                {item.p === 0 ? 'Free' : cart.money(item.p)}
              </Box>
            </ButtonBase>
          ))}
        </Box>
      )}

      {step === 3 && (
        <>
          <ModalSection title="Golfer">
            {golfer ? (
              <Stack
                direction="row"
                alignItems="center"
                gap={1}
                sx={{
                  p: '11px 13px',
                  bgcolor: md3.primaryContainer,
                  border: `1.5px solid ${md3.primary}`,
                  borderRadius: `${radius.md}px`,
                }}
              >
                <MemberDot name={golfer.name} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: md3.primary }}>
                    {golfer.name}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>{golfer.phone}</Typography>
                </Box>
                <ButtonBase onClick={() => setGolfer(null)} sx={{ p: 0.5, borderRadius: '50%' }}>
                  <Icon name="close" size={15} />
                </ButtonBase>
              </Stack>
            ) : (
              <>
                <Field
                  autoFocus
                  value={query}
                  onChange={setQuery}
                  placeholder="Search name or phone, or type a new name"
                />
                <Box sx={{ mt: 1 }}>
                  <ResultList maxHeight={190}>
                    {matches.map((g) => (
                      <ResultRow
                        key={g.id}
                        primary={
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <MemberDot memberType={g.memberType} size={7} />
                            {g.name}
                          </Stack>
                        }
                        secondary={`${g.phone} · HCP ${g.hcp}`}
                        badge={g.memberType ? g.memberType : 'Guest'}
                        onClick={() => setGolfer({ name: g.name, phone: g.phone })}
                      />
                    ))}
                    {query.trim() && (
                      <ResultRow
                        primary={`Use "${query.trim()}"`}
                        secondary="Create as a new walk-in, no CRM record"
                        onClick={() => setGolfer({ name: query.trim(), phone: '—' })}
                      />
                    )}
                  </ResultList>
                </Box>
              </>
            )}
          </ModalSection>

          <ModalSection title="Party">
            <Stack direction="row" gap={1.5}>
              <SelectField
                label="Players"
                value={players}
                options={Array.from({ length: Math.max(1, free) }, (_, i) => ({
                  label: `${i + 1} player${i === 0 ? '' : 's'}`,
                  value: i + 1,
                }))}
                onChange={setPlayers}
              />
              <SelectField
                label="Transport"
                value={transport}
                options={[
                  { label: 'Riding cart', value: 'cart' as const },
                  { label: 'Walking', value: 'walking' as const },
                  { label: 'Push cart', value: 'push' as const },
                ]}
                onChange={setTransport}
              />
            </Stack>
          </ModalSection>

          <Callout tone="info">
            {rate?.name} · {is18 ? '18 holes' : '9 holes'} ·{' '}
            {rate?.price ? `${cart.money(rate.price)} per player` : 'Member rate'} ·{' '}
            {type === 'walkin' ? 'paid now' : 'balance due at check-in'}
          </Callout>
        </>
      )}
    </ModalFrame>
  );
}
