import { useMemo, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { formatTimeLabel, toDateStr } from '../data/courses';
import { CountStepper } from '../components/restaurant/HostControls';
import { TablePicker } from '../components/restaurant/TablePicker';
import { useLiveFloor } from '../components/restaurant/use-live-floor';
import { Icon } from '../components/primitives';
import { Stack } from '../components/Stack';
import {
  RESERVATION_SLOTS,
  blockerText,
  defaultReservationTime,
  searchGolfers,
  tableBlocker,
  tableOptionsFor,
} from '../logic/dining';
import { tableLabel } from '../logic/restaurant';
import { useGolferRoster, usePos } from '../state/PosProvider';
import { tableOf, type RestaurantModal } from '../state/restaurant';
import type { Golfer } from '../types';
import {
  Callout,
  Field,
  FilledButton,
  ModalFrame,
  ModalSection,
  OutlineButton,
  ResultList,
  ResultRow,
  SelectField,
} from './ModalFrame';

/**
 * Make or change a dining reservation (V1 → V2, Wave 2).
 *
 * ## What v1 did
 *
 * v1's *Add reservation* took a time, a party size, a first and last name, an email and a phone,
 * and nothing else. No table — so nothing on the floor ever knew a party was coming — and no
 * link to the customer, so a member who booked dinner every Friday was a fresh row of typing
 * every Friday.
 *
 * ## What this does
 *
 * The same few fields, plus the two v1 was missing:
 *
 * - **A customer**, optional, found by name or phone in the club's roster right here in the
 *   dialog. Picking one fills the name and phone; the link is what lets seating carry the member
 *   onto their tab. A guest nobody knows is still just a name and a number.
 * - **A table**, optional. Only tables that fit the party are shown, and a table another
 *   reservation has for an overlapping meal (`MEAL_MIN`, 90 minutes) is shown with who has it —
 *   `tableBlocker`. Change the time or the party so the table no longer works and the dialog
 *   says so and will not save, rather than quietly double-booking it.
 *
 * Email is dropped. v1 collected it and did nothing with it; the host's job is a phone call.
 */
export function ReservationDialog({ m }: { m: Extract<RestaurantModal, { kind: 'reservation' }> }) {
  const { state, dispatch, toast } = usePos();
  const ctx = useLiveFloor();
  const roster = useGolferRoster();
  const existing = m.id ? state.diningReservations.find((r) => r.id === m.id) : undefined;
  const startDate = existing?.date ?? m.date ?? toDateStr(state.currentDate);

  const [date, setDate] = useState(startDate);
  const [timeMin, setTimeMin] = useState(existing?.timeMin ?? defaultReservationTime(startDate, ctx.date, ctx.nowMin));
  const [partySize, setPartySize] = useState(existing?.partySize ?? 2);
  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [customerId, setCustomerId] = useState<string | undefined>(existing?.customerId);
  const [note, setNote] = useState(existing?.note ?? '');
  const [tableId, setTableId] = useState<string | null>(existing?.tableId ?? null);
  const [query, setQuery] = useState('');

  const close = () => dispatch({ type: 'closeModal' });
  const customer = customerId ? roster.find((g) => g.id === customerId) : undefined;
  const matches = useMemo(() => searchGolfers(roster, query), [roster, query]);
  const placing = !existing || existing.status === 'booked';

  const slot = { id: existing?.id ?? '__new', date, timeMin, partySize };
  const options = tableOptionsFor(slot, state.floor, ctx);
  const chosen = tableId ? tableOf(state, tableId)?.table : undefined;
  const chosenBlocker = chosen && placing ? tableBlocker(chosen, slot, ctx) : null;

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const canSave = name.trim().length > 0 && validDate && !chosenBlocker;

  const pick = (g: Golfer) => {
    setCustomerId(g.id);
    setName(g.name);
    setPhone(g.phone);
    setQuery('');
  };

  const save = () => {
    const fields = {
      date,
      timeMin,
      partySize,
      name: name.trim(),
      phone: phone.trim() || undefined,
      customerId,
      note: note.trim() || undefined,
      tableId: placing ? (tableId ?? undefined) : existing?.tableId,
    };
    if (existing) {
      dispatch({ type: 'patchReservation', id: existing.id, patch: fields });
      toast(`${fields.name} updated`);
    } else {
      dispatch({ type: 'createReservation', reservation: fields });
      toast(`${fields.name} booked for ${formatTimeLabel(timeMin)}`);
    }
    close();
  };

  const times = RESERVATION_SLOTS.includes(timeMin) ? RESERVATION_SLOTS : [...RESERVATION_SLOTS, timeMin].sort((a, b) => a - b);

  return (
    <ModalFrame
      title={existing ? `Edit ${existing.name}` : 'New reservation'}
      icon="event"
      width={680}
      tall
      onClose={close}
      actions={
        <>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
          <FilledButton onClick={save} disabled={!canSave}>
            {existing ? 'Save' : 'Book'}
          </FilledButton>
        </>
      }
    >
      <Stack gap={2}>
        <Stack direction="row" gap={1.5} alignItems="flex-end">
          <Field label="Date" type="date" value={date} onChange={setDate} />
          <SelectField
            label="Time"
            value={timeMin}
            options={times.map((t) => ({ label: formatTimeLabel(t), value: t }))}
            onChange={setTimeMin}
          />
          <CountStepper label="Party" unit="guests" value={partySize} onChange={setPartySize} max={20} />
        </Stack>

        <ModalSection title="Who" sx={{ mb: 0 }}>
          <Stack gap={1.25}>
            {customer ? (
              <Stack
                direction="row"
                alignItems="center"
                gap={1}
                sx={{ p: '8px 12px', borderRadius: `${radius.md}px`, bgcolor: md3.primaryContainer }}
                data-linked-customer={customer.id}
              >
                <Icon name="person" size={16} color={md3.onPrimaryContainer} />
                <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 700, color: md3.onPrimaryContainer }}>
                  {customer.name} · {customer.type}
                </Typography>
                <ButtonBase
                  onClick={() => setCustomerId(undefined)}
                  sx={{ minHeight: 36, px: 1.25, borderRadius: `${radius.xl}px`, fontSize: 12, fontWeight: 700 }}
                >
                  Unlink
                </ButtonBase>
              </Stack>
            ) : (
              <Box>
                <Field
                  label="Find a customer (optional)"
                  value={query}
                  onChange={setQuery}
                  placeholder="Name or phone"
                  hint="Links the reservation to their record — and, once seated, to their tab."
                />
                {matches.length > 0 && (
                  <Box sx={{ mt: 0.75 }} data-customer-results>
                    <ResultList maxHeight={200}>
                      {matches.map((g) => (
                        <ResultRow
                          key={g.id}
                          primary={g.name}
                          secondary={`${g.phone} · ${g.type}`}
                          badge={g.type === 'Member' ? 'MEMBER' : undefined}
                          badgeBg={md3.primaryContainer}
                          badgeColor={md3.onPrimaryContainer}
                          onClick={() => pick(g)}
                        />
                      ))}
                    </ResultList>
                  </Box>
                )}
                {query.trim().length >= 2 && matches.length === 0 && (
                  <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 0.75 }}>
                    No one on the roster matches — book them by name.
                  </Typography>
                )}
              </Box>
            )}
            <Stack direction="row" gap={1.5}>
              <Field label="Name" value={name} onChange={setName} placeholder="Last, First" />
              <Field label="Phone" type="tel" value={phone} onChange={setPhone} placeholder="(555) 555-0100" />
            </Stack>
            <Field label="Note (optional)" value={note} onChange={setNote} placeholder="Anniversary, high chair, allergies…" />
          </Stack>
        </ModalSection>

        {placing && (
          <ModalSection title="Table" hint={`Tables for ${partySize} or more, free for the meal`} sx={{ mb: 0 }}>
            <Stack gap={1.25}>
              {chosen && chosenBlocker && (
                <Callout tone="danger" icon="block">
                  <span data-table-clash>
                    {tableLabel(chosen)} can't take this reservation: {blockerText(chosenBlocker)}. Choose another table, or
                    none for now.
                  </span>
                </Callout>
              )}
              <TablePicker
                value={tableId}
                onChange={setTableId}
                none={{ label: 'No table yet', note: 'Choose one later, or when seating' }}
                items={options.map((o) => ({
                  room: o.room,
                  table: o.table,
                  disabled: Boolean(o.blocker),
                  note: o.blocker ? blockerText(o.blocker) : undefined,
                }))}
              />
            </Stack>
          </ModalSection>
        )}
      </Stack>
    </ModalFrame>
  );
}

