import { useMemo, useState } from 'react';
import { Box, ButtonBase, Divider, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { PR_CONFIG } from '../data/config';
import * as cart from '../logic/cart';
import { selectedBooking } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import { Icon, SectionLabel } from '../components/primitives';
import { Callout, FilledButton, ModalFrame, OutlineButton } from './ModalFrame';
import { Stack } from '../components/Stack';

/**
 * Checkout — the receipt on the left, the numeric keypad on the right.
 *
 * The keypad has two modes because a counter operator does two different arithmetic
 * jobs here: entering the cash tendered (to compute change) and entering a tip. One
 * pad serves both, and the mode switch makes clear which number is being edited.
 *
 * Tips are staged rather than applied: they change the charge total, so the operator
 * has to Recalculate before the balance moves. That's what stops a mistyped tip from
 * silently becoming the amount charged.
 */
export function Checkout() {
  const { state, dispatch, toast } = usePos();
  const booking = selectedBooking(state);

  const base = useMemo(() => {
    const gross = cart.payableTotal(state.cart);
    const discounts = cart.checkoutDiscounts(state.cart);
    const subtotal = gross - discounts;
    const explicitTax = cart.cartTotals(state.cart).tax;
    // Rounds loaded from the tee sheet arrive with their own tax line; ad-hoc
    // retail orders don't, so tax is computed for those.
    const tax = explicitTax > 0 ? explicitTax : cart.salesTax(gross);
    return { gross, discounts, subtotal, tax, total: +(gross + tax).toFixed(2) };
  }, [state.cart]);

  const [mode, setMode] = useState<'tendered' | 'tip'>('tendered');
  const [tenderedDigits, setTenderedDigits] = useState('');
  const [tipDigits, setTipDigits] = useState('');
  const [bakedTip, setBakedTip] = useState(0);

  const stagedTip = tipDigits ? parseInt(tipDigits, 10) / 100 : 0;
  const chargeTotal = +(base.total + bakedTip).toFixed(2);
  const tendered = tenderedDigits ? parseInt(tenderedDigits, 10) / 100 : 0;
  const change = Math.max(0, +(tendered - chargeTotal).toFixed(2));
  const tipPending = stagedTip !== bakedTip;

  const press = (key: string) => {
    const [digits, setDigits] =
      mode === 'tendered' ? [tenderedDigits, setTenderedDigits] : [tipDigits, setTipDigits];

    if (key === 'clear') return setDigits('');
    if (key === 'back') return setDigits(digits.slice(0, -1));
    if (key === 'exact') {
      setMode('tendered');
      return setTenderedDigits(String(Math.round(chargeTotal * 100)));
    }
    if (digits.length >= 7) return;
    setDigits((digits + key).replace(/^0+(?=\d)/, ''));
  };

  const lines = state.cart.filter((i) => !i.isTax && i.name !== 'Taxes');

  return (
    <ModalFrame
      width={760}
      tall
      title="Checkout"
      subtitle={booking ? `${booking.name} · ${booking.conf}` : 'Walk-in order'}
      icon="point_of_sale"
      actions={
        <>
          <OutlineButton onClick={() => toast('Split evenly — coming soon')}>Split evenly</OutlineButton>
          <OutlineButton onClick={() => toast('Service charge — coming soon')}>
            Service charge
          </OutlineButton>
          <Box sx={{ flex: 1 }} />
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
        </>
      }
    >
      <Stack direction="row" gap={2.5} sx={{ alignItems: 'flex-start' }}>
        {/* ── Receipt ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SectionLabel color={md3.outline} sx={{ mb: 1 }}>
            Order
          </SectionLabel>
          <Box
            sx={{
              border: `1.5px solid ${md3.outlineVariant}`,
              borderRadius: `${radius.md}px`,
              overflow: 'hidden',
              mb: 2,
            }}
          >
            {lines.map((item, i) => {
              const lineTotal = item.isCheckIn
                ? (item.players ?? []).reduce(
                    (s, p) => s + cart.playerPrice(item.unitPrice ?? 0, p),
                    0,
                  )
                : item.price * item.qty;
              return (
                <Box key={i} sx={{ p: '10px 12px', borderBottom: `1px solid ${md3.surfaceContainer}`, '&:last-of-type': { borderBottom: 'none' } }}>
                  <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                      {item.isCheckIn ? item.name : `${item.qty}× ${item.name}`}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                      {cart.money(lineTotal)}
                    </Typography>
                  </Stack>
                  {item.isCheckIn &&
                    (item.players ?? []).map((p, pi) => {
                      const b = cart.playerBreakdown(item.unitPrice ?? 0, p);
                      return (
                        <Stack
                          key={pi}
                          direction="row"
                          alignItems="baseline"
                          justifyContent="space-between"
                          sx={{ pl: 1.5, fontSize: 11, color: md3.onSurfaceVariant, mt: '2px' }}
                        >
                          <span>
                            {p.name}
                            {p.modifierTags?.length ? ` · ${p.modifierTags.map((t) => t.tag).join(', ')}` : ''}
                          </span>
                          <span>{cart.money(b.total)}</span>
                        </Stack>
                      );
                    })}
                </Box>
              );
            })}
          </Box>

          <Stack gap={0.5} sx={{ fontSize: 12.5 }}>
            <Row label="Discounts" value={base.discounts > 0 ? `-${cart.money(base.discounts)}` : '$0.00'} color={base.discounts > 0 ? md3.error : undefined} />
            <Row label="Subtotal" value={cart.money(base.subtotal)} />
            <Row label="Tax" value={cart.money(base.tax)} />
            {bakedTip > 0 && <Row label="Tip" value={cart.money(bakedTip)} />}
            <Divider sx={{ my: 0.75 }} />
            <Row label="Total" value={cart.money(chargeTotal)} bold />
            {tendered > 0 && (
              <>
                <Row label="Tendered" value={cart.money(tendered)} />
                <Row
                  label="Change due"
                  value={cart.money(change)}
                  bold
                  color={change > 0 ? '#16a34a' : undefined}
                />
              </>
            )}
          </Stack>

          {tipPending && (
            <Box sx={{ mt: 1.5 }}>
              <Callout tone="warning">
                A {cart.money(stagedTip)} tip is staged. Recalculate to add it to the charge.
              </Callout>
              <Stack direction="row" gap={0.75} sx={{ mt: 1 }}>
                <FilledButton
                  onClick={() => {
                    setBakedTip(stagedTip);
                    toast(`Tip added · ${cart.money(stagedTip)}`);
                  }}
                >
                  Recalculate
                </FilledButton>
                <OutlineButton onClick={() => setTipDigits(String(Math.round(bakedTip * 100)) || '')}>
                  Discard
                </OutlineButton>
              </Stack>
            </Box>
          )}
        </Box>

        {/* ── Keypad ── */}
        <Box sx={{ width: 300, flexShrink: 0 }}>
          <Stack direction="row" gap={0.75} sx={{ mb: 1.25 }}>
            {(['tendered', 'tip'] as const).map((m) => (
              <ButtonBase
                key={m}
                onClick={() => setMode(m)}
                sx={{
                  flex: 1,
                  py: 0.875,
                  borderRadius: `${radius.md}px`,
                  border: `1.5px solid ${mode === m ? md3.primary : md3.outlineVariant}`,
                  bgcolor: mode === m ? md3.primaryContainer : '#fff',
                  color: mode === m ? md3.primary : md3.onSurfaceVariant,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {m === 'tendered' ? 'Amount tendered' : 'Tip'}
              </ButtonBase>
            ))}
          </Stack>

          <Box
            sx={{
              p: '14px 16px',
              bgcolor: md3.surfaceContainer,
              borderRadius: `${radius.md}px`,
              mb: 1.25,
              textAlign: 'right',
            }}
          >
            <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant, fontWeight: 700 }}>
              {mode === 'tendered' ? 'Tendered' : 'Tip'}
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15 }}>
              {cart.money(mode === 'tendered' ? tendered : stagedTip)}
            </Typography>
            <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant, mt: 0.25 }}>
              Balance due {cart.money(chargeTotal)}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0.75 }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'].map((k) => (
              <ButtonBase
                key={k}
                onClick={() => press(k)}
                sx={{
                  py: 1.5,
                  borderRadius: `${radius.md}px`,
                  border: `1.5px solid ${md3.outlineVariant}`,
                  bgcolor: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  '&:hover': { bgcolor: md3.surfaceContainer },
                }}
              >
                {k === 'back' ? <Icon name="backspace" size={18} /> : k}
              </ButtonBase>
            ))}
          </Box>

          <Stack direction="row" gap={0.75} sx={{ mt: 0.75 }}>
            <OutlineButton onClick={() => press('clear')}>Clear</OutlineButton>
            <OutlineButton onClick={() => press('exact')}>Exact amount</OutlineButton>
          </Stack>

          <SectionLabel color={md3.outline} sx={{ mt: 2.25, mb: 1 }}>
            Take payment
          </SectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 0.75 }}>
            {Object.entries(PR_CONFIG).map(([method, cfg]) => (
              <ButtonBase
                key={method}
                onClick={() =>
                  dispatch({ type: 'openModal', modal: { kind: 'paymentReader', method } })
                }
                sx={{
                  flexDirection: 'column',
                  gap: 0.5,
                  py: 1.5,
                  borderRadius: `${radius.md}px`,
                  border: `1.5px solid ${md3.outlineVariant}`,
                  bgcolor: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  color: md3.onSurfaceVariant,
                  '&:hover': { borderColor: md3.primary, color: md3.primary, bgcolor: md3.primaryContainer },
                }}
              >
                <Icon name={cfg.icon} size={20} />
                {method === 'giftcert' ? 'Gift cert' : method === 'cashpay' ? 'Other' : method}
              </ButtonBase>
            ))}
          </Box>
        </Box>
      </Stack>
    </ModalFrame>
  );
}

function Row({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography sx={{ fontSize: bold ? 14 : 12.5, fontWeight: bold ? 800 : 400, color: md3.onSurfaceVariant }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: bold ? 14 : 12.5, fontWeight: bold ? 800 : 600, color: color ?? md3.onSurface }}>
        {value}
      </Typography>
    </Stack>
  );
}

// ─── Payment reader ─────────────────────────────────────────────────────────

/**
 * The terminal-side payment flow, in three stages: prompt → processing → approved.
 *
 * Modelled as explicit stages rather than a spinner-then-done because the prototype
 * demonstrates what staff see on the customer-facing reader, and each stage has its
 * own copy and affordances (key-in is only offered while waiting for the card).
 */
export function PaymentReader({ method }: { method: string }) {
  const { state, dispatch, toast } = usePos();
  const cfg = PR_CONFIG[method] ?? PR_CONFIG.card;
  const [stage, setStage] = useState<1 | 2 | 3>(1);

  const amount = +(cart.payableTotal(state.cart) + cart.salesTax(cart.payableTotal(state.cart))).toFixed(2);

  const advance = () => {
    if (stage === 1) {
      setStage(2);
      // A short delay stands in for the reader round-trip so the processing state
      // is actually observable rather than flashing past.
      window.setTimeout(() => setStage(3), 900);
      return;
    }
    if (stage === 3) {
      dispatch({ type: 'recordPayment', method, amount });
      dispatch({ type: 'closeModal' });
      toast(`Payment approved · ${cart.money(amount)}`);
    }
  };

  return (
    <ModalFrame
      width={420}
      title={cfg.title}
      subtitle={cfg.subtitle}
      icon={cfg.icon}
      actions={
        stage === 1 ? (
          <>
            {cfg.showKeyIn && <OutlineButton onClick={() => toast('Key-in — coming soon')}>Key in</OutlineButton>}
            <Box sx={{ flex: 1 }} />
            <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
            <FilledButton onClick={advance}>
              {method.startsWith('cash') ? 'Cash received' : 'Simulate tap'}
            </FilledButton>
          </>
        ) : stage === 3 ? (
          <>
            <OutlineButton onClick={() => toast('Receipt printed ✓')}>Print receipt</OutlineButton>
            <Box sx={{ flex: 1 }} />
            <FilledButton onClick={advance}>Done</FilledButton>
          </>
        ) : undefined
      }
    >
      <Stack alignItems="center" gap={2} sx={{ py: 3 }}>
        <Box
          sx={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: stage === 3 ? '#dcfce7' : md3.surfaceContainer,
            transition: 'background .2s',
          }}
        >
          <Icon
            name={stage === 3 ? 'check_circle' : stage === 2 ? 'sync' : cfg.icon}
            size={40}
            color={stage === 3 ? '#16a34a' : md3.onSurfaceVariant}
            sx={stage === 2 ? { animation: 'spin 1s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } } : undefined}
          />
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 28, fontWeight: 800 }}>{cart.money(amount)}</Typography>
          <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant, mt: 0.5 }}>
            {stage === 1 ? cfg.subtitle : stage === 2 ? 'Processing…' : 'Approved'}
          </Typography>
        </Box>

        {stage === 1 && method === 'card' && (
          <Stack direction="row" gap={2} sx={{ color: md3.outline }}>
            <Icon name="credit_card" size={22} />
            <Icon name="contactless" size={22} />
          </Stack>
        )}
        {stage === 3 && (
          <Box sx={{ width: '100%' }}>
            <Callout tone="success">
              Approved · {method} · {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </Callout>
          </Box>
        )}
      </Stack>
    </ModalFrame>
  );
}
