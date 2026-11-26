import { useState } from 'react';
import { Box, Button, ButtonBase, TextField, Typography } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import { md3, mobile } from '../../../../theme/tokens';
import { formatTimeLabel } from '../../../data/courses';
import { serversOf } from '../../../data/staff';
import { choiceItem, tableChoicesNow } from '../../../logic/dining';
import { openTabOn, tableLabel, upcomingReservationFor } from '../../../logic/restaurant';
import { tabById, tableOf } from '../../../state/restaurant';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { useLiveFloor } from '../../../components/restaurant/use-live-floor';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { Callout } from '../register/parts';
import { Pill, Stepper } from './parts';
import { nextTabId } from './restaurant-helpers';

/**
 * Seat a walk-in at a table, or open a tab with no table (V1 → V2, handheld) — the tablet's
 * `OpenTabDialog`, as a full-screen dialog.
 *
 * It asks the two things that matter — **how many** and **who is serving** — defaulting to two
 * guests and the signed-in operator, so the common case is still one tap. What the host is taking
 * on is said before they commit: a table **held** for a reservation is still offered, and the
 * button says *Seat anyway*; a table that **already has a tab** offers that tab instead (the store
 * would do the same, silently); one **out of service** is refused.
 *
 * Without a table (Tabs › New tab) a name is asked for and a table is optional — a bar tab or a
 * league's running tab has none — and the tables are listed the tablet's way (`tableChoicesNow`):
 * held and short tables warn, occupied ones can't be chosen.
 */
export function OpenTabScreen({ route }: ScreenProps<'openTab'>) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const ctx = useLiveFloor();
  const fixed = route.tableId ? tableOf(state, route.tableId)?.table : undefined;
  const [tableId, setTableId] = useState<string | null>(route.tableId ?? null);
  const [guests, setGuests] = useState(Math.min(2, fixed?.seats ?? 2));
  const [serverId, setServerId] = useState(state.operatorId);
  const [name, setName] = useState('');

  const table = tableId ? tableOf(state, tableId)?.table : undefined;
  const existing = table ? openTabOn(table.id, ctx.tabs) : undefined;
  const held = table ? upcomingReservationFor(table.id, ctx) : undefined;
  const blocked = Boolean(table?.outOfService);
  const servers = serversOf(state.staffRoster);
  const choices = route.tableId ? [] : tableChoicesNow(guests, state.floor, ctx).map(choiceItem);

  const open = () => {
    if (existing || blocked) return;
    const tabId = nextTabId(state);
    dispatch({ type: 'openTab', tableId: table?.id, guests, serverId, name: name.trim() || undefined });
    nav.replace({ name: 'tab', tabId });
  };

  const title = fixed ? `Seat ${tableLabel(fixed)}` : 'New tab';
  const confirmLabel = held && !existing ? 'Seat anyway' : fixed ? 'Seat' : 'Open';

  return (
    <MobileScreen
      topBar={<DialogTopBar title={title} confirmLabel={confirmLabel} onConfirm={open} confirmDisabled={Boolean(existing) || blocked} />}
    >
      <Box sx={{ px: 2, pt: 1, pb: 4 }} data-open-tab={tableId ?? 'none'}>
        {existing && tabById(state, existing.id) && (
          <Box sx={{ mb: 2 }}>
            <Callout tone="info">
              {tableLabel(table)} already has a tab open: {existing.name}.
            </Callout>
            <Button
              variant="contained"
              fullWidth
              size="large"
              sx={{ mt: 1 }}
              onClick={() => nav.replace({ name: 'tab', tabId: existing.id })}
            >
              Open {existing.name}
            </Button>
          </Box>
        )}
        {blocked && (
          <Box sx={{ mb: 2 }}>
            <Callout tone="warning">{tableLabel(table)} is out of service. Put it back in service from Tables first.</Callout>
          </Box>
        )}
        {held && !existing && (
          <Box sx={{ mb: 2 }} data-held-warning>
            <Callout tone="warning" icon={<WarningAmberRounded fontSize="small" />}>
              Held for {held.name}, party of {held.partySize}, at {formatTimeLabel(held.timeMin)}. Seating a walk-in here takes their table.
            </Callout>
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ color: md3.primary, mb: 1 }}>
          Guests
        </Typography>
        <Stepper label="Guests" value={guests} onChange={setGuests} unit={(n) => `${n} guest${n === 1 ? '' : 's'}`} />
        {table && (table.seats ?? 0) < guests && (
          <Typography variant="body2" sx={{ color: '#92400e', mt: 1 }}>
            {tableLabel(table)} seats {table.seats}. Pull up a chair, or choose a bigger table.
          </Typography>
        )}

        <Typography variant="subtitle2" sx={{ color: md3.primary, mt: 3, mb: 1 }}>
          Server
        </Typography>
        <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
          {servers.map((s) => (
            <Pill key={s.id} label={s.short} active={s.id === serverId} onClick={() => setServerId(s.id)} />
          ))}
        </Stack>

        {!route.tableId && (
          <>
            <TextField
              label="Tab name"
              placeholder="Bar · Scott, Men’s league…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              sx={{ mt: 3 }}
            />
            <Typography variant="subtitle2" sx={{ color: md3.primary, mt: 3, mb: 0.5 }}>
              Table
            </Typography>
            <TableChoice
              label="No table"
              note="A bar tab, or a group’s running tab"
              on={tableId === null}
              onClick={() => setTableId(null)}
            />
            {choices.map((c) => (
              <TableChoice
                key={c.table.id}
                label={`${tableLabel(c.table)} · ${c.room.name}`}
                note={c.note ?? `Seats ${c.table.seats ?? 0}`}
                warn={c.warn}
                disabled={c.disabled}
                on={tableId === c.table.id}
                onClick={() => setTableId(c.table.id)}
              />
            ))}
          </>
        )}
      </Box>
    </MobileScreen>
  );
}

/** One table in a list of tables to choose from — used to open, move and seat. */
export function TableChoice({
  label,
  note,
  warn,
  disabled,
  on,
  onClick,
}: {
  label: string;
  note?: string;
  warn?: boolean;
  disabled?: boolean;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      role="radio"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      data-table-choice={label}
      sx={{
        width: '100%',
        minHeight: mobile.listItem.two,
        gap: 2,
        px: 0.5,
        justifyContent: 'flex-start',
        textAlign: 'left',
        borderBottom: `1px solid ${md3.outlineVariant}`,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {on ? (
        <CheckCircle sx={{ color: md3.primary }} />
      ) : (
        <Box sx={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${md3.outline}`, flexShrink: 0 }} />
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body1">{label}</Typography>
        {note && (
          <Typography variant="body2" sx={{ color: warn ? '#92400e' : md3.onSurfaceVariant }}>
            {note}
          </Typography>
        )}
      </Box>
    </ButtonBase>
  );
}
