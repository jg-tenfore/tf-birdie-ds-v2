import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { demoNow } from '../data/bookings';
import { SERVICE_CHARGES } from '../data/buck-club';
import { VENUES, type VenueId } from '../data/venues';
import { money } from '../logic/cart';
import { discountLines } from '../logic/discounts';
import { linePayable } from '../logic/cart';
import { tenderLabel } from '../logic/order-lookup';
import type { CartServiceCharge } from '../logic/pricing';
import { evenParts, type CheckoutModal } from '../state/checkout';
import { amountDue, registerLineTotals, registerTotals } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { ReceiptSlip } from '../components/ReceiptSlip';
import { Icon, SectionLabel } from '../components/primitives';
import { Stack } from '../components/Stack';
import { Callout, Field, FilledButton, ModalFrame, OutlineButton, PillGroup } from './ModalFrame';

/**
 * The order tools checkout and the cog used to toast "coming soon" for (Nov 26, "checkout that's
 * right"): **Split**, **Service charge**, **Reprint receipt** and **Transfer to course**.
 */

const isLine = (l: { isTax?: boolean; name: string; serviceCharge?: unknown; orderDiscount?: unknown }) =>
  !l.isTax && l.name !== 'Taxes' && !l.serviceCharge && !l.orderDiscount && l.name !== 'Tax Exempt';

/**
 * Split the check — **evenly** N ways, or **by item**, each line to a part. Each part is then paid
 * on its own tender (a card, cash, a credit — even a split of its own), recorded as its own payment
 * under the order's number. By item, a part owes its lines with their own tax and service charges
 * (`lineTotals`), so the parts add up to the order to the cent.
 */
export function SplitCheckDialog({ m }: { m: Extract<CheckoutModal, { kind: 'splitCheck' }> }) {
  const { state, dispatch, toast } = usePos();
  const back = () => dispatch({ type: 'openModal', modal: { kind: 'checkout', ...(m.tip ? { tip: m.tip } : {}) } });
  const [mode, setMode] = useState<'even' | 'items'>('even');
  const [ways, setWays] = useState(2);
  const total = amountDue(state);
  const totals = registerLineTotals(state);
  const lines = state.cart.map((l, index) => ({ l, index })).filter(({ l }) => isLine(l));
  const [parts, setParts] = useState(2);
  const [assign, setAssign] = useState<Record<number, number>>(() => Object.fromEntries(lines.map(({ index }, k) => [index, k % 2])));
  // A line's own total; markers and tax rows carry nothing (their share is on the lines).
  const byItem = Array.from({ length: parts }, (_, p) => {
    const mine = lines.filter(({ index }) => (assign[index] ?? 0) === p).map(({ index }) => index);
    return { label: `Part ${p + 1}`, lines: mine, amount: Math.round(mine.reduce((s, i) => s + totals[i], 0) * 100) / 100 };
  });
  // Rounding a line total can leave a cent off the parts; the last part takes it.
  const itemsSum = Math.round(byItem.reduce((s, p) => s + p.amount, 0) * 100) / 100;
  if (byItem.length && itemsSum !== total) byItem[byItem.length - 1].amount = Math.round((byItem[byItem.length - 1].amount + total - itemsSum) * 100) / 100;
  const even = evenParts(total, ways).map((amount, i) => ({ label: `Part ${i + 1} of ${ways}`, amount }));
  const chosen = mode === 'even' ? even : byItem;
  const ready = chosen.filter((p) => p.amount > 0).length >= 2;

  return (
    <ModalFrame
      width={600}
      title="Split the check"
      subtitle={`${money(total)} · each part paid on its own`}
      icon="call_split"
      onClose={back}
      actions={
        <>
          <OutlineButton onClick={back}>Back to checkout</OutlineButton>
          <Box data-start-split>
            <FilledButton
              disabled={!ready}
              onClick={() => {
                dispatch({ type: 'startSplit', split: { mode, parts: chosen } });
                back();
                toast(mode === 'even' ? `Split ${ways} ways · ${money(chosen[0].amount)} each` : `Split by item · ${chosen.filter((p) => p.amount > 0).length} parts`);
              }}
            >
              {mode === 'even' ? `Split ${ways} ways` : 'Split by item'}
            </FilledButton>
          </Box>
        </>
      }
    >
      <PillGroup
        value={mode}
        options={[
          { label: 'Evenly', value: 'even' },
          { label: 'By item', value: 'items' },
        ]}
        onChange={(v) => setMode(v)}
      />
      <Box sx={{ mt: 1.5 }}>
        {mode === 'even' ? (
          <>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>Ways</Typography>
              {[2, 3, 4, 5, 6].map((n) => (
                <ButtonBase
                  key={n}
                  data-split-ways={n}
                  aria-pressed={n === ways}
                  onClick={() => setWays(n)}
                  sx={{ width: 40, height: 36, borderRadius: `${radius.md}px`, border: `1.5px solid ${n === ways ? md3.primary : md3.outlineVariant}`, bgcolor: n === ways ? md3.primaryContainer : '#fff', fontWeight: 800 }}
                >
                  {n}
                </ButtonBase>
              ))}
            </Stack>
            <Box sx={{ mt: 1.5 }}>
              {even.map((p, i) => (
                <Stack key={i} direction="row" justifyContent="space-between" data-split-preview={i} sx={{ fontSize: 13, py: '3px' }}>
                  <span>{p.label}</span>
                  <b>{money(p.amount)}</b>
                </Stack>
              ))}
            </Box>
          </>
        ) : (
          <>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>Parts</Typography>
              {[2, 3, 4].map((n) => (
                <ButtonBase
                  key={n}
                  aria-pressed={n === parts}
                  onClick={() => {
                    setParts(n);
                    setAssign((a) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, Math.min(v, n - 1)])));
                  }}
                  sx={{ width: 40, height: 36, borderRadius: `${radius.md}px`, border: `1.5px solid ${n === parts ? md3.primary : md3.outlineVariant}`, bgcolor: n === parts ? md3.primaryContainer : '#fff', fontWeight: 800 }}
                >
                  {n}
                </ButtonBase>
              ))}
            </Stack>
            {lines.map(({ l, index }) => (
              <Stack key={index} direction="row" alignItems="center" gap={1} data-split-line={index} sx={{ py: 0.5, borderBottom: `1px solid ${md3.surfaceContainer}` }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0 }}>
                  {l.isCheckIn ? l.name : `${l.qty}× ${l.name}`}
                </Typography>
                <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, width: 64, textAlign: 'right' }}>{money(totals[index])}</Typography>
                {Array.from({ length: parts }, (_, p) => (
                  <ButtonBase
                    key={p}
                    aria-label={`${l.name} to part ${p + 1}`}
                    aria-pressed={(assign[index] ?? 0) === p}
                    onClick={() => setAssign((a) => ({ ...a, [index]: p }))}
                    sx={{
                      width: 30,
                      height: 28,
                      borderRadius: `${radius.sm}px`,
                      border: `1.5px solid ${(assign[index] ?? 0) === p ? md3.primary : md3.outlineVariant}`,
                      bgcolor: (assign[index] ?? 0) === p ? md3.primaryContainer : '#fff',
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {p + 1}
                  </ButtonBase>
                ))}
              </Stack>
            ))}
            <Box sx={{ mt: 1.25 }}>
              {byItem.map((p, i) => (
                <Stack key={i} direction="row" justifyContent="space-between" data-split-preview={i} sx={{ fontSize: 13, py: '3px' }}>
                  <span>
                    {p.label} · {p.lines.length} line{p.lines.length === 1 ? '' : 's'}
                  </span>
                  <b>{money(p.amount)}</b>
                </Stack>
              ))}
            </Box>
            <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 0.75 }}>
              Each part owes its lines with their own tax and service charges.
            </Typography>
          </>
        )}
      </Box>
    </ModalFrame>
  );
}

/**
 * A service charge added by hand — Buck's F&B or Event Service Charge at Buck's rate, or one typed in
 * (a percentage or a flat amount, with a name). It goes on the order as its own line, untaxed.
 */
export function ServiceChargeDialog({ m }: { m: Extract<CheckoutModal, { kind: 'serviceCharge' }> }) {
  const { state, dispatch, toast } = usePos();
  const back = () => dispatch({ type: 'openModal', modal: { kind: 'checkout', ...(m.tip ? { tip: m.tip } : {}) } });
  const club = state.clubPricing.serviceCharges;
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [as, setAs] = useState<'percent' | 'amount'>('percent');
  const add = (c: CartServiceCharge) => {
    dispatch({ type: 'addServiceCharge', charge: c });
    toast(`${c.label} added`);
    back();
  };
  const buck = SERVICE_CHARGES.filter((c) => c.id !== 'card' && club[c.id] > 0);
  return (
    <ModalFrame width={520} title="Add a service charge" subtitle="Its own line on the order, untaxed" icon="add_circle" onClose={back} actions={<OutlineButton onClick={back}>Back to checkout</OutlineButton>}>
      <SectionLabel color={md3.outline} sx={{ mb: 0.75 }}>
        Buck’s service charges
      </SectionLabel>
      <Stack gap={0.75}>
        {buck.map((c) => (
          <ButtonBase
            key={c.id}
            data-add-service-charge={c.id}
            onClick={() => add({ id: c.id, label: c.label, percent: club[c.id], appliesTo: c.id === 'fnb' ? 'fnb' : 'all' })}
            sx={{ justifyContent: 'space-between', p: '10px 14px', borderRadius: `${radius.md}px`, border: `1.5px solid ${md3.outlineVariant}`, textAlign: 'left', '&:hover': { borderColor: md3.primary } }}
          >
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{c.label}</Typography>
              <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>{c.id === 'fnb' ? 'On the food and drink on this order' : 'On everything on this order'}</Typography>
            </Box>
            <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{club[c.id]}%</Typography>
          </ButtonBase>
        ))}
      </Stack>
      <SectionLabel color={md3.outline} sx={{ mt: 2, mb: 0.75 }}>
        Another charge
      </SectionLabel>
      <Stack direction="row" gap={1} alignItems="flex-end" data-custom-service-charge>
        <Field label="Name" value={name} onChange={setName} placeholder="Setup fee" />
        <Box sx={{ width: 120 }}>
          <Field label={as === 'percent' ? 'Percent' : 'Amount'} prefix={as === 'amount' ? '$' : undefined} value={value} onChange={(v) => setValue(v.replace(/[^\d.]/g, ''))} />
        </Box>
        <PillGroup
          value={as}
          options={[
            { label: '%', value: 'percent' },
            { label: '$', value: 'amount' },
          ]}
          onChange={(v) => setAs(v)}
        />
      </Stack>
      <Box sx={{ mt: 1.25, display: 'flex', justifyContent: 'flex-end' }}>
        <FilledButton
          disabled={!name.trim() || !(Number(value) > 0)}
          onClick={() => add({ id: 'custom', label: name.trim(), ...(as === 'percent' ? { percent: Number(value) } : { amount: Number(value) }), appliesTo: 'all' })}
        >
          Add charge
        </FilledButton>
      </Box>
    </ModalFrame>
  );
}

/**
 * **Reprint receipt** — the last order paid on this register (or a named one), as its receipt printed:
 * its lines, discounts, service charges, tax by type and every tender that paid it.
 */
export function ReceiptDialog({ m }: { m: Extract<CheckoutModal, { kind: 'receipt' }> }) {
  const { state, dispatch, toast } = usePos();
  const order = m.orderNumber ? state.orders.find((o) => o.orderNumber === m.orderNumber) : state.orders.at(-1);
  const close = () => dispatch({ type: 'closeModal' });
  const { hardware, checkout } = state.terminalSettings;
  if (!order) {
    return (
      <ModalFrame width={420} title="Reprint receipt" icon="print" actions={<OutlineButton onClick={close}>Close</OutlineButton>}>
        <Callout tone="info">Nothing has been paid on this register yet.</Callout>
      </ModalFrame>
    );
  }
  const last = order.tenders.at(-1);
  const subtotal = order.subtotal;
  const discount = Math.round((order.total - order.tax - (order.service ?? 0) - subtotal) * 100) / 100;
  const totals = {
    subtotal,
    discount,
    goods: Math.round((subtotal + discount) * 100) / 100,
    golfTax: 0,
    salesTax: order.tax,
    tax: order.tax,
    exempt: false,
    total: order.total,
    taxes: order.taxes,
    serviceCharges: order.serviceCharges,
    service: order.service,
    discountLines: discountLines(order.lines, linePayable),
  };
  return (
    <ModalFrame
      width={440}
      title="Reprint receipt"
      subtitle={`${order.orderNumber} · ${order.label} · ${order.time}`}
      icon="print"
      actions={
        <>
          <OutlineButton onClick={close}>Close</OutlineButton>
          <Box sx={{ flex: 1 }} />
          <Box data-reprint>
            <FilledButton
              disabled={hardware.receiptPrinter === 'None'}
              onClick={() => {
                toast(`Receipt reprinted · ${order.orderNumber} · ${hardware.receiptPrinter}`);
                close();
              }}
            >
              Print again
            </FilledButton>
          </Box>
        </>
      }
    >
      <ReceiptSlip
        header={checkout.receiptHeader}
        footer={`${checkout.receiptFooter}\nReprinted ${demoNow().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
        register={hardware.name}
        when={`${order.date} ${order.time}`}
        lines={order.lines}
        totals={totals}
        tip={order.tip}
        tender={last ? tenderLabel(last.method, last.ref) : 'Paid'}
        amount={last ? last.amount + (order.tip ?? 0) : order.total}
        earlier={order.tenders.slice(0, -1).map((t) => ({ label: tenderLabel(t.method, t.ref), amount: t.amount }))}
      />
      {order.refunds.length > 0 && (
        <Box sx={{ mt: 1.25 }}>
          <Callout tone="warning">
            {order.refunds.length} refund{order.refunds.length === 1 ? '' : 's'} since · {money(order.refunds.reduce((s, r) => s + r.amount, 0))} back
          </Callout>
        </Box>
      )}
    </ModalFrame>
  );
}

/**
 * **Transfer to course** — move the order to another course's register: the golfer finishes at the
 * sister club, the order goes with them. It leaves this register; the other club's register shows it
 * as arrived, to open and pay there.
 */
export function TransferOrderDialog() {
  const { state, dispatch, toast } = usePos();
  const close = () => dispatch({ type: 'closeModal' });
  const [to, setTo] = useState<VenueId | null>(null);
  const others = (Object.keys(VENUES) as VenueId[]).filter((v) => v !== state.venueId);
  const total = registerTotals(state).total;
  const lines = state.cart.filter(isLine).length;
  return (
    <ModalFrame
      width={520}
      title="Transfer to another course"
      subtitle={`${lines} line${lines === 1 ? '' : 's'} · ${money(total)}`}
      icon="swap_horiz"
      actions={
        <>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
          <Box sx={{ flex: 1 }} />
          <Box data-transfer-confirm>
            <FilledButton
              disabled={!to || Boolean(state.checkSplit)}
              onClick={() => {
                if (!to) return;
                dispatch({ type: 'transferOrder', toVenue: to, total });
                toast(`Order sent to ${VENUES[to].name}`);
              }}
            >
              {to ? `Send to ${VENUES[to].name}` : 'Choose a course'}
            </FilledButton>
          </Box>
        </>
      }
    >
      {state.checkSplit ? (
        <Callout tone="warning">This check is split. Undo the split before moving it.</Callout>
      ) : (
        <Stack gap={0.75}>
          {others.map((v) => (
            <ButtonBase
              key={v}
              data-transfer-to={v}
              aria-pressed={to === v}
              onClick={() => setTo(v)}
              sx={{ justifyContent: 'flex-start', gap: 1.25, p: '12px 14px', borderRadius: `${radius.md}px`, border: `1.5px solid ${to === v ? md3.primary : md3.outlineVariant}`, bgcolor: to === v ? md3.primaryContainer : '#fff', textAlign: 'left' }}
            >
              <Icon name="store" size={20} color={to === v ? md3.primary : md3.onSurfaceVariant} />
              <Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{VENUES[v].name}</Typography>
                <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>{VENUES[v].courses.map((c) => c.name).join(' · ')}</Typography>
              </Box>
            </ButtonBase>
          ))}
        </Stack>
      )}
      <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 1.25 }}>
        The order leaves this register and waits on the other course’s, under Arrived from another course.
      </Typography>
    </ModalFrame>
  );
}
