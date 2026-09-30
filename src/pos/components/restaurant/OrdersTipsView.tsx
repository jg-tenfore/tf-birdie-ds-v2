import { useState } from 'react';
import { Box, ButtonBase, Divider, Typography } from '@mui/material';
import { grid as gridTokens, md3, payBadges, radius } from '../../../theme/tokens';
import { DEMO_TODAY } from '../../data/bookings';
import { toDateStr } from '../../data/courses';
import { staffById } from '../../data/staff';
import { money } from '../../logic/cart';
import { tenderLabel } from '../../logic/order-lookup';
import type { PaymentRecord } from '../../logic/restaurant';
import { dayTotals, tipAdjustable, tipPercent, tipsByStaff } from '../../logic/tips';
import { usePos } from '../../state/PosProvider';
import { DatePickerPopover } from '../DatePickerPopover';
import { ToolbarButton } from '../TeeSheetView';
import { Icon } from '../primitives';
import { Stack } from '../Stack';

/**
 * Orders & Tips (V1 → V2, Wave 2) — the day's payments, and tips changed after the fact.
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/orders-tips.tsx`, from `references/072926/9-ordersTips/`: a navy
 * totals band, a table of tippable payments, and a bottom bar that mixed navigation, a cash drop,
 * a date picker and two print jobs.
 *
 * ## What was wrong with it
 *
 * v1 recorded two oddities faithfully. The totals band printed its seven labels **with no values
 * at all** until the day had activity, so a quiet morning read as broken rather than empty. And the
 * table declared eight columns and filled seven, leaving a dead column past Tip. Neither is a
 * judgement call — they are simply wrong. Less obviously, the bottom bar put a cash drop — moving
 * money from the drawer to the safe — beside the tip jobs, as though it were one.
 *
 * ## What this does
 *
 * - **Totals that are always numbers**, $0.00 included. Sales, tips, card, cash, the average tip,
 *   and how many tips have been changed.
 * - **Every payment of the day** from the payment ledger — which did not exist before this wave;
 *   the store remembered only the last payment. Filter by who took it and by tender. The tip and
 *   its percentage are on every row, so a missing tip on a $90 lunch is visible at a glance.
 * - **Adjust** on card payments only: a cash tip is already in someone's pocket. The dialog offers
 *   the usual percentages and asks before accepting a tip bigger than half the sale — a slipped
 *   digit, almost always.
 * - **Tips by person**, which is what v1's "Tip out" button was for.
 * - **No cash drop here.** It is a drawer job, not a tips one, and belongs with closing the till —
 *   Shift, in wave 3.
 * - **Refunds** (Wave 3) are negative payments against the order they came from, shown as refund
 *   rows: they net out of the day's sales and have no tip to adjust. Every order number opens the
 *   order in Order Lookup, which is where a refund is done.
 */
export function OrdersTipsView() {
  const { state, dispatch } = usePos();
  const [staffFilter, setStaffFilter] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<'all' | 'card' | 'cash'>('all');

  const date = toDateStr(state.currentDate);
  const day = state.payments.filter((p) => p.date === date);
  const shown = day
    .filter((p) => !staffFilter || p.staffId === staffFilter)
    .filter((p) => methodFilter === 'all' || p.method === methodFilter)
    // Newest first — a tip being fixed is almost always on the last few payments.
    .slice()
    .reverse();
  const totals = dayTotals(day);
  const byStaff = tipsByStaff(day, state.staffRoster);

  return (
    <Stack sx={{ flex: 1, minWidth: 0, height: '100%', bgcolor: md3.surface }} data-orders-tips>
      <Toolbar />

      {/* ── Totals: always a number ── */}
      <Box
        data-day-totals
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '10px',
          p: '14px 18px',
          borderBottom: `1px solid ${md3.outlineVariant}`,
          bgcolor: '#fff',
          flexShrink: 0,
        }}
      >
        <Stat label="Payments" value={String(totals.payments)} />
        <Stat label="Sales" value={money(totals.sales)} />
        <Stat label="Tips" value={money(totals.tips)} strong />
        <Stat label="Card" value={money(totals.card)} />
        <Stat label="Cash" value={money(totals.cash)} />
        <Stat
          label="Average tip"
          value={`${totals.averageTipPct}%`}
          sub={totals.adjusted ? `on tipped sales · ${totals.adjusted} adjusted` : 'on tipped sales'}
        />
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 300px' }}>
        {/* ── Payments ── */}
        <Stack sx={{ minHeight: 0, borderRight: `1px solid ${md3.outlineVariant}` }}>
          <Stack direction="row" gap={0.75} alignItems="center" sx={{ p: '10px 18px', flexWrap: 'wrap', flexShrink: 0 }}>
            {(['all', 'card', 'cash'] as const).map((m) => (
              <Chip key={m} active={methodFilter === m} onClick={() => setMethodFilter(m)} label={m === 'all' ? 'All tenders' : m === 'card' ? 'Card' : 'Cash'} />
            ))}
            {staffFilter && (
              <Chip active onClick={() => setStaffFilter(null)} label={`${staffById(staffFilter, state.staffRoster)?.short ?? staffFilter} ✕`} />
            )}
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
              {shown.length} of {day.length}
            </Typography>
          </Stack>

          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
            {day.length === 0 ? (
              <Empty />
            ) : (
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }} data-payments-table>
                <Box component="thead">
                  <Box component="tr">
                    {['Time', 'Order', 'Taken by', 'Tender', 'Sale', 'Tip', ''].map((h, i) => (
                      <Box
                        component="th"
                        key={h || i}
                        sx={{
                          textAlign: i >= 4 && i <= 5 ? 'right' : 'left',
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '.04em',
                          color: md3.onSurfaceVariant,
                          textTransform: 'uppercase',
                          p: '8px 8px',
                          borderBottom: `1px solid ${md3.outlineVariant}`,
                          position: 'sticky',
                          top: 0,
                          bgcolor: md3.surface,
                        }}
                      >
                        {h}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {shown.map((p) => (
                    <PaymentRow
                      key={p.id}
                      p={p}
                      onAdjust={() => dispatch({ type: 'openModal', modal: { kind: 'adjustTip', paymentId: p.id } })}
                      onOpenOrder={() => dispatch({ type: 'openOrderLookup', orderNumber: p.orderNumber })}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Stack>

        {/* ── Tips by person ── */}
        <Box sx={{ overflowY: 'auto', p: '14px 16px', bgcolor: '#fff' }} data-tips-by-staff>
          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: md3.onSurfaceVariant, mb: 1 }}>
            TIPS BY PERSON
          </Typography>
          {byStaff.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant }}>No tips yet today.</Typography>
          ) : (
            byStaff.map((s) => (
              <ButtonBase
                key={s.staffId}
                data-staff-tips={s.staffId}
                onClick={() => setStaffFilter(staffFilter === s.staffId ? null : s.staffId)}
                sx={{
                  width: '100%',
                  minHeight: 56,
                  mb: 0.75,
                  px: 1.5,
                  borderRadius: `${radius.md}px`,
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  border: `1.5px solid ${staffFilter === s.staffId ? md3.primary : md3.outlineVariant}`,
                  bgcolor: staffFilter === s.staffId ? md3.primaryContainer : '#fff',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{s.name}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
                    {s.payments} payment{s.payments === 1 ? '' : 's'}
                    {s.cashTips > 0 ? ` · ${money(s.cashTips)} cash` : ''}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{money(s.tips)}</Typography>
              </ButtonBase>
            ))
          )}
          <Divider sx={{ my: 1.5 }} />
          <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, lineHeight: 1.5 }}>
            Tap a person to see only their payments. The cash drop is with closing the till, in Shift.
          </Typography>
        </Box>
      </Box>
    </Stack>
  );
}

function PaymentRow({ p, onAdjust, onOpenOrder }: { p: PaymentRecord; onAdjust: () => void; onOpenOrder: () => void }) {
  const { state } = usePos();
  const adjustable = tipAdjustable(p);
  // Wave 3: a refund is money going back — a negative payment against the order it came from.
  // It reads as one, and nothing on it can be adjusted.
  const refund = p.kind === 'refund';
  const td = { p: '10px 8px', fontSize: 13, borderBottom: `1px solid ${md3.outlineVariant}` } as const;
  return (
    <Box component="tr" data-payment={p.id} data-payment-kind={refund ? 'refund' : 'sale'} sx={refund ? { bgcolor: payBadges.refund.bg } : undefined}>
      <Box component="td" sx={{ ...td, whiteSpace: 'nowrap', color: md3.onSurfaceVariant }}>
        {p.time}
      </Box>
      <Box component="td" sx={{ ...td, fontWeight: 700 }}>
        {/* Wave 3: the number opens the order in Order Lookup — what was bought, and a refund. */}
        <ButtonBase
          data-open-order={p.orderNumber}
          aria-label={`Open order ${p.orderNumber} in Order Lookup`}
          onClick={onOpenOrder}
          sx={{ gap: 0.375, px: 0.5, py: 0.25, ml: -0.5, borderRadius: `${radius.sm}px`, fontSize: 13, fontWeight: 700, color: md3.primary }}
        >
          {p.orderNumber}
        </ButtonBase>
      </Box>
      <Box component="td" sx={td}>
        {staffById(p.staffId, state.staffRoster)?.short ?? '—'}
      </Box>
      <Box component="td" sx={td}>
        {tenderLabel(p.method, p.ref ?? (p.cardLast4 ? { cardLast4: p.cardLast4 } : undefined))}
      </Box>
      <Box component="td" sx={{ ...td, textAlign: 'right', fontWeight: refund ? 700 : undefined, color: refund ? payBadges.refund.text : undefined }}>
        {money(p.amount)}
      </Box>
      <Box component="td" sx={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }} data-tip>
        {refund ? (
          <Box component="span" sx={{ color: md3.outline }}>
            —
          </Box>
        ) : (
          <>
            <Box component="span" sx={{ fontWeight: 700 }}>
              {money(p.tip)}
            </Box>
            <Box component="span" sx={{ color: md3.onSurfaceVariant, ml: 0.75, fontSize: 11.5 }}>
              {tipPercent(p)}%
            </Box>
          </>
        )}
        {p.tipAdjustedAt && (
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: md3.primary, letterSpacing: '.04em' }}>ADJUSTED {p.tipAdjustedAt}</Typography>
        )}
      </Box>
      <Box component="td" sx={{ ...td, textAlign: 'right', width: 96 }}>
        {refund ? (
          <Typography data-refund-label sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.04em', color: payBadges.refund.text }}>
            REFUND
          </Typography>
        ) : adjustable ? (
          <ButtonBase
            onClick={onAdjust}
            aria-label={`Adjust the tip on ${p.orderNumber}`}
            sx={{ height: 40, px: 1.5, borderRadius: `${radius.xl}px`, border: `1.5px solid ${md3.outlineVariant}`, fontSize: 12.5, fontWeight: 700 }}
          >
            Adjust
          </ButtonBase>
        ) : (
          <Typography sx={{ fontSize: 11.5, color: md3.outline }}>{p.method === 'cash' ? 'Cash' : '—'}</Typography>
        )}
      </Box>
    </Box>
  );
}

function Stat({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <Box data-stat={label} sx={{ p: '10px 12px', borderRadius: `${radius.md}px`, bgcolor: strong ? md3.primaryContainer : md3.surfaceContainer }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant }}>{label}</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 800, color: strong ? md3.onPrimaryContainer : md3.onSurface }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: 10.5, color: md3.onSurfaceVariant }}>{sub}</Typography>}
    </Box>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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
      }}
    >
      {label}
    </ButtonBase>
  );
}

function Empty() {
  return (
    <Stack alignItems="center" justifyContent="center" gap={1} sx={{ py: 8, color: md3.onSurfaceVariant }} data-no-payments>
      <Icon name="receipt_long" size={36} />
      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>No payments on this day</Typography>
      <Typography sx={{ fontSize: 12.5 }}>The totals above still read $0.00 — nothing is missing, it is just a quiet day.</Typography>
    </Stack>
  );
}

function Toolbar() {
  const { state, dispatch } = usePos();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const dateLabel = state.currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.75}
      sx={{ height: gridTokens.topbarH, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, px: 1.75, flexShrink: 0, position: 'relative', zIndex: 40 }}
    >
      <Typography sx={{ fontSize: 16, fontWeight: 800, mr: 0.5 }}>Orders &amp; Tips</Typography>
      <Divider orientation="vertical" flexItem sx={{ my: 1.25, mx: 0.25 }} />
      <ToolbarButton icon="chevron_left" onClick={() => dispatch({ type: 'shiftDate', days: -1 })} title="Previous day" />
      <Box sx={{ position: 'relative' }}>
        <ButtonBase
          onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
          sx={{ fontSize: 16, fontWeight: 700, px: 0.5, whiteSpace: 'nowrap', borderRadius: `${radius.sm}px` }}
        >
          {dateLabel}
          <Icon name="expand_more" size={18} color={md3.outline} />
        </ButtonBase>
        {anchor && <DatePickerPopover onClose={() => setAnchor(null)} />}
      </Box>
      <ToolbarButton icon="chevron_right" onClick={() => dispatch({ type: 'shiftDate', days: 1 })} title="Next day" />
      <ToolbarButton label="Today" onClick={() => dispatch({ type: 'setDate', date: DEMO_TODAY() })} />
      <Box sx={{ flex: 1 }} />
      <ToolbarButton icon="print" label="Print tip report" onClick={() => dispatch({ type: 'toast', message: 'Tip report sent to the printer' })} />
    </Stack>
  );
}
