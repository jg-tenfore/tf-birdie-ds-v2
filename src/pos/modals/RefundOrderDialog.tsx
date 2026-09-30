import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, payBadges, radius } from '../../theme/tokens';
import { money } from '../logic/cart';
import { allRefundable, refundAmount, refundableQty, refundTender } from '../logic/orders';
import { orderItems, tenderLabel } from '../logic/order-lookup';
import { eventById, lookupOrder, type OperationsModal } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { Icon } from '../components/primitives';
import { Stack } from '../components/Stack';
import { Callout, Field, FilledButton, ModalFrame, ModalSection, OutlineButton, PillGroup } from './ModalFrame';

/**
 * Refund an order (V1 → V2, Wave 3) — the whole of it, or chosen lines and how many of each.
 *
 * Justin's call: **back to the original tender**, which `refundTender` decides (the one that paid
 * the most), so the dialog *says* where the money goes rather than asking. A choice there is how a
 * card sale gets refunded in cash from the drawer.
 *
 * The amount shown is what `refundOrder` will record, to the cent: the goods plus their share of the
 * order's tax (`refundAmount`), so refunding every line one at a time adds up to the whole.
 *
 * v1 had no refund at all — Order Lookup found an order and stopped.
 */
const REASONS = ['Returned', 'Damaged', 'Wrong item', 'Charged twice', 'Unhappy with it'];

export function RefundOrderDialog({ m }: { m: Extract<OperationsModal, { kind: 'refundOrder' }> }) {
  const { state, dispatch, toast } = usePos();
  // Includes a tee time paid before the session, which has no record until its first refund.
  const order = lookupOrder(state, m.orderNumber);
  const [mode, setMode] = useState<'whole' | 'lines'>('whole');
  const [qty, setQty] = useState<Record<number, number>>({});
  const [reason, setReason] = useState('');
  if (!order) return null;

  const close = () => dispatch({ type: 'closeModal' });
  const all = allRefundable(order);
  const picks = mode === 'whole' ? all : Object.entries(qty).map(([i, q]) => ({ index: Number(i), qty: q })).filter((p) => p.qty > 0);
  const amount = refundAmount(order, picks);
  const goods = picks.reduce((s, p) => {
    const l = order.lines[p.index];
    return s + (l.isCheckIn ? (l.unitPrice ?? l.price) : l.price) * p.qty;
  }, 0);
  const tax = Math.max(0, Math.round((amount - goods) * 100) / 100);
  const tender = refundTender(order);
  const to = tender ? tenderLabel(tender.method, tender.ref, eventById(state, tender.ref?.eventId)?.name) : '';

  const refund = () => {
    if (amount <= 0) return;
    dispatch({ type: 'refundOrder', orderNumber: order.orderNumber, picks: mode === 'whole' ? undefined : picks, reason: reason || undefined });
    close();
    toast(`Refunded ${money(amount)} to ${to}`);
  };

  const set = (index: number, n: number) => setQty((q) => ({ ...q, [index]: Math.max(0, Math.min(refundableQty(order, index), n)) }));

  return (
    <ModalFrame
      title={`Refund · ${order.orderNumber}`}
      subtitle={`${order.label} · ${order.time}`}
      icon="assignment_return"
      width={560}
      onClose={close}
      actions={
        <>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
          <Box sx={{ flex: 1 }} />
          <FilledButton onClick={refund} disabled={amount <= 0}>
            {amount > 0 ? `Refund ${money(amount)}` : 'Pick what to refund'}
          </FilledButton>
        </>
      }
    >
      <Box sx={{ mb: 2 }}>
        <PillGroup
          value={mode}
          onChange={setMode}
          options={[
            { label: 'Whole order', value: 'whole' },
            { label: 'Choose lines', value: 'lines' },
          ]}
        />
      </Box>

      <ModalSection title="What goes back" hint={mode === 'lines' ? 'How many of each' : undefined}>
        <Box sx={{ border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, overflow: 'hidden' }}>
          {orderItems(order).map(({ line, index }) => {
            const left = refundableQty(order, index);
            const n = mode === 'whole' ? left : (qty[index] ?? 0);
            return (
              <Stack
                key={index}
                direction="row"
                alignItems="center"
                gap={1}
                data-refund-line={index}
                data-refundable={left}
                sx={{
                  p: '8px 12px',
                  minHeight: 52,
                  borderBottom: `1px solid ${md3.surfaceContainer}`,
                  '&:last-of-type': { borderBottom: 'none' },
                  opacity: left === 0 ? 0.5 : 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{line.name}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: left === 0 ? payBadges.refund.text : md3.onSurfaceVariant }}>
                    {left === 0 ? (line.dish?.voided ? 'Voided — nothing to refund' : 'Already refunded') : `${left} of ${line.qty} can go back`}
                  </Typography>
                </Box>
                {mode === 'lines' && left > 0 ? (
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <Step label={`One fewer ${line.name}`} icon="remove" disabled={n <= 0} onClick={() => set(index, n - 1)} />
                    <Typography sx={{ width: 28, textAlign: 'center', fontSize: 15, fontWeight: 800 }} data-refund-qty>
                      {n}
                    </Typography>
                    <Step label={`One more ${line.name}`} icon="add" disabled={n >= left} onClick={() => set(index, n + 1)} />
                  </Stack>
                ) : (
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: md3.onSurfaceVariant }}>{n > 0 ? `${n}×` : '—'}</Typography>
                )}
              </Stack>
            );
          })}
        </Box>
      </ModalSection>

      <ModalSection title="Reason" hint="Optional — it prints on the refund slip">
        <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap', mb: 1 }}>
          {REASONS.map((r) => (
            <ButtonBase
              key={r}
              aria-pressed={reason === r}
              onClick={() => setReason(reason === r ? '' : r)}
              sx={{
                height: 40,
                px: 1.5,
                borderRadius: `${radius.xl}px`,
                border: `1.5px solid ${reason === r ? md3.primary : md3.outlineVariant}`,
                bgcolor: reason === r ? md3.primaryContainer : '#fff',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {r}
            </ButtonBase>
          ))}
        </Stack>
        <Field value={reason} onChange={setReason} placeholder="Or type one" />
      </ModalSection>

      <Stack gap={0.5} sx={{ p: '12px 14px', borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer, mb: 1.5 }} data-refund-amount>
        <Row label="Goods" value={money(goods)} />
        <Row label="Their share of the tax" value={money(tax)} />
        <Row label="Refund" value={money(amount)} strong />
      </Stack>

      {tender && (
        <Callout tone="info" icon="keyboard_return">
          <span data-refund-tender>Goes back to {to}</span> — the tender that paid for it.
        </Callout>
      )}
    </ModalFrame>
  );
}

function Step({ label, icon, disabled, onClick }: { label: string; icon: string; disabled: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      sx={{ width: 40, height: 40, borderRadius: '50%', border: `1.5px solid ${md3.outlineVariant}`, '&.Mui-disabled': { opacity: 0.35 } }}
    >
      <Icon name={icon} size={18} />
    </ButtonBase>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography sx={{ fontSize: strong ? 14 : 12.5, fontWeight: strong ? 800 : 500, color: strong ? md3.onSurface : md3.onSurfaceVariant }}>{label}</Typography>
      <Typography sx={{ fontSize: strong ? 14 : 12.5, fontWeight: strong ? 800 : 600 }}>{value}</Typography>
    </Stack>
  );
}
