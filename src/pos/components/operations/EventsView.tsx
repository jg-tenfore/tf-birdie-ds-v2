import { useState, type ReactNode } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { eventGolf, eventSpend, type EventCharge, type GolfEvent } from '../../data/events';
import { staffById } from '../../data/staff';
import { money } from '../../logic/cart';
import { eventStatusLabel, eventsInOrder, fromDateStr, removableCharge } from '../../logic/event-screen';
import { eventById, orderByNumber } from '../../state/operations';
import { usePos } from '../../state/PosProvider';
import { Callout, Field } from '../../modals/ModalFrame';
import { ToolbarButton } from '../TeeSheetView';
import { EmptyState, Icon, SectionLabel } from '../primitives';
import { Stack } from '../Stack';
import { ActionButton, Badge } from './OrderEventParts';
import { OpsScreen, OpsToolbar } from './OpsToolbar';

/**
 * Events (V1 → V2, Wave 3) — an outing's golf and its spend, as one thing, billed once.
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/events.tsx`, from `references/072926/15-events/`: a list of ids
 * and names, and behind each an expense ledger with the whole category catalogue beside it and one
 * button, ADD PAYMENT. The outing's tee times lived on the tee sheet as a league, unconnected.
 *
 * ## What was wrong with it
 *
 * **No action bar at all** on the list — the app bar's overflow menu was the only way to do anything
 * but open an event. Inside one, the event's name replaced the screen's, so nothing said you were in
 * Events; the ledger's total was not on screen; and the golf — most of what an outing costs — was
 * not on the bill, because it was not in the event. Somebody added the two up by hand.
 *
 * ## What this does
 *
 * - **A list and the open event side by side**, open ones first, then upcoming, then billed.
 *   **New event** is on the toolbar, and the event's own jobs sit in a bar under it.
 * - **Golf derived from the tee times** (`eventGolf`): every player on the event's group, at its
 *   green fee. Move a tee time or drop a player and the bill follows — nobody re-keys it. The
 *   Member-Guest's 72 are real bookings on May 30's sheet, one tap away.
 * - **The spend ledger** — what was charged to it from checkout, and charges added here (insurance,
 *   prizes). A charge that came from an order is taken off by refunding the order, so the order and
 *   the ledger can never disagree; a charge added here can simply be removed.
 * - **Bill the organiser** puts golf and spend on the register as one order. Paying it marks the
 *   event billed, and a billed event takes no more charges.
 */
export function EventsView() {
  const { state, dispatch } = usePos();
  const [filter, setFilter] = useState<'all' | GolfEvent['status']>('all');
  const events = eventsInOrder(state.events).filter((e) => filter === 'all' || e.status === filter);
  const selected = eventById(state, state.selectedEventId);
  const count = (s: GolfEvent['status']) => state.events.filter((e) => e.status === s).length;

  return (
    <OpsScreen data-events>
      <OpsToolbar
        title="Events"
        actions={<ToolbarButton icon="add" label="New event" onClick={() => dispatch({ type: 'openModal', modal: { kind: 'eventForm' } })} />}
      >
        <Stack direction="row" gap={0.75}>
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label={`All · ${state.events.length}`} />
          {(['open', 'upcoming', 'billed'] as const).map((s) => (
            <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)} label={`${eventStatusLabel(s)} · ${count(s)}`} />
          ))}
        </Stack>
      </OpsToolbar>

      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '360px 1fr' }}>
        <Box sx={{ minHeight: 0, overflowY: 'auto', p: 1.5, borderRight: `1px solid ${md3.outlineVariant}` }} data-event-list>
          {events.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant, p: 2 }}>No {filter === 'all' ? '' : eventStatusLabel(filter).toLowerCase()} events.</Typography>
          ) : (
            events.map((e) => (
              <EventRow key={e.id} event={e} selected={e.id === selected?.id} onClick={() => dispatch({ type: 'selectEvent', eventId: e.id })} />
            ))
          )}
        </Box>
        <Box sx={{ minHeight: 0, bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
          {selected ? <EventDetail key={selected.id} event={selected} /> : <EmptyState icon="event" label="Pick an event to see its golf and its bill" />}
        </Box>
      </Box>
    </OpsScreen>
  );
}

// ─── List ───────────────────────────────────────────────────────────────────

const STATUS_TONE = { upcoming: 'event', open: 'rain_chk', billed: 'paid' } as const;

function EventRow({ event: e, selected, onClick }: { event: GolfEvent; selected: boolean; onClick: () => void }) {
  const { state } = usePos();
  const golf = eventGolf(e, state.bookings);
  return (
    <ButtonBase
      data-event-row={e.id}
      aria-pressed={selected}
      onClick={onClick}
      sx={{
        width: '100%',
        display: 'block',
        textAlign: 'left',
        p: '12px 14px',
        mb: 0.75,
        borderRadius: `${radius.md}px`,
        border: `1.5px solid ${selected ? md3.primary : md3.outlineVariant}`,
        bgcolor: selected ? md3.primaryContainer : '#fff',
      }}
    >
      <Stack direction="row" alignItems="center" gap={1}>
        <Typography noWrap sx={{ fontSize: 14, fontWeight: 800, flex: 1, minWidth: 0 }}>
          {e.name}
        </Typography>
        <Badge tone={STATUS_TONE[e.status]}>{eventStatusLabel(e.status)}</Badge>
      </Stack>
      <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, mt: 0.25 }}>
        {fromDateStr(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {e.organiser.name}
      </Typography>
      <Stack direction="row" alignItems="baseline" sx={{ mt: 0.5 }}>
        <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, flex: 1 }}>
          {golf.players ? `${golf.players} players on the sheet` : `${e.expectedPlayers} expected`}
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{money(golf.amount + eventSpend(e))}</Typography>
      </Stack>
    </ButtonBase>
  );
}

// ─── The open event ─────────────────────────────────────────────────────────

function EventDetail({ event: e }: { event: GolfEvent }) {
  const { state, dispatch, toast } = usePos();
  const golf = eventGolf(e, state.bookings);
  const spend = eventSpend(e);
  const billed = e.status === 'billed';
  const busy = state.cart.length > 0;
  const date = fromDateStr(e.date);
  const billedOrder = e.billedOrderNumber && orderByNumber(state, e.billedOrderNumber);

  const bill = () => {
    if (busy) return;
    dispatch({ type: 'billEvent', eventId: e.id });
    toast(`${e.name}'s bill is on the register — take payment to settle it`);
  };
  const seeOnSheet = () => {
    dispatch({ type: 'setDate', date });
    dispatch({ type: 'setView', view: 'tee' });
  };

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }} data-event-detail={e.id}>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '18px 22px' }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.25 }}>
          <Typography component="h2" sx={{ fontSize: 22, fontWeight: 800 }}>
            {e.name}
          </Typography>
          <Badge tone={STATUS_TONE[e.status]}>{eventStatusLabel(e.status)}</Badge>
        </Stack>
        <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, mb: 2 }}>
          {e.id}
          {billed && e.billedOrderNumber ? ` · billed on ${e.billedOrderNumber}` : ''}
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', mb: 2.5 }}>
          <Fact label="Date" value={date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} />
          <Fact label="Organiser" value={e.organiser.name} sub={e.organiser.phone} />
          <Fact label="Expected" value={`${e.expectedPlayers} players`} />
          <Fact label="Green fee" value={e.greenFee ? `${money(e.greenFee)} a player` : 'None'} />
        </Box>

        {/* Golf — from the tee sheet, never typed in. */}
        <SectionLabel color={md3.outline} sx={{ mb: 0.75 }}>
          Golf
        </SectionLabel>
        <Box sx={{ p: '12px 14px', borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer, mb: 2.5 }} data-event-golf>
          {e.groupId && golf.teeTimes > 0 ? (
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Icon name="golf_course" size={22} color={md3.primary} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }} data-event-players={golf.players}>
                  {golf.players} players on {golf.teeTimes} tee times × {money(e.greenFee)} = {money(golf.amount)}
                </Typography>
                <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
                  {golf.players === e.expectedPlayers
                    ? `All ${e.expectedPlayers} expected players are on the sheet.`
                    : `${e.expectedPlayers} expected — ${Math.abs(e.expectedPlayers - golf.players)} ${golf.players < e.expectedPlayers ? 'not yet on' : 'more than planned on'} the sheet.`}{' '}
                  {billed ? 'Billed with its tax.' : 'Tax is added when it is billed.'}
                </Typography>
              </Box>
              <ActionButton icon="calendar_view_day" data-see-on-sheet onClick={seeOnSheet}>
                See on the tee sheet
              </ActionButton>
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant }}>
              {e.groupId ? 'None of its tee times are on the sheet yet.' : 'No tee times belong to this event — its bill is what is charged to it.'}
            </Typography>
          )}
        </Box>

        {/* Spend */}
        <Stack direction="row" alignItems="baseline" sx={{ mb: 0.75 }}>
          <SectionLabel color={md3.outline}>Charged to it</SectionLabel>
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 800 }} data-event-spend>
            {money(spend)}
          </Typography>
        </Stack>
        <Box sx={{ border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, overflow: 'hidden', mb: 1.5 }} data-event-ledger>
          {e.ledger.length === 0 && <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant, p: '12px 14px' }}>Nothing charged yet.</Typography>}
          {e.ledger.map((c) => (
            <ChargeRow key={c.id} charge={c} event={e} />
          ))}
        </Box>
        {billed ? (
          <Callout tone="success" icon="check_circle">
            Billed{e.billedOrderNumber ? ` on ${e.billedOrderNumber}` : ''} and paid. Nothing more can be charged to it.
          </Callout>
        ) : (
          <AddCharge eventId={e.id} />
        )}

        {e.note && (
          <>
            <SectionLabel color={md3.outline} sx={{ mt: 2.5, mb: 0.75 }}>
              Note
            </SectionLabel>
            <Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }} data-event-note>
              {e.note}
            </Typography>
          </>
        )}
      </Box>

      {/* The event's jobs — what v1 kept in an overflow menu. */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ p: '12px 22px', borderTop: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
        {!billed && (
          <ActionButton icon="edit" onClick={() => dispatch({ type: 'openModal', modal: { kind: 'eventForm', id: e.id } })}>
            Edit
          </ActionButton>
        )}
        <Box sx={{ flex: 1 }} />
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
            Golf {money(golf.amount)}
            {golf.amount > 0 ? ' + tax' : ''} · charges {money(spend)}
          </Typography>
          <Typography sx={{ fontSize: 16, fontWeight: 800 }} data-event-bill>
            {money(golf.amount + spend)}
          </Typography>
        </Box>
        {billed ? (
          billedOrder ? (
            <ActionButton icon="receipt_long" onClick={() => dispatch({ type: 'openOrderLookup', orderNumber: billedOrder.orderNumber })}>
              See the bill
            </ActionButton>
          ) : null
        ) : (
          <Stack alignItems="flex-end">
            <ActionButton icon="point_of_sale" filled data-bill-event disabled={busy || golf.amount + spend === 0} onClick={bill}>
              Bill the organiser
            </ActionButton>
            {busy && <Typography sx={{ fontSize: 11, color: md3.error, mt: 0.25 }}>Clear the order on the register first</Typography>}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}

function ChargeRow({ charge: c, event: e }: { charge: EventCharge; event: GolfEvent }) {
  const { state, dispatch } = usePos();
  const order = c.orderNumber ? orderByNumber(state, c.orderNumber) : undefined;
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1.25}
      data-event-charge={c.id}
      sx={{ p: '8px 12px', minHeight: 52, borderBottom: `1px solid ${md3.surfaceContainer}`, '&:last-of-type': { borderBottom: 'none' } }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 800, width: 36, color: md3.onSurfaceVariant }}>{c.qty}×</Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{c.description}</Typography>
        <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
          {fromDateStr(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {c.time} · {staffById(c.staffId)?.short ?? c.staffId}
          {c.orderNumber && !order ? ` · ${c.orderNumber}` : ''}
        </Typography>
      </Box>
      {order && (
        <ButtonBase
          onClick={() => dispatch({ type: 'openOrderLookup', orderNumber: order.orderNumber })}
          aria-label={`Open order ${order.orderNumber} in Order Lookup`}
          sx={{ fontSize: 12, fontWeight: 700, color: md3.primary, px: 0.75, py: 0.5, borderRadius: `${radius.sm}px`, gap: 0.375 }}
        >
          <Icon name="receipt_long" size={14} />
          {order.orderNumber}
        </ButtonBase>
      )}
      <Typography sx={{ fontSize: 13.5, fontWeight: 700, minWidth: 84, textAlign: 'right' }}>{money(c.amount)}</Typography>
      {removableCharge(e, c) ? (
        <ButtonBase
          aria-label={`Remove ${c.description}`}
          onClick={() => dispatch({ type: 'removeEventCharge', eventId: e.id, chargeId: c.id })}
          sx={{ width: 40, height: 40, borderRadius: '50%', color: md3.onSurfaceVariant }}
        >
          <Icon name="close" size={18} />
        </ButtonBase>
      ) : (
        <Box sx={{ width: 40 }} />
      )}
    </Stack>
  );
}

/** A charge not from an order — insurance, prizes paid out of the event's budget. */
function AddCharge({ eventId }: { eventId: string }) {
  const { dispatch } = usePos();
  const [description, setDescription] = useState('');
  const [qty, setQty] = useState('1');
  const [amount, setAmount] = useState('');
  const value = Math.round((parseFloat(amount) || 0) * 100) / 100;
  const ok = description.trim().length > 0 && value !== 0;
  const add = () => {
    if (!ok) return;
    dispatch({ type: 'chargeEvent', eventId, description: description.trim(), qty: Math.max(1, parseInt(qty, 10) || 1), amount: value });
    setDescription('');
    setQty('1');
    setAmount('');
  };
  return (
    <Stack direction="row" alignItems="flex-end" gap={1} data-add-charge>
      <Box sx={{ flex: 3 }}>
        <Field label="Add a charge" value={description} onChange={setDescription} placeholder="What it was — prizes, insurance, carts" />
      </Box>
      <Box sx={{ width: 80 }}>
        <Field label="Qty" value={qty} onChange={(v) => setQty(v.replace(/[^0-9]/g, ''))} placeholder="1" />
      </Box>
      <Box sx={{ width: 140 }}>
        <Field label="Amount, tax in" prefix="$" value={amount} onChange={(v) => setAmount(v.replace(/[^0-9.-]/g, ''))} placeholder="0.00" />
      </Box>
      <ActionButton icon="add" disabled={!ok} onClick={add} data-add-charge-button>
        Add
      </ActionButton>
    </Stack>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Box data-fact={label} sx={{ p: '10px 12px', borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer, minWidth: 0 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant }}>{label}</Typography>
      <Typography noWrap sx={{ fontSize: 14.5, fontWeight: 800 }}>
        {value}
      </Typography>
      {sub && <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>{sub}</Typography>}
    </Box>
  );
}

function FilterChip({ label, active, onClick }: { label: ReactNode; active: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={active}
      sx={{
        height: 40,
        px: 1.75,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${active ? md3.primary : md3.outlineVariant}`,
        bgcolor: active ? md3.primaryContainer : '#fff',
        color: active ? md3.onPrimaryContainer : md3.onSurface,
        fontSize: 12.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </ButtonBase>
  );
}
