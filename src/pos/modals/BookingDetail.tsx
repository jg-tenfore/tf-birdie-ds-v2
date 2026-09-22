import { useState } from 'react';
import { Box, ButtonBase, Tab, Tabs, Typography } from '@mui/material';
import { md3, playerAccents, radius } from '../../theme/tokens';
import { ROUND_STEP, TRANSPORT_META, roundStepOf } from '../data/config';
import { formatTimeLabel } from '../data/courses';
import { findMemberByPhone } from '../data/golfers';
import { money, moneyShort } from '../logic/cart';
import { useGolferRoster, usePos } from '../state/PosProvider';
import type { Booking } from '../types';
import { Icon, MemberDot, PayBadge } from '../components/primitives';
import { Callout, FilledButton, ModalFrame, ModalSection, OutlineButton, PillGroup } from './ModalFrame';
import { BookingActivity, BookingFinancial, BookingNotes, RoundRail } from '../components/BookingTabs';
import { Stack } from '../components/Stack';
import { checkInPlayer } from '../logic/bookings';

/**
 * Booking detail — the full record behind one tee time, in five tabs.
 *
 * The tab order follows how staff actually work a booking: confirm *what* it is,
 * move players through check-in, settle money, read notes, then audit. Player state
 * is per-person rather than per-booking throughout, because a foursome routinely
 * arrives in twos and pays separately.
 */
export function BookingDetail({ bookingId, initialTab = 0 }: { bookingId: string; initialTab?: number }) {
  const { state, dispatch } = usePos();
  const [tab, setTab] = useState(initialTab);
  const roster = useGolferRoster();
  const b = state.bookings.find((x) => x.id === bookingId);

  if (!b) return null;
  const course = state.courses.find((c) => c.id === b.course);
  const member = findMemberByPhone(b.phone, roster);

  const TABS = ['Details', 'Players & Status', 'Financial', 'Group Notes', 'Activity'];

  return (
    <ModalFrame
      tall
      width={620}
      title={b.name}
      subtitle={`${formatTimeLabel(b.timeMin)} · ${course?.name ?? b.course} · ${b.conf}`}
      icon="golf_course"
      actions={
        <>
          <OutlineButton
            destructive
            onClick={() =>
              dispatch({
                type: 'openModal',
                modal: {
                  kind: 'confirm',
                  title: 'Delete this booking?',
                  body: `${b.name} · ${formatTimeLabel(b.timeMin)} · ${course?.name}. The slot is released and this cannot be undone.`,
                  confirmLabel: 'Delete booking',
                  onConfirm: `deleteBooking:${b.id}`,
                },
              })
            }
          >
            Delete
          </OutlineButton>
          <Box sx={{ flex: 1 }} />
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Close</OutlineButton>
          <FilledButton onClick={() => dispatch({ type: 'loadBooking', bookingId: b.id })}>
            Load into register
          </FilledButton>
        </>
      }
    >
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
        {member && <MemberDot memberType={member.memberType} />}
        <PayBadge pay={b.pay} />
        {b.holes && (
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant }}>
            {b.holes}
          </Typography>
        )}
        <Typography sx={{ fontSize: 11, color: md3.outline }}>{b.phone}</Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        sx={{ borderBottom: `1px solid ${md3.outlineVariant}`, mb: 2, minHeight: 38 }}
      >
        {TABS.map((t) => (
          <Tab key={t} label={t} sx={{ minHeight: 38, py: 0 }} />
        ))}
      </Tabs>

      {tab === 0 && <DetailsTab booking={b} />}
      {tab === 1 && <PlayersTab booking={b} />}
      {tab === 2 && <BookingFinancial booking={b} />}
      {tab === 3 && <BookingNotes booking={b} />}
      {tab === 4 && <BookingActivity booking={b} />}
    </ModalFrame>
  );
}

// ─── Details ────────────────────────────────────────────────────────────────

function DetailsTab({ booking: b }: { booking: Booking }) {
  const { state, dispatch, toast } = usePos();
  const course = state.courses.find((c) => c.id === b.course);
  const member = findMemberByPhone(b.phone, useGolferRoster());
  const dateStr = state.currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const rows: Array<[string, React.ReactNode]> = [
    ['Confirmation', b.conf],
    ['Date', dateStr],
    ['Tee time', formatTimeLabel(b.timeMin)],
    ['Course', course?.name ?? b.course],
    ['Holes', b.holes || '—'],
    ['Players', `${b.players}`],
    ['Transport', TRANSPORT_META[b.cart]?.label ?? b.cart],
    ['Phone', b.phone || '—'],
    ['Rate', b.price ? money(b.price) : `Member · ${moneyShort(0)}`],
    [
      'Membership',
      member ? (
        // Keyed because this element sits inside the `rows` array literal, not a map.
        <Stack key="membership" direction="row" alignItems="center" gap={0.5}>
          <MemberDot memberType={member.memberType} size={7} />
          {member.name} · HCP {member.hcp}
        </Stack>
      ) : (
        'Guest'
      ),
    ],
  ];

  return (
    <>
      <ModalSection title="Reservation">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            columnGap: 2,
            rowGap: 0.875,
            fontSize: 12.5,
          }}
        >
          {rows.map(([k, v]) => (
            <Box key={k} sx={{ display: 'contents' }}>
              <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>{k}</Typography>
              <Box sx={{ fontWeight: 600, fontSize: 12.5 }}>{v}</Box>
            </Box>
          ))}
        </Box>
      </ModalSection>

      <ModalSection title="Transport" hint="Applies to the whole group">
        <PillGroup
          value={b.cart}
          options={[
            { label: 'Walking', value: 'walking' as const },
            { label: 'Riding cart', value: 'cart' as const },
            { label: 'Push cart', value: 'push' as const },
          ]}
          onChange={(v) => {
            dispatch({ type: 'patchBooking', bookingId: b.id, patch: { cart: v } });
            toast(`Transport set to ${TRANSPORT_META[v]?.label}`);
          }}
        />
      </ModalSection>

      {b.note && (
        <ModalSection title="Reservation note">
          <Callout tone="warning" icon="sticky_note_2">
            {b.note}
          </Callout>
        </ModalSection>
      )}
    </>
  );
}

// ─── Players & status ───────────────────────────────────────────────────────

/**
 * Per-player check-in and payment.
 *
 * The progress rail is clickable at every step, not just the next one — staff
 * routinely correct a mis-tap or jump a group straight to Finished after the fact,
 * so forcing a linear walk would be worse than allowing the jump.
 *
 * The rail's five dots are `ROUND_STEPS` (Not Arrived → Checked In → Teed Off → At Turn →
 * Finished), shared with the phone, so a value reads the same on both. Tapping Not
 * Arrived un-checks a player in (step -1).
 */
function PlayersTab({ booking: b }: { booking: Booking }) {
  const { dispatch, toast } = usePos();
  const states = b.playerStates ?? [];

  const paid = states.filter((p) => p.paid && !p.noShow).length;
  const unpaid = states.filter((p) => !p.paid && !p.noShow).length;
  const noShow = states.filter((p) => p.noShow).length;
  const checkedIn = states.filter((p) => p.step >= 0 && !p.noShow).length;

  const patchPlayer = (idx: number, patch: Partial<(typeof states)[number]>) =>
    dispatch({
      type: 'patchBooking',
      bookingId: b.id,
      patch: { playerStates: states.map((p, i) => (i === idx ? { ...p, ...patch } : p)) },
    });

  const patchStates = (playerStates: typeof states, msg: string) => {
    dispatch({ type: 'patchBooking', bookingId: b.id, patch: { playerStates } });
    toast(msg);
  };
  const patchAll = (patch: Partial<(typeof states)[number]>, msg: string) =>
    patchStates(states.map((p) => ({ ...p, ...patch })), msg);
  // Check-in never moves anyone backwards: a player already out on the course keeps their step.
  const checkInAll = () => patchStates(states.map(checkInPlayer), 'All checked in');

  return (
    <>
      <Stack direction="row" gap={0.75} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Summary label="Checked in" value={`${checkedIn}/${b.players}`} color={md3.primary} />
        <Summary label="Paid" value={`${paid}`} color="#16a34a" />
        {unpaid > 0 && <Summary label="Unpaid" value={`${unpaid}`} color={md3.error} />}
        {noShow > 0 && <Summary label="No-show" value={`${noShow}`} color={md3.outline} />}
      </Stack>

      <Stack direction="row" gap={0.75} sx={{ mb: 2.25, flexWrap: 'wrap' }}>
        <OutlineButton onClick={() => checkInAll()}>
          Check in all
        </OutlineButton>
        <OutlineButton onClick={() => patchAll({ paid: true }, 'All marked paid')}>
          Mark all paid
        </OutlineButton>
        <OutlineButton onClick={() => patchAll({ step: ROUND_STEP.finished }, 'Round complete')}>
          Mark finished
        </OutlineButton>
      </Stack>

      <Stack gap={1.25}>
        {states.map((p, i) => {
          const name = i === 0 ? b.name : b.guests?.[i]?.name || `Guest ${i + 1}`;
          const accent = playerAccents[i % playerAccents.length];
          const initials = name
            .split(/[,\s]+/)
            .filter(Boolean)
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <Box
              key={i}
              sx={{
                bgcolor: md3.surfaceContainer,
                borderRadius: `${radius.md}px`,
                p: '13px 14px',
                borderLeft: `3px solid ${accent}`,
                opacity: p.noShow ? 0.6 : 1,
              }}
            >
              <Stack direction="row" alignItems="center" gap={1.25}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    bgcolor: accent,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <MemberDot name={name} size={7} />
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{name}</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>
                    {p.noShow ? 'No-show' : roundStepOf(p).railLabel}
                  </Typography>
                </Box>
                <ButtonBase
                  onClick={() => patchPlayer(i, { paid: !p.paid })}
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    borderRadius: `${radius.xl}px`,
                    border: `1.5px solid ${p.paid ? '#16a34a' : md3.outlineVariant}`,
                    bgcolor: p.paid ? '#dcfce7' : '#fff',
                    color: p.paid ? '#16a34a' : md3.onSurfaceVariant,
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {p.paid ? 'PAID' : 'UNPAID'}
                </ButtonBase>
                <ButtonBase
                  onClick={() => patchPlayer(i, { noShow: !p.noShow, step: -1 })}
                  title={p.noShow ? 'Undo no-show' : 'Mark no-show'}
                  sx={{ p: 0.5, borderRadius: '50%', color: p.noShow ? md3.error : md3.outline }}
                >
                  <Icon name="person_off" size={16} />
                </ButtonBase>
              </Stack>

              {!p.noShow && <RoundRail state={p} onStep={(step) => patchPlayer(i, { step })} />}
            </Box>
          );
        })}
      </Stack>
    </>
  );
}

function Summary({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.625}
      sx={{
        px: 1.25,
        py: 0.625,
        borderRadius: `${radius.xl}px`,
        bgcolor: `${color}1a`,
        color,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      <Box component="span" sx={{ fontSize: 13, fontWeight: 800 }}>
        {value}
      </Box>
      {label}
    </Stack>
  );
}

