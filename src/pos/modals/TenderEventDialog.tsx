import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { eventSpend } from '../data/events';
import { money } from '../logic/cart';
import { chargeableEvents, eventStatusLabel, fromDateStr } from '../logic/event-screen';
import { amountDue, type OperationsModal } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { Icon } from '../components/primitives';
import { Stack } from '../components/Stack';
import { FilledButton, ModalFrame, OutlineButton } from './ModalFrame';

/**
 * Charge to an event (V1 → V2, Wave 3) — the order goes on an outing's bill instead of anyone's card.
 *
 * The tournament lunch is the case: forty plates rung at the counter, paid by nobody at the counter,
 * billed to the organiser with the golf. The order's lines land on the event's ledger, tax included
 * (`applyTender`), so the bill reads as what was served rather than one lump.
 *
 * Only events still taking charges are offered. A billed one has been paid for and is closed; v1
 * would let you add to an event at any point, because nothing in it knew it had been paid.
 */
export function TenderEventDialog({ m }: { m: Extract<OperationsModal, { kind: 'tenderEvent' }> }) {
  const { state, dispatch, toast } = usePos();
  const events = chargeableEvents(state.events, state.payingEventId);
  // Today's open event is nearly always the one — preselect it when there is exactly one.
  const todays = events.filter((e) => e.status === 'open');
  const [picked, setPicked] = useState<string | null>(todays.length === 1 ? todays[0].id : events.length === 1 ? events[0].id : null);
  // The tip recalculated into checkout travels with the tender (V1 → V2): it is charged here with the order.
  const tip = m.tip ?? 0;
  const orderDue = amountDue(state);
  const due = Math.round((orderDue + tip) * 100) / 100;
  const event = events.find((e) => e.id === picked);
  const close = () => dispatch({ type: 'closeModal' });

  const charge = () => {
    if (!event || due <= 0) return;
    dispatch({ type: 'recordPayment', method: 'event', amount: due, ...(tip > 0 && { tip }), ref: { eventId: event.id } });
    close();
    toast(`Charged ${money(due)} to ${event.name}`);
  };

  return (
    <ModalFrame
      title="Charge to an event"
      subtitle={`${money(due)} due`}
      icon="calendar_month"
      width={520}
      onClose={close}
      actions={
        <>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
          <Box sx={{ flex: 1 }} />
          <FilledButton onClick={charge} disabled={!event || due <= 0}>
            {event ? `Charge ${money(due)} to ${event.name}` : 'Pick an event'}
          </FilledButton>
        </>
      }
    >
      {events.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant }} data-no-chargeable-events>
          No event is taking charges. Billed events are closed; create one in Events first.
        </Typography>
      ) : (
        <Stack gap={0.75}>
          {events.map((e) => {
            const on = e.id === picked;
            return (
              <ButtonBase
                key={e.id}
                data-tender-event={e.id}
                aria-pressed={on}
                onClick={() => setPicked(e.id)}
                sx={{
                  width: '100%',
                  minHeight: 60,
                  px: 1.75,
                  gap: 1.25,
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  borderRadius: `${radius.md}px`,
                  border: `1.5px solid ${on ? md3.primary : md3.outlineVariant}`,
                  bgcolor: on ? md3.primaryContainer : '#fff',
                }}
              >
                <Icon name="event" size={20} color={on ? md3.primary : md3.onSurfaceVariant} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{e.name}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
                    {eventStatusLabel(e.status)} · {fromDateStr(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
                    {e.organiser.name} · {money(eventSpend(e))} charged so far
                  </Typography>
                </Box>
                {on && <Icon name="check" size={18} color={md3.primary} />}
              </ButtonBase>
            );
          })}
          <Typography sx={{ fontSize: 11.5, color: md3.outline, mt: 0.5 }}>
            Billed events are not listed — they have been paid for and take no more charges.
          </Typography>
        </Stack>
      )}
    </ModalFrame>
  );
}
