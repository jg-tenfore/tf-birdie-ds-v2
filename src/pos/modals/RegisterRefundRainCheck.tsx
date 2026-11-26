import { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { AP_CONFIGS } from '../data/config';
import { demoNow } from '../data/bookings';
import { formatTimeLabel } from '../data/courses';
import { RAIN_CHECK_RULES, mdyAfter } from '../data/credits';
import { customerForName } from '../data/roster';
import { money } from '../logic/cart';
import { plainName } from '../logic/customer-search';
import { tenderLabel } from '../logic/order-lookup';
import { refundAmount, refundableQty } from '../logic/orders';
import { orderNumberFromId, playerFee } from '../logic/reservation';
import { seatRecord } from '../logic/seat-pricing';
import { lookupOrder, refundPlan } from '../state/operations';
import { dayBookings, selectedBooking } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import { MemberDot } from '../components/primitives';
import { Stack } from '../components/Stack';
import { Callout, Field, FilledButton, ModalFrame, OutlineButton, ResultList, ResultRow } from './ModalFrame';

/**
 * The register's **Refund** and **Rain check** (Nov 26, "checkout that's right" — V1 → V2).
 *
 * They used to mark the booking and write a line in its financial trail, and move nothing. Now:
 *
 * - **Refund** gives one seat's money back — to the tenders that paid it, the same refund Order Lookup
 *   does (`refundOrder`), so a card gets back the card's part and a credit its own.
 * - **Rain check** cuts a real Credits rain check for the seat's customer: the amount keyed (Buck's
 *   New rain check takes an amount — nothing is prorated), Buck's 365-day expiry. It shows on the
 *   customer's record and can be spent at checkout (Credits on the customer › Rain check).
 */
export function SeatRefundOrRainCheck({ action }: { action: 'refund' | 'raincheck' }) {
  const { state, dispatch, toast } = usePos();
  const cfg = AP_CONFIGS[action];
  const booking = selectedBooking(state);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<{ bookingId: string; idx: number } | null>(null);
  const [typed, setTyped] = useState<string | null>(null);

  const pool = useMemo(() => {
    const source = booking ? [booking] : dayBookings(state).filter((b) => b.pay !== 'block' && b.pay !== 'event');
    const rows = source.flatMap((b) =>
      (b.playerStates ?? []).map((p, idx) => ({ bookingId: b.id, idx, name: idx === 0 ? b.name : b.guests?.[idx]?.name || `Guest ${idx + 1}`, booking: b, stateRow: p })),
    );
    const q = query.trim().toLowerCase();
    return (q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.booking.conf.toLowerCase().includes(q)) : rows).slice(0, 60);
  }, [booking, state, query]);

  const row = picked ? pool.find((r) => r.bookingId === picked.bookingId && r.idx === picked.idx) : undefined;
  const b = row?.booking;
  // What the seat paid, from its order: the tee time's line, one seat of it.
  // The order this register recorded for the booking, newest first — else the one its reservation shows.
  const order = b ? ([...state.orders].reverse().find((o) => o.bookingId === b.id) ?? lookupOrder(state, orderNumberFromId(b.id))) : undefined;
  const lineIndex = order ? order.lines.findIndex((l) => l.isCheckIn) : -1;
  const refundable = order && lineIndex >= 0 && row?.stateRow.paid ? refundableQty(order, lineIndex) : 0;
  const picks = refundable > 0 ? [{ index: lineIndex, qty: 1 }] : [];
  const back = order && picks.length ? refundAmount(order, picks) : 0;
  const plan = order && picks.length ? refundPlan(state, order, picks) : [];
  // The rain check: who it is for, and how much (keyed; the seat's paid share, or its fee, to start).
  const customer = b && row ? (seatRecord(b, row.idx, state.customerEdits) ?? (row.idx === 0 ? customerForName(b.name) : null)) : null;
  const suggested = back > 0 ? back : b && row ? playerFee(b, row.idx) : 0;
  const amount = typed == null ? suggested : Math.max(0, Number(typed) || 0);
  const expires = mdyAfter(demoNow(), RAIN_CHECK_RULES.expirationDays);

  const apply = () => {
    if (!b || !row) return;
    if (action === 'refund') {
      if (!order || !picks.length) return;
      dispatch({ type: 'refundOrder', orderNumber: order.orderNumber, picks, reason: `Refund at the register · ${row.name}` });
      dispatch({
        type: 'patchBooking',
        bookingId: b.id,
        patch: {
          pay: 'refund',
          financialActions: [
            ...(b.financialActions ?? []),
            { time: demoNow().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), label: `Refund · ${money(back)}`, player: row.name, type: 'refund' },
          ],
        },
      });
      toast(`Refunded ${money(back)} · ${plan.map((p) => tenderLabel(p.tender.method, p.tender.ref)).join(' and ')}`);
    } else {
      if (!customer || !(amount > 0)) return;
      dispatch({ type: 'issueRainCheck', bookingId: b.id, seat: row.idx, customerId: customer.id, amount });
      toast(`Rain check for ${plainName(customer)} · ${money(amount)} · expires ${expires}`);
    }
    dispatch({ type: 'closeModal' });
  };

  const ready = action === 'refund' ? picks.length > 0 : Boolean(customer) && amount > 0;

  return (
    <ModalFrame
      width={540}
      tall
      title={cfg.title}
      subtitle={booking ? `${booking.name} · ${booking.conf}` : "Search today's players"}
      icon={cfg.icon}
      iconColor={cfg.color}
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <Box data-seat-action-confirm>
            <FilledButton disabled={!ready} onClick={apply}>
              {action === 'refund' ? (back > 0 ? `Refund ${money(back)}` : 'Refund') : amount > 0 ? `Issue ${money(amount)} rain check` : 'Issue rain check'}
            </FilledButton>
          </Box>
        </>
      }
    >
      <Field autoFocus value={query} onChange={setQuery} placeholder="Search player or confirmation…" />
      <Box sx={{ mt: 1.25 }}>
        <ResultList maxHeight={picked ? 200 : 420}>
          {pool.map((r) => {
            const isPicked = picked?.bookingId === r.bookingId && picked.idx === r.idx;
            const course = state.courses.find((c) => c.id === r.booking.course);
            return (
              <Box key={`${r.bookingId}-${r.idx}`} data-seat-option={`${r.bookingId}:${r.idx}`} sx={{ display: 'contents' }}>
                <ResultRow
                  primary={
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <MemberDot name={r.name} size={7} />
                      {r.name}
                    </Stack>
                  }
                  secondary={`${formatTimeLabel(r.booking.timeMin)} · ${course?.name} · ${r.booking.conf}`}
                  badge={r.stateRow.noShow ? 'NO SHOW' : r.stateRow.paid ? 'PAID' : 'UNPAID'}
                  badgeColor={r.stateRow.paid ? '#16a34a' : md3.error}
                  badgeBg={r.stateRow.paid ? '#dcfce7' : '#ffdad6'}
                  selected={isPicked}
                  onClick={() => {
                    setPicked({ bookingId: r.bookingId, idx: r.idx });
                    setTyped(null);
                  }}
                />
              </Box>
            );
          })}
        </ResultList>
      </Box>

      {row && b && action === 'refund' && (
        <Box sx={{ mt: 1.5 }} data-seat-refund>
          {picks.length === 0 ? (
            <Callout tone="info">{row.stateRow.paid ? 'This seat has been refunded already.' : 'Nothing has been paid for this seat yet — nothing to refund.'}</Callout>
          ) : (
            <Box sx={{ border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, p: '10px 14px' }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.5 }}>
                {row.name} · {order!.orderNumber}
              </Typography>
              {plan.map((p) => (
                <Stack key={p.index} direction="row" justifyContent="space-between" data-refund-to={p.tender.method} sx={{ fontSize: 12.5 }}>
                  <span>Back to {tenderLabel(p.tender.method, p.tender.ref)}</span>
                  <b>{money(p.amount)}</b>
                </Stack>
              ))}
            </Box>
          )}
        </Box>
      )}

      {row && b && action === 'raincheck' && (
        <Box sx={{ mt: 1.5 }} data-seat-rain-check>
          {!customer ? (
            <Callout tone="warning">No customer record on this seat. Link the player to a customer to give them a credit.</Callout>
          ) : (
            <>
              <Stack direction="row" gap={1} alignItems="flex-end">
                <Box sx={{ width: 170 }} data-rain-check-amount>
                  <Field label="Amount (keyed — never prorated)" prefix="$" value={typed ?? suggested.toFixed(2)} onChange={(v) => setTyped(v.replace(/[^\d.]/g, ''))} />
                </Box>
                <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, pb: 1 }}>
                  For {plainName(customer)} · expires {expires} (Buck: {RAIN_CHECK_RULES.expirationDays} days) · tee times only
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 11.5, color: md3.outline, mt: 0.75 }}>
                {back > 0 ? `The seat paid ${money(back)}.` : `The seat’s fee is ${money(suggested)}.`} It goes on their record as a rain check, to spend at checkout.
              </Typography>
            </>
          )}
        </Box>
      )}
    </ModalFrame>
  );
}
