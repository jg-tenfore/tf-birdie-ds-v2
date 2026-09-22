import { useMemo, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, memberTypes, playerAccents, radius } from '../../theme/tokens';
import { formatTimeLabel } from '../data/courses';
import { assignPlayer, playerName } from '../logic/reservation';
import { customerVisits, seatCustomer, seatIdMe, seatSuggestion } from '../logic/seat-customer';
import { useGolferRoster, usePos } from '../state/PosProvider';
import type { Booking, Golfer } from '../types';
import { Field, ModalSection, OutlineButton, ResultList, ResultRow } from '../modals/ModalFrame';
import { IdMeBadge } from './IdMeBadge';
import { Icon, MemberDot, PayBadge } from './primitives';
import { Stack } from './Stack';

/**
 * The selected player's customer record (Weston Edits · Customer tab).
 *
 * "Open their customer profile" was one of the three things Weston wanted from the
 * reservation, and it belongs to a *player*, not to the booking — the booker's profile says
 * nothing about their guests. So the tab follows the panel's selected seat, and a seat with
 * no record offers a roster search to link one instead of an empty page.
 */
export function CustomerTab({ booking: b, playerIndex }: { booking: Booking; playerIndex: number }) {
  const { state, dispatch } = usePos();
  const roster = useGolferRoster();
  const i = Math.min(playerIndex, b.players - 1);
  const customer = seatCustomer(b, i, roster);
  const [searching, setSearching] = useState(false);

  const select = (p: number) => {
    setSearching(false);
    dispatch({ type: 'selectReservationPlayer', playerIndex: p });
  };

  return (
    <Box>
      {/* ── Whose profile ── */}
      <Stack direction="row" gap={0.75} sx={{ mb: 2, flexWrap: 'wrap' }}>
        {Array.from({ length: b.players }, (_, p) => {
          const on = p === i;
          const linked = Boolean(seatCustomer(b, p, roster));
          return (
            <ButtonBase
              key={p}
              onClick={() => select(p)}
              aria-pressed={on}
              sx={{
                gap: 0.625,
                px: 1.25,
                py: 0.625,
                borderRadius: `${radius.xl}px`,
                border: `1.5px solid ${on ? md3.primary : md3.outlineVariant}`,
                bgcolor: on ? md3.primaryContainer : md3.onPrimary,
                color: on ? md3.onPrimaryContainer : md3.onSurfaceVariant,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: playerAccents[p % playerAccents.length] }} />
              {playerName(b, p)}
              {!linked && <Icon name="link" size={13} color={md3.outline} />}
            </ButtonBase>
          );
        })}
      </Stack>

      {customer && !searching ? (
        <CustomerProfile
          customer={customer}
          booking={b}
          index={i}
          visits={customerVisits(state.bookings, customer)}
          onSwap={() => setSearching(true)}
        />
      ) : (
        <LinkCustomer
          booking={b}
          index={i}
          swapping={Boolean(customer)}
          onCancel={customer ? () => setSearching(false) : undefined}
          onLinked={() => setSearching(false)}
        />
      )}
    </Box>
  );
}

// ─── Profile ────────────────────────────────────────────────────────────────

function CustomerProfile({
  customer: g,
  booking: b,
  index: i,
  visits,
  onSwap,
}: {
  customer: Golfer;
  booking: Booking;
  index: number;
  visits: Booking[];
  onSwap: () => void;
}) {
  const roster = useGolferRoster();
  const tier = g.memberType ? memberTypes[g.memberType] : null;
  const idMe = seatIdMe(b, i, roster);
  const joined = g.joined
    ? new Date(`${g.joined}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  return (
    <>
      <Box sx={{ p: '14px 16px', bgcolor: md3.surfaceContainer, borderRadius: `${radius.md}px`, mb: 2 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <MemberDot memberType={g.memberType} size={9} />
          <Typography sx={{ fontSize: 17, fontWeight: 800, flex: 1 }}>{g.name}</Typography>
          <OutlineButton onClick={onSwap}>Swap</OutlineButton>
        </Stack>
        <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 1, flexWrap: 'wrap' }}>
          <Box
            component="span"
            sx={{
              px: 1,
              py: 0.375,
              borderRadius: `${radius.xl}px`,
              bgcolor: tier?.bg ?? md3.surfaceHigh,
              color: tier?.color ?? md3.onSurfaceVariant,
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {tier?.label ?? 'Guest'}
          </Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>HCP {g.hcp}</Typography>
          {joined && <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>· Member since {joined}</Typography>}
          {idMe && <IdMeBadge group={idMe} />}
        </Stack>
      </Box>

      <ModalSection title="Contact">
        <Stack gap={0.75}>
          <ContactRow icon="phone" value={g.phone} />
          <ContactRow icon="mail" value={g.email || '—'} />
          <ContactRow icon="label" value={`Customer ${g.id}`} />
        </Stack>
      </ModalSection>

      {g.notes && (
        <ModalSection title="Notes">
          <Typography sx={{ fontSize: 12.5, lineHeight: 1.45 }}>{g.notes}</Typography>
        </ModalSection>
      )}

      <ModalSection title="Visits" hint={`${visits.length} in the last 11 days`}>
        {visits.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: md3.outline }}>No other tee times on file.</Typography>
        ) : (
          <Stack gap={0.5}>
            {visits.slice(0, 6).map((v) => (
              <Stack
                key={v.id}
                direction="row"
                alignItems="center"
                gap={1}
                sx={{
                  p: '7px 10px',
                  borderRadius: `${radius.sm}px`,
                  bgcolor: v.id === b.id ? md3.primaryContainer : md3.surfaceContainer,
                  fontSize: 12,
                }}
              >
                <Box sx={{ fontWeight: 700, width: 92 }}>
                  {new Date(`${v.date}T12:00:00`).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Box>
                <Box sx={{ color: md3.onSurfaceVariant, flex: 1 }}>
                  {formatTimeLabel(v.timeMin)} · {v.holes || '—'} · {v.players}P
                  {v.id === b.id ? ' · this booking' : ''}
                </Box>
                <PayBadge pay={v.pay} size="sm" />
              </Stack>
            ))}
          </Stack>
        )}
      </ModalSection>
    </>
  );
}

function ContactRow({ icon, value }: { icon: string; value: string }) {
  return (
    <Stack direction="row" alignItems="center" gap={1} sx={{ fontSize: 12.5 }}>
      <Icon name={icon} size={15} color={md3.onSurfaceVariant} />
      <span>{value}</span>
    </Stack>
  );
}

// ─── Link / swap ────────────────────────────────────────────────────────────

/**
 * Search the roster and put the pick on this seat — naming an unnamed guest, or swapping
 * one player for another. Uses the same roster and matching as Find Golfer.
 */
function LinkCustomer({
  booking: b,
  index: i,
  swapping,
  onCancel,
  onLinked,
}: {
  booking: Booking;
  index: number;
  swapping: boolean;
  onCancel?: () => void;
  onLinked: () => void;
}) {
  const { dispatch, toast } = usePos();
  const roster = useGolferRoster();
  const [query, setQuery] = useState('');
  const onBooking = new Set(
    Array.from({ length: b.players }, (_, p) => seatCustomer(b, p, roster)?.id).filter(Boolean),
  );
  // A record the seat's name looks like — offered, never applied. Only linking it makes the
  // seat that customer (and, for a member, puts it on the membership rate).
  const suggested = swapping ? undefined : seatSuggestion(b, i, roster);
  const suggestionFree = suggested && !onBooking.has(suggested.id);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? roster.filter((g) => g.name.toLowerCase().includes(q) || g.phone.includes(q)) : roster;
    return pool.slice(0, 30);
  }, [query, roster]);

  const choose = (g: Golfer) => {
    dispatch({ type: 'patchBooking', bookingId: b.id, patch: assignPlayer(b, i, g) });
    toast(`${g.name} · ${swapping ? 'swapped onto' : 'linked to'} seat ${i + 1}`);
    onLinked();
  };

  return (
    <>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.25 }}>
        <Icon name="link" size={18} color={md3.primary} />
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>
          {swapping ? `Swap ${playerName(b, i)} for…` : `No customer linked to ${playerName(b, i)}`}
        </Typography>
        {onCancel && <OutlineButton onClick={onCancel}>Cancel</OutlineButton>}
      </Stack>
      {suggestionFree && (
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          data-testid="customer-suggestion"
          sx={{ p: '10px 12px', mb: 1.25, borderRadius: `${radius.md}px`, border: `1px dashed ${md3.outlineVariant}`, bgcolor: md3.surfaceContainer }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Suggested profile · not linked
            </Typography>
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.25 }}>
              <MemberDot memberType={suggested.memberType} size={7} />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{suggested.name}</Typography>
              <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
                · {suggested.memberType ? memberTypes[suggested.memberType].label : 'Guest'} · {suggested.phone}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 11.5, color: md3.outline, mt: 0.25 }}>
              Matched by name only — priced at the booking's rate until linked.
            </Typography>
          </Box>
          <OutlineButton onClick={() => choose(suggested)}>Link</OutlineButton>
        </Stack>
      )}
      <Field value={query} onChange={setQuery} placeholder="Search name or phone…" />
      <Box sx={{ mt: 1.25 }}>
        <ResultList maxHeight={380}>
          {results.map((g) => {
            const tier = g.memberType ? memberTypes[g.memberType] : null;
            const taken = onBooking.has(g.id);
            return (
              <ResultRow
                key={g.id}
                disabled={taken}
                primary={
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <MemberDot memberType={g.memberType} size={7} />
                    {g.name}
                  </Stack>
                }
                secondary={taken ? 'Already on this booking' : `${g.phone} · HCP ${g.hcp}`}
                badge={tier?.label ?? 'Guest'}
                badgeColor={tier?.color}
                badgeBg={tier?.bg}
                onClick={() => choose(g)}
              />
            );
          })}
        </ResultList>
      </Box>
      <Box sx={{ mt: 1.25 }}>
        <OutlineButton onClick={() => dispatch({ type: 'openModal', modal: { kind: 'newCustomer' } })}>
          New customer
        </OutlineButton>
      </Box>
    </>
  );
}
