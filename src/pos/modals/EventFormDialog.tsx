import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { md3 } from '../../theme/tokens';
import { toDateStr } from '../data/courses';
import { teeSheetGroups } from '../logic/event-screen';
import { eventById, type OperationsModal } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { Stack } from '../components/Stack';
import { Field, FilledButton, ModalFrame, ModalSection, OutlineButton, PillGroup, SelectField } from './ModalFrame';

/**
 * New event, or an event changed (V1 → V2, Wave 3).
 *
 * The one field v1 could not have is **Tee times**: the tee-sheet group whose bookings are the
 * event's golf. Pick the league or outing already on the sheet and its players are on the bill;
 * leave it empty for an event that is only spend — a members' dinner, a league night's tab.
 *
 * A billed event is not edited: its bill has been paid, and changing the green fee afterwards would
 * make the event disagree with the order that settled it. The screen offers no Edit for one.
 */
export function EventFormDialog({ m }: { m: Extract<OperationsModal, { kind: 'eventForm' }> }) {
  const { state, dispatch, toast } = usePos();
  const existing = eventById(state, m.id);
  const [name, setName] = useState(existing?.name ?? '');
  const [date, setDate] = useState(existing?.date ?? toDateStr(state.currentDate));
  const [organiser, setOrganiser] = useState(existing?.organiser.name ?? '');
  const [phone, setPhone] = useState(existing?.organiser.phone ?? '');
  const [expected, setExpected] = useState(String(existing?.expectedPlayers ?? ''));
  const [fee, setFee] = useState(existing ? String(existing.greenFee) : '');
  const [groupId, setGroupId] = useState(existing?.groupId ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [status, setStatus] = useState<'upcoming' | 'open'>(existing?.status === 'open' ? 'open' : 'upcoming');
  const [tried, setTried] = useState(false);

  const groups = teeSheetGroups(state.bookings);
  const missing = [!name.trim() && 'a name', !/^\d{4}-\d{2}-\d{2}$/.test(date) && 'a date', !organiser.trim() && 'who is organising it'].filter(Boolean) as string[];
  const close = () => dispatch({ type: 'closeModal' });

  const save = () => {
    if (missing.length) return setTried(true);
    const fields = {
      name: name.trim(),
      date,
      organiser: { ...existing?.organiser, name: organiser.trim(), phone: phone.trim() || undefined },
      groupId: groupId || undefined,
      expectedPlayers: Math.max(0, parseInt(expected, 10) || 0),
      greenFee: Math.max(0, Math.round((parseFloat(fee) || 0) * 100) / 100),
      note: note.trim() || undefined,
    };
    if (existing) {
      dispatch({ type: 'patchEvent', id: existing.id, patch: { ...fields, status } });
      toast(`${fields.name} saved`);
    } else {
      dispatch({ type: 'createEvent', event: { ...fields, status } });
      toast(`${fields.name} created`);
    }
    close();
  };

  return (
    <ModalFrame
      title={existing ? `Edit · ${existing.name}` : 'New event'}
      subtitle={existing ? existing.id : 'An outing, a league night, a dinner — golf and spend, billed once'}
      icon="event"
      width={600}
      onClose={close}
      actions={
        <>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
          <Box sx={{ flex: 1 }} />
          <FilledButton onClick={save}>{existing ? 'Save event' : 'Create event'}</FilledButton>
        </>
      }
    >
      <ModalSection title="The event">
        <Stack gap={1.25}>
          <Field label="Name" value={name} onChange={setName} placeholder="Member-Guest Invitational" autoFocus={!existing} />
          <Stack direction="row" gap={1.25}>
            <Field label="Date" type="date" value={date} onChange={setDate} />
            <Field label="Expected players" value={expected} onChange={(v) => setExpected(v.replace(/[^0-9]/g, ''))} placeholder="72" />
            <Field label="Green fee a player" prefix="$" value={fee} onChange={(v) => setFee(v.replace(/[^0-9.]/g, ''))} placeholder="0.00" />
          </Stack>
          <PillGroup
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { label: 'Upcoming', value: 'upcoming' },
              { label: 'Open — taking charges today', value: 'open' },
            ]}
          />
        </Stack>
      </ModalSection>

      <ModalSection title="Organiser" hint="They are billed for the golf and everything charged to it">
        <Stack direction="row" gap={1.25}>
          <Field label="Name" value={organiser} onChange={setOrganiser} placeholder="Last, First" />
          <Field label="Phone" value={phone} onChange={setPhone} placeholder="(555) 555-0100" />
        </Stack>
      </ModalSection>

      <ModalSection title="Tee times" hint="The league or outing on the tee sheet whose players are this event's golf">
        <SelectField
          value={groupId}
          onChange={setGroupId}
          options={[
            { label: 'None — this event is only what is charged to it', value: '' },
            ...groups.map((g) => ({ label: `${g.name} · ${g.date} · ${g.players} players`, value: g.groupId })),
          ]}
        />
      </ModalSection>

      <ModalSection title="Note">
        <Field value={note} onChange={setNote} placeholder="Shotgun start, lunch after, who to call" multiline />
      </ModalSection>

      {tried && missing.length > 0 && (
        <Typography data-event-form-error sx={{ fontSize: 12.5, fontWeight: 600, color: md3.error }}>
          Still needs {missing.join(', ')}.
        </Typography>
      )}
    </ModalFrame>
  );
}
