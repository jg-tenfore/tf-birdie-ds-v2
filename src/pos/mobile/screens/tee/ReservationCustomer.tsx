import { useMemo } from 'react';
import { Box, Button, ButtonBase, Divider, Typography } from '@mui/material';
import CallOutlined from '@mui/icons-material/CallOutlined';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import NotesOutlined from '@mui/icons-material/NotesOutlined';
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import { md3, memberTypes, mobile, radius } from '../../../../theme/tokens';
import { idMeGroupOf } from '../../../data/golfers';
import { toDateStr } from '../../../data/courses';
import { Stack } from '../../../components/Stack';
import { useGolferRoster, usePos } from '../../../state/PosProvider';
import type { Booking } from '../../../types';
import { useMobileNav } from '../../navigation';
import { InfoItem, SectionTitle, Stat } from '../people/GolferDetailScreen';
import { GolferAvatar, TierChip } from '../people/parts';
import { bookingsFor, displayName } from '../people/people-utils';
import { Callout, IdMeBadge, PlayerAvatar } from './parts';
import { seatSuggestion } from '../../../logic/seat-customer';
import { assignPlayer } from '../../../logic/reservation';
import { playerName, seatGolfer } from './tee-helpers';

/**
 * The reservation's Customer tab (Weston Edits): the selected player's profile, without
 * leaving the booking.
 *
 * Weston wanted to "open their customer profile" from the reservation. On the tablet that's
 * a tab in the slide-over; on the phone it's a tab on the reservation screen, with a player
 * picker across the top because a phone shows one profile at a time. The player lives in the
 * route (`route.player`) like the tab does, so switching is a replace — Back still leaves
 * the booking. "Open full profile" pushes People's Golfer Detail over the reservation for
 * the full history; Back returns here.
 */
export function ReservationCustomerTab({ booking: b, player = 0 }: { booking: Booking; player?: number }) {
  const nav = useMobileNav();
  const { state, dispatch } = usePos();
  const roster = useGolferRoster();
  const i = Math.min(Math.max(0, player), b.players - 1);
  const golfer = seatGolfer(b, i, roster);
  // A record the seat's name looks like — offered with a Link action, never applied: only
  // linking it makes the seat that customer (and a member's seat free).
  const suggested = golfer ? undefined : seatSuggestion(b, i, roster);
  const suggestionFree =
    suggested && !Array.from({ length: b.players }, (_, k) => seatGolfer(b, k, roster)?.id).includes(suggested.id);
  const idMe = idMeGroupOf(golfer?.id);
  const name = playerName(b, i);

  const today = toDateStr(state.currentDate);
  const upcoming = useMemo(
    () => (golfer ? bookingsFor(golfer, state.bookings).filter((x) => x.date >= today && x.id !== b.id).length : 0),
    [golfer, state.bookings, today, b.id],
  );
  const pick = () => nav.push({ name: 'golferPicker', target: { bookingId: b.id, playerIndex: i } });

  return (
    <Box sx={{ pb: 3 }}>
      {/* Whose profile — one chip per player, avatar + first name. */}
      <Stack direction="row" gap={1} role="tablist" aria-label="Player" sx={{ px: 2, pt: 2, pb: 1, overflowX: 'auto' }}>
        {Array.from({ length: b.players }, (_, k) => {
          const on = k === i;
          const n = playerName(b, k);
          return (
            <ButtonBase
              key={k}
              role="tab"
              aria-selected={on}
              onClick={() => nav.replace({ name: 'bookingDetail', bookingId: b.id, tab: 'customer', player: k })}
              sx={{
                flexShrink: 0,
                gap: 0.75,
                height: 40,
                pl: 0.5,
                pr: 1.5,
                borderRadius: 20,
                border: `1px solid ${on ? 'transparent' : md3.outlineVariant}`,
                bgcolor: on ? mobile.secondaryContainer : 'transparent',
                color: on ? mobile.onSecondaryContainer : md3.onSurfaceVariant,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <PlayerAvatar name={n} index={k} size={30} />
              {displayName(n).split(' ')[0]}
            </ButtonBase>
          );
        })}
      </Stack>

      {golfer ? (
        <>
          <Stack alignItems="center" gap={0.75} sx={{ px: 2, pt: 1.5, pb: 2, textAlign: 'center' }}>
            <GolferAvatar golfer={golfer} size={72} />
            <Typography variant="h5" sx={{ mt: 0.5 }}>
              {displayName(golfer.name)}
            </Typography>
            <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap" justifyContent="center">
              <TierChip memberType={golfer.memberType} />
              {idMe && <IdMeBadge group={idMe} />}
            </Stack>
            <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
              Player {i + 1}
              {i === 0 ? ' · booker' : ''} · #{golfer.id}
            </Typography>
          </Stack>

          <Stack direction="row" sx={{ mx: 2, borderRadius: `${radius.md}px`, bgcolor: mobile.surfaceContainerLow, border: `1px solid ${md3.outlineVariant}` }}>
            <Stat label="Handicap" value={String(golfer.hcp)} />
            <Divider orientation="vertical" flexItem />
            <Stat label="Upcoming" value={String(upcoming)} />
            <Divider orientation="vertical" flexItem />
            <Stat label="Type" value={golfer.memberType ? memberTypes[golfer.memberType].label.replace(' Member', '') : 'Guest'} />
          </Stack>

          <SectionTitle>Contact</SectionTitle>
          <InfoItem icon={<CallOutlined />} primary={golfer.phone} secondary="Mobile" />
          <InfoItem icon={<EmailOutlined />} primary={golfer.email || '—'} secondary="Email" />
          <InfoItem icon={<NotesOutlined />} primary={golfer.notes || 'No notes'} secondary="Notes" muted={!golfer.notes} />

          <Stack direction="row" gap={1} sx={{ px: 2, pt: 2 }}>
            <Button variant="outlined" startIcon={<SwapHoriz />} onClick={pick} sx={{ flex: 1 }}>
              Swap
            </Button>
            <Button variant="contained" disableElevation onClick={() => nav.push({ name: 'golferDetail', golferId: golfer.id })} sx={{ flex: 2 }}>
              Open full profile
            </Button>
          </Stack>
        </>
      ) : (
        <Box sx={{ px: 2, pt: 2 }}>
          <Stack alignItems="center" gap={1} sx={{ pb: 2, textAlign: 'center' }}>
            <PlayerAvatar name={name} index={i} size={72} />
            <Typography variant="h5">{name}</Typography>
            <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
              Player {i + 1} · not linked to a customer
            </Typography>
          </Stack>
          {suggestionFree && (
            <Stack
              direction="row"
              alignItems="center"
              gap={1.5}
              data-testid="customer-suggestion"
              sx={{ p: 1.5, mb: 2, borderRadius: `${radius.md}px`, border: `1px dashed ${md3.outlineVariant}`, bgcolor: mobile.surfaceContainerLow }}
            >
              <GolferAvatar golfer={suggested} size={40} />
              <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <Typography variant="caption" sx={{ color: md3.onSurfaceVariant }}>
                  Suggested profile · not linked
                </Typography>
                <Typography variant="subtitle2">{displayName(suggested.name)}</Typography>
                <Typography variant="caption" sx={{ color: md3.outline, display: 'block' }}>
                  Matched by name only — priced at the booking's rate until linked.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={() => dispatch({ type: 'patchBooking', bookingId: b.id, patch: assignPlayer(b, i, suggested) })}
              >
                Link
              </Button>
            </Stack>
          )}
          <Callout tone="info" icon="info">
            Link this player to a customer record to see their membership, ID.me status and history — and to put their name on the order.
          </Callout>
          <Button variant="contained" disableElevation fullWidth startIcon={<PersonSearchOutlined />} onClick={pick} sx={{ mt: 2 }}>
            Link a customer
          </Button>
        </Box>
      )}
    </Box>
  );
}
