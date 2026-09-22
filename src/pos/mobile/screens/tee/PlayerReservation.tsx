import { useState } from 'react';
import { Box, Button, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { md3 } from '../../../../theme/tokens';
import { money } from '../../../logic/cart';
import {
  holesFee,
  isEditableSeat,
  playerFee,
  playerHoles,
  playerIsAdjusted,
  playerTransport,
  removePlayer,
  resetPlayer,
  setPlayerHoles,
  setPlayerTransport,
} from '../../../logic/reservation';
import { Icon } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import { useGolferRoster, usePos } from '../../../state/PosProvider';
import type { Booking, Transport } from '../../../types';
import { BottomSheet } from '../../chrome';
import { useMobileNav } from '../../navigation';
import { Callout, SectionHeader, Segmented } from './parts';
import { FeeSheet } from './ReservationPlayers';
import { TRANSPORTS, useRates, useReservationLimits } from './reservation-helpers';
import { playerName, seatGolfer, useBooking } from './tee-helpers';

/**
 * Player Detail's Reservation section (Weston Edits) — the full-size version of the
 * controls on a player row: holes as a full-width segmented button, the tee fee with its
 * default spelled out, transport, and the customer on the seat. Removing a player lives
 * here too, behind a confirmation sheet, because it's the one edit that can't be undone
 * by tapping the same control again.
 */
export function ReservationSection({ bookingId, index: i }: { bookingId: string; index: number }) {
  const { dispatch, toast } = usePos();
  const nav = useMobileNav();
  const roster = useGolferRoster();
  const { booking: b } = useBooking(bookingId);
  const { is18 } = useReservationLimits(b);
  const [sheet, setSheet] = useState<null | 'fee' | 'remove'>(null);
  const rates = useRates();
  if (!b) return null;

  const p = b.playerStates[i];
  const editable = isEditableSeat(p) && b.pay !== 'refund' && b.pay !== 'no_show';
  const name = playerName(b, i);
  const holes = playerHoles(b, i);
  const fee = playerFee(b, i, rates);
  const def = holesFee(b, i, holes, rates);
  const golfer = seatGolfer(b, i, roster);
  const patch = (next: Partial<Booking>, msg: string) => {
    dispatch({ type: 'patchBooking', bookingId: b.id, patch: next });
    toast(msg);
  };

  return (
    <>
      <SectionHeader
        action={
          editable &&
          playerIsAdjusted(b, i) && (
            <Button size="small" onClick={() => patch(resetPlayer(b, i), `${name} · reset to booking`)}>
              Reset
            </Button>
          )
        }
      >
        Reservation
      </SectionHeader>
      {!editable && (
        <Callout tone="info" icon="lock" sx={{ mx: 2, mb: 1 }}>
          {p?.noShow ? 'Marked no-show' : 'Paid'} — holes, fee and transport are locked. Refund from the Financial tab to change them.
        </Callout>
      )}
      <Stack gap={1.5} sx={{ px: 2, pb: 1 }}>
        {is18 && (
          <Segmented<9 | 18>
            ariaLabel="Holes"
            value={holes}
            options={[
              { value: 9, label: '9 holes', disabled: !editable },
              { value: 18, label: '18 holes', disabled: !editable },
            ]}
            onChange={(h) => patch(setPlayerHoles(b, i, h), `${name} · ${h} holes · ${money(holesFee(b, i, h, rates))}`)}
          />
        )}
        <Segmented<Transport>
          ariaLabel="Transport"
          value={playerTransport(b, i)}
          options={TRANSPORTS.map((t) => ({ value: t.value, label: t.label, disabled: !editable }))}
          onChange={(t) => patch(setPlayerTransport(b, i, t), `${name} · ${TRANSPORTS.find((x) => x.value === t)?.long}`)}
        />
      </Stack>
      <List disablePadding>
        <ListItemButton disabled={!editable} onClick={() => setSheet('fee')}>
          <ListItemIcon>
            <Icon name="payments" size={24} color={md3.onSurfaceVariant} />
          </ListItemIcon>
          <ListItemText
            primary={`Tee fee · ${money(fee)}`}
            secondary={fee === def ? `Default for ${holes} holes` : `Adjusted · default ${money(def)} for ${holes} holes`}
          />
          <ChevronRightIcon sx={{ color: md3.onSurfaceVariant }} />
        </ListItemButton>
        <ListItemButton onClick={() => nav.push({ name: 'golferPicker', target: { bookingId: b.id, playerIndex: i } })}>
          <ListItemIcon>
            <Icon name="swap_horiz" size={24} color={md3.onSurfaceVariant} />
          </ListItemIcon>
          <ListItemText primary={golfer ? 'Swap customer' : 'Link a customer'} secondary={golfer ? `Replace ${name} with someone from People` : 'Pick this player from People'} />
          <ChevronRightIcon sx={{ color: md3.onSurfaceVariant }} />
        </ListItemButton>
        {i > 0 && editable && (
          <ListItemButton onClick={() => setSheet('remove')} sx={{ color: md3.error }}>
            <ListItemIcon>
              <Icon name="person_off" size={24} color={md3.error} />
            </ListItemIcon>
            <ListItemText primary="Remove from tee time" secondary="Releases the seat" />
          </ListItemButton>
        )}
      </List>

      {sheet === 'fee' && <FeeSheet booking={b} index={i} onClose={() => setSheet(null)} />}
      <BottomSheet open={sheet === 'remove'} onClose={() => setSheet(null)} title="Remove this player?">
        <Typography variant="body2" sx={{ px: 3, color: md3.onSurfaceVariant }}>
          {name} comes off {b.name}'s tee time and the seat is released. Everyone after moves up.
        </Typography>
        <Stack direction="row" gap={1} sx={{ px: 3, pt: 3 }}>
          <Button variant="outlined" fullWidth onClick={() => setSheet(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disableElevation
            fullWidth
            onClick={() => {
              setSheet(null);
              // Leave first: this screen's seat index is about to point at someone else.
              nav.pop();
              patch(removePlayer(b, i), `${name} removed`);
            }}
          >
            Remove
          </Button>
        </Stack>
      </BottomSheet>
      <Box sx={{ height: 4 }} />
    </>
  );
}
