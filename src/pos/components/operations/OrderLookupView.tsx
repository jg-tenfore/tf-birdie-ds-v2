import { useMemo, useState } from 'react';
import { ActionButton, Badge } from './OrderEventParts';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import { md3, payBadges, radius } from '../../../theme/tokens';
import { DEMO_TODAY } from '../../data/bookings';
import { toDateStr } from '../../data/courses';
import { staffById } from '../../data/staff';
import { isStocked } from '../../data/stock';
import { bookingOrder, bookingOrdersOn, type BookingOrder } from '../../logic/booking-orders';
import { money } from '../../logic/cart';
import { allRefundable, refundedQty, refundTender, type OrderRecord } from '../../logic/orders';
import { lineAmount, lineSummary, lookupOrders, netTotal, orderItems, paymentIdsByOrder, refundState, tenderLabel } from '../../logic/order-lookup';
import { eventById, orderByNumber } from '../../state/operations';
import { rateContext } from '../../state/pos-store';
import { usePos } from '../../state/PosProvider';
import { Callout } from '../../modals/ModalFrame';
import { DatePickerPopover } from '../DatePickerPopover';
import { ToolbarButton } from '../TeeSheetView';
import { EmptyState, Icon, SectionLabel } from '../primitives';
import { Stack } from '../Stack';
import { OpsScreen, OpsToolbar } from './OpsToolbar';

/**
 * Order Lookup (V1 → V2, Wave 3) — find a paid order, see what was in it, and refund it.
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/order-lookup.tsx`, from `references/072926/12-orderlookup/`:
 * two columns of criteria and no results. On the left a course and a date; on the right three
 * identical boxes — order ID, payment ID, product. Nothing ran until SEARCH.
 *
 * ## What was wrong with it
 *
 * The three boxes stacked in a column read as AND and behaved as OR, and the screen said so
 * nowhere. Nothing happened as you typed, so a wrong guess cost a round trip through SEARCH and
 * BACK. And the reference stops at the criteria: there was no order to look at, so nothing to
 * refund — which is the reason anyone opens this screen.
 *
 * ## What this does
 *
 * - **One box, live.** It matches the order number, a payment or refund id, a product, the name on
 *   the order and a card's last four, all at once (`matchesOrder`). A day, or every day.
 * - **The order, whole**: its lines, totals, how it was paid, who took it, and every refund
 *   already made against it — so "was this already refunded?" is answered before anyone asks.
 * - **Refund** the whole order or chosen lines, back to the tender that paid (`RefundOrderDialog`).
 *   Justin's call: find, view and refund; no reopening a paid order.
 * - **A reservation's order number lands here.** Tapping it on the tee sheet opens this order, with
 *   a way back to the reservation, because that route closes the panel it came from.
 * - **Tee times paid before the session** resolve too. They carry an order number with no record
 *   behind it; the screen builds one from the booking (`booking-orders.ts`) and, since there is no
 *   rung-up order to refund against, sends it to the register as before.
 */
export function OrderLookupView() {
  const { state, dispatch } = usePos();
  const [query, setQuery] = useState('');
  const [anyDate, setAnyDate] = useState(false);

  const date = toDateStr(state.currentDate);
  const recorded = useMemo(() => new Set(state.orders.map((o) => o.orderNumber)), [state.orders]);
  const rates = rateContext(state);
  const entries = useMemo<Entry[]>(
    () => [
      ...state.orders.map((order) => ({ order })),
      // Tee times paid before the session — the golf half of the day. Every day's only when asked
      // for, because the whole window is a lot of tee sheet to price.
      ...bookingOrdersOn(state.bookings, anyDate ? null : date, recorded, state.courses, rates),
    ],
    // `rates` is rebuilt every render; what it reads is the roster and the time prices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.orders, state.bookings, state.courses, state.timePrices, state.addedGolfers, anyDate, date, recorded],
  );
  const paymentIds = useMemo(() => paymentIdsByOrder(state.payments), [state.payments]);
  const shown = lookupOrders(entries, { query, date: anyDate ? null : date, paymentIds });

  const n = state.selectedOrderNumber;
  const record = orderByNumber(state, n);
  const fromBooking = !record && n ? bookingOrder(state.bookings, n, state.courses, rates) : undefined;

  return (
    <OpsScreen data-order-lookup>
      <OpsToolbar title="Order Lookup" actions={<DateControl anyDate={anyDate} onAnyDate={setAnyDate} />}>
        <SearchBox value={query} onChange={setQuery} />
      </OpsToolbar>
      <BackToReservation />

      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '440px 1fr' }}>
        {/* ── Results ── */}
        <Stack sx={{ minHeight: 0, borderRight: `1px solid ${md3.outlineVariant}` }}>
          <Stack direction="row" alignItems="center" sx={{ p: '10px 16px', flexShrink: 0 }}>
            <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }} data-result-count>
              {shown.length} order{shown.length === 1 ? '' : 's'}
              {anyDate ? ' on any date' : ` on ${state.currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </Typography>
          </Stack>
          <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 1.5 }} data-order-results>
            {shown.length === 0 ? (
              <NoResults query={query} anyDate={anyDate} onAnyDate={() => setAnyDate(true)} />
            ) : (
              shown.map((e) => (
                <ResultRow
                  key={e.order.orderNumber}
                  entry={e}
                  selected={e.order.orderNumber === n}
                  onClick={() => dispatch({ type: 'selectOrder', orderNumber: e.order.orderNumber })}
                />
              ))
            )}
          </Box>
        </Stack>

        {/* ── The open order ── */}
        <Box sx={{ minHeight: 0, bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
          {record ? (
            <OrderDetail order={record} />
          ) : fromBooking ? (
            <OrderDetail order={fromBooking.order} fromBooking={fromBooking} />
          ) : n ? (
            <Stack alignItems="center" justifyContent="center" gap={1} sx={{ flex: 1, color: md3.onSurfaceVariant }} data-order-missing>
              <Icon name="search_off" size={36} />
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>No order {n}</Typography>
              <Typography sx={{ fontSize: 12.5 }}>Nothing on the register or the tee sheet was paid under that number.</Typography>
            </Stack>
          ) : (
            <EmptyState icon="receipt_long" label="Pick an order to see what was in it" />
          )}
        </Box>
      </Box>
    </OpsScreen>
  );
}

type Entry = { order: OrderRecord; booking?: BookingOrder['booking'] };

// ─── Toolbar ────────────────────────────────────────────────────────────────

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.75}
      sx={{ width: 420, height: 40, px: 1.5, borderRadius: `${radius.xl}px`, bgcolor: md3.surfaceContainer, flexShrink: 0 }}
    >
      <Icon name="search" size={18} color={md3.onSurfaceVariant} />
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Order, payment, product, name or card last 4"
        inputProps={{ 'aria-label': 'Search orders', 'data-order-search': true }}
        sx={{ flex: 1, fontSize: 14 }}
      />
      {value && (
        <ButtonBase aria-label="Clear the search" onClick={() => onChange('')} sx={{ borderRadius: '50%', p: 0.5 }}>
          <Icon name="close" size={16} color={md3.onSurfaceVariant} />
        </ButtonBase>
      )}
    </Stack>
  );
}

/** The day, or every day. The day is the tee sheet's, as on Orders & Tips — one date across the back office. */
function DateControl({ anyDate, onAnyDate }: { anyDate: boolean; onAnyDate: (v: boolean) => void }) {
  const { state, dispatch } = usePos();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const label = state.currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <Stack direction="row" alignItems="center" gap={0.5}>
      {!anyDate && (
        <>
          <ToolbarButton icon="chevron_left" onClick={() => dispatch({ type: 'shiftDate', days: -1 })} title="Previous day" />
          <Box sx={{ position: 'relative' }}>
            <ButtonBase
              onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
              data-order-date
              sx={{ fontSize: 14, fontWeight: 700, px: 0.75, height: 40, whiteSpace: 'nowrap', borderRadius: `${radius.sm}px` }}
            >
              <Icon name="calendar_month" size={16} color={md3.onSurfaceVariant} sx={{ mr: 0.5 }} />
              {label}
              <Icon name="expand_more" size={18} color={md3.outline} />
            </ButtonBase>
            {anchor && <DatePickerPopover onClose={() => setAnchor(null)} />}
          </Box>
          <ToolbarButton icon="chevron_right" onClick={() => dispatch({ type: 'shiftDate', days: 1 })} title="Next day" />
          <ToolbarButton label="Today" onClick={() => dispatch({ type: 'setDate', date: DEMO_TODAY() })} />
        </>
      )}
      <ToolbarButton icon="date_range" label="Any date" active={anyDate} onClick={() => onAnyDate(!anyDate)} />
    </Stack>
  );
}

/**
 * The way back to the reservation whose order number was tapped. The rail's own breadcrumb
 * (`LeftPanel`'s `ReturnToReservation`) is collapsed away on this screen, so the trail is here —
 * same flag, same trip: back to the tee sheet with the reservation open, and the flag spent.
 */
function BackToReservation() {
  const { state, dispatch } = usePos();
  const booking = state.returnToBooking ? state.bookings.find((b) => b.id === state.returnToBooking) : undefined;
  if (!booking) return null;
  return (
    <ButtonBase
      data-back-to-reservation
      aria-label={`Back to the reservation for ${booking.name}`}
      onClick={() => {
        dispatch({ type: 'clearReturnToBooking' });
        dispatch({ type: 'setView', view: 'tee' });
        dispatch({ type: 'openReservation', bookingId: booking.id });
      }}
      sx={{
        gap: 0.75,
        px: 1.75,
        py: 1.125,
        justifyContent: 'flex-start',
        flexShrink: 0,
        bgcolor: md3.primaryContainer,
        color: md3.onPrimaryContainer,
        fontSize: 13,
        fontWeight: 700,
        borderBottom: `1px solid ${md3.outlineVariant}`,
      }}
    >
      <Icon name="arrow_back" size={16} />
      Back to the reservation · {booking.name}
    </ButtonBase>
  );
}

// ─── Results ────────────────────────────────────────────────────────────────

function ResultRow({ entry, selected, onClick }: { entry: Entry; selected: boolean; onClick: () => void }) {
  const { state } = usePos();
  const o = entry.order;
  const refunded = refundState(o);
  const tender = o.tenders.length > 1 ? `${o.tenders.length} tenders` : o.tenders[0] ? tenderLabel(o.tenders[0].method, o.tenders[0].ref, eventById(state, o.tenders[0].ref?.eventId)?.name) : '';
  return (
    <ButtonBase
      data-order-row={o.orderNumber}
      aria-pressed={selected}
      onClick={onClick}
      sx={{
        width: '100%',
        display: 'block',
        textAlign: 'left',
        p: '10px 12px',
        mb: 0.75,
        borderRadius: `${radius.md}px`,
        border: `1.5px solid ${selected ? md3.primary : md3.outlineVariant}`,
        bgcolor: selected ? md3.primaryContainer : '#fff',
      }}
    >
      <Stack direction="row" alignItems="baseline" gap={1}>
        <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{o.orderNumber}</Typography>
        <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
          {[o.date === toDateStr(state.currentDate) ? '' : shortDate(o.date), o.time || (entry.booking ? 'Paid before today' : '')].filter(Boolean).join(' · ')}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{money(o.total)}</Typography>
      </Stack>
      <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600, mt: 0.25 }}>
        {o.label} · {lineSummary(o)}
      </Typography>
      <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 0.5 }}>
        <Typography noWrap sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
          {tender}
          {staffById(o.staffId) ? ` · ${staffById(o.staffId)!.short}` : ''}
        </Typography>
        <Box sx={{ flex: 1 }} />
        {entry.booking && <Badge tone="event">Tee sheet</Badge>}
        {refunded === 'full' && <Badge tone="refund">Refunded</Badge>}
        {refunded === 'partial' && <Badge tone="refund">Part refunded</Badge>}
      </Stack>
    </ButtonBase>
  );
}

function NoResults({ query, anyDate, onAnyDate }: { query: string; anyDate: boolean; onAnyDate: () => void }) {
  return (
    <Stack alignItems="center" gap={1} sx={{ py: 6, color: md3.onSurfaceVariant, textAlign: 'center' }} data-no-orders>
      <Icon name="search_off" size={32} />
      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{query.trim() ? `Nothing matches “${query.trim()}”` : 'No orders on this day'}</Typography>
      {!anyDate && (
        <ButtonBase onClick={onAnyDate} sx={{ fontSize: 13, fontWeight: 700, color: md3.primary, px: 1, py: 0.5, borderRadius: `${radius.sm}px` }}>
          Search every date
        </ButtonBase>
      )}
    </Stack>
  );
}

// ─── The open order ─────────────────────────────────────────────────────────

function OrderDetail({ order: o, fromBooking }: { order: OrderRecord; fromBooking?: BookingOrder }) {
  const { state, dispatch, toast } = usePos();
  // A tee time paid before the session refunds like any order — `refundOrder` builds its record.
  const refundable = allRefundable(o).length > 0;
  const staff = staffById(o.staffId);
  const eventName = (id?: string) => eventById(state, id)?.name;
  const back = refundTender(o);

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }} data-order-detail={o.orderNumber}>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '18px 22px' }}>
        {/* Header */}
        <Stack direction="row" alignItems="flex-start" gap={1.5} sx={{ mb: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography component="h2" sx={{ fontSize: 22, fontWeight: 800 }}>
                {o.orderNumber}
              </Typography>
              {refundState(o) === 'full' && <Badge tone="refund">Refunded</Badge>}
              {refundState(o) === 'partial' && <Badge tone="refund">Part refunded</Badge>}
              {fromBooking && <Badge tone="event">Paid on the tee sheet</Badge>}
            </Stack>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 0.25 }}>{o.label}</Typography>
            <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, mt: 0.25 }} data-taken-by>
              {[longDate(o.date), o.time, staff ? `Taken by ${staff.name}` : 'Paid before this session'].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Stack>

        {fromBooking && (
          <Box sx={{ mb: 2 }}>
            <Callout tone="info" icon="info">
              Paid on the tee sheet before today’s session. The lines are what those seats were sold for, and a refund goes back
              to the card — the seed does not say how it was paid.
            </Callout>
          </Box>
        )}

        {/* Lines */}
        <SectionLabel color={md3.outline} sx={{ mb: 0.75 }}>
          What was bought
        </SectionLabel>
        <Box sx={{ border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, overflow: 'hidden', mb: 2 }}>
          {orderItems(o).map(({ line, index }) => {
            const returned = refundedQty(o, index);
            const stocked = isStocked(line.name);
            return (
              <Stack
                key={index}
                direction="row"
                alignItems="center"
                gap={1}
                data-order-line={index}
                sx={{ p: '10px 12px', borderBottom: `1px solid ${md3.surfaceContainer}`, '&:last-of-type': { borderBottom: 'none' } }}
              >
                <Typography sx={{ fontSize: 13, fontWeight: 800, width: 28, color: md3.onSurfaceVariant }}>{line.qty}×</Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{ fontSize: 13.5, fontWeight: 600, textDecoration: line.dish?.voided ? 'line-through' : undefined }}
                  >
                    {line.name}
                  </Typography>
                  <Stack direction="row" gap={1} sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
                    {line.isCheckIn && line.teeTime && (
                      <span>
                        {line.teeTime.label} · {line.teeTime.courseName}
                      </span>
                    )}
                    {line.dish?.voided && <span>Voided — not charged</span>}
                    {returned > 0 && (
                      <Box component="span" data-refunded={returned} sx={{ color: payBadges.refund.text, fontWeight: 700 }}>
                        {returned === line.qty ? 'Refunded' : `${returned} refunded`}
                      </Box>
                    )}
                    {stocked && !fromBooking && <span data-stock={state.stock[line.name] ?? 0}>{state.stock[line.name] ?? 0} on the shelf</span>}
                  </Stack>
                </Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{money(lineAmount(line))}</Typography>
              </Stack>
            );
          })}
        </Box>

        {/* Totals */}
        <Box sx={{ mb: 2, maxWidth: 360, ml: 'auto' }} data-order-totals>
          <TotalRow label="Subtotal" value={money(o.subtotal)} />
          <TotalRow label="Tax" value={money(o.tax)} />
          <TotalRow label="Total" value={money(o.total)} strong />
          {o.tip > 0 && <TotalRow label="Tip" value={money(o.tip)} />}
          {o.refunds.length > 0 && (
            <>
              <TotalRow label="Refunded" value={money(-o.refunds.reduce((s, r) => s + r.amount, 0))} tone={payBadges.refund.text} />
              <TotalRow label="Kept" value={money(netTotal(o))} strong />
            </>
          )}
        </Box>

        {/* Tenders */}
        <SectionLabel color={md3.outline} sx={{ mb: 0.75 }}>
          How it was paid
        </SectionLabel>
        <Box sx={{ mb: 2 }} data-order-tenders>
          {o.tenders.map((t, i) => (
            <Stack key={t.paymentId || i} direction="row" alignItems="center" gap={1} sx={{ py: 0.75, borderBottom: `1px solid ${md3.surfaceContainer}` }}>
              <Icon name={t.method === 'cash' ? 'payments' : t.method === 'event' ? 'calendar_month' : t.method === 'giftcard' ? 'card_giftcard' : 'credit_card'} size={16} color={md3.onSurfaceVariant} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{tenderLabel(t.method, t.ref, eventName(t.ref?.eventId))}</Typography>
              {t.paymentId && <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>{t.paymentId}</Typography>}
              <Typography sx={{ fontSize: 13, fontWeight: 700, minWidth: 80, textAlign: 'right' }}>{money(t.amount)}</Typography>
            </Stack>
          ))}
        </Box>

        {/* Refunds already made */}
        {o.refunds.length > 0 && (
          <>
            <SectionLabel color={md3.outline} sx={{ mb: 0.75 }}>
              Refunds
            </SectionLabel>
            <Box sx={{ mb: 2 }}>
              {o.refunds.map((r) => (
                <Box key={r.id} data-refund-record={r.id} sx={{ py: 0.875, borderBottom: `1px solid ${md3.surfaceContainer}` }}>
                  <Stack direction="row" alignItems="baseline" gap={1}>
                    <Icon name="undo" size={15} color={payBadges.refund.text} />
                    <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
                      {r.lines.map((l) => `${l.qty}× ${o.lines[l.index]?.name ?? 'item'}`).join(', ')}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: payBadges.refund.text }}>{money(-r.amount)}</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, ml: 2.75 }}>
                    {r.time} · {staffById(r.staffId)?.short ?? r.staffId} · back to{' '}
                    {r.parts
                      ? r.parts.map((p) => `${tenderLabel(p.method, p.ref, eventName(p.ref?.eventId))} ${money(p.amount)}`).join(' and ')
                      : tenderLabel(r.method, r.ref, eventName(r.ref?.eventId))}{' '}
                    · {(r.parts ?? [r]).map((p) => p.paymentId).join(', ')}
                    {r.reason ? ` · “${r.reason}”` : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Box>

      {/* Actions */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ p: '12px 22px', borderTop: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
        <ActionButton icon="print" onClick={() => toast(`Receipt for ${o.orderNumber} sent to the printer`)}>
          Print receipt
        </ActionButton>
        <Box sx={{ flex: 1 }} />
        {fromBooking && (
          <ActionButton
            icon="open_in_new"
            data-open-in-register
            onClick={() => dispatch({ type: 'openPaidOrder', bookingId: fromBooking.booking.id })}
          >
            Open in register
          </ActionButton>
        )}
        <>
            {refundable && back && (
              <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
                {o.tenders.length > 1 ? 'Back to the tenders that paid it' : `Back to ${tenderLabel(back.method, back.ref, eventName(back.ref?.eventId))}`}
              </Typography>
            )}
            <ActionButton
              icon="assignment_return"
              filled
              data-refund
              disabled={!refundable}
              onClick={() => dispatch({ type: 'openModal', modal: { kind: 'refundOrder', orderNumber: o.orderNumber } })}
            >
              {refundable ? 'Refund' : 'Fully refunded'}
            </ActionButton>
        </>
      </Stack>
    </Stack>
  );
}

// ─── Bits ───────────────────────────────────────────────────────────────────

const shortDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const longDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

function TotalRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.375 }} data-total={label}>
      <Typography sx={{ fontSize: 13, fontWeight: strong ? 800 : 500, color: tone ?? (strong ? md3.onSurface : md3.onSurfaceVariant) }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: strong ? 800 : 600, color: tone }}>{value}</Typography>
    </Stack>
  );
}
