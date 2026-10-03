import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { leagueById } from '../../data/leagues';
import { useV1V2 } from '../../edition';
import { leagueCounts } from '../../state/league';
import { usePos } from '../../state/PosProvider';
import type { Booking } from '../../types';
import { Icon } from '../primitives';
import { TouchButton } from '../Touch';
import { Stack } from '../Stack';

/**
 * The way into the League view (V1 → V2, 100226), on a league tee time's reservation panel.
 *
 * The tee time still opens on its own, as every reservation does — the normal per-tee-time flow
 * stays the default. This card says it belongs to a league and puts the whole league one tap away.
 * Renders nothing outside V1 → V2 and on any booking that is not one of a league's tee times.
 */
export function LeagueWayIn({ booking: b }: { booking: Booking }) {
  const { state, dispatch } = usePos();
  const v1v2 = useV1V2();
  const l = leagueById(b.groupId);
  if (!v1v2 || !l || l.venueId !== state.venueId) return null;
  const c = leagueCounts(state, l);
  const teeTimes = l.teeTimes.length;
  return (
    <Stack
      data-league-entry={l.groupId}
      direction="row"
      alignItems="center"
      gap={1.5}
      sx={{ p: 1.5, mb: 1.5, borderRadius: `${radius.md}px`, bgcolor: '#f5f3ff', border: '1px solid #ddd6fe' }}
    >
      <Icon name="groups" size={26} color="#6d28d9" />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: '#4c1d95' }}>
          Part of {l.name} · {l.roster.length} golfers on {teeTimes} tee times
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: '#5b21b6' }}>
          This tee time still opens on its own. To check in and pay the whole league from one screen, open League view
          {l.roster.length - c.placed > 0 ? ` — ${l.roster.length - c.placed} still to place.` : '.'}
        </Typography>
      </Box>
      <TouchButton tone="filled" icon="groups" onClick={() => dispatch({ type: 'openLeague', groupId: l.groupId })}>
        League view
      </TouchButton>
    </Stack>
  );
}

/**
 * The register's way back to the League view, after an **Extra** took a golfer's seat there — like
 * the rail's way back to a reservation (`ReturnToReservation`). Shown only on that route.
 */
export function ReturnToLeague() {
  const { state, dispatch } = usePos();
  const v1v2 = useV1V2();
  const l = leagueById(state.returnToLeague);
  if (!v1v2 || !l) return null;
  return (
    <ButtonBase
      data-return-to-league={l.groupId}
      aria-label={`Back to ${l.name}`}
      onClick={() => dispatch({ type: 'backToLeague' })}
      sx={{
        width: '100%',
        gap: 0.75,
        px: 1.75,
        py: 1.125,
        justifyContent: 'flex-start',
        flexShrink: 0,
        bgcolor: '#ede9fe',
        color: '#4c1d95',
        fontSize: 12.5,
        fontWeight: 700,
        borderBottom: `1px solid ${md3.outlineVariant}`,
      }}
    >
      <Icon name="arrow_back" size={16} />
      Back to {l.name}
    </ButtonBase>
  );
}
