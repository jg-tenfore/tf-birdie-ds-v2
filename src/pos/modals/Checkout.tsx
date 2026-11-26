import { useState } from 'react';
import { Box, ButtonBase, Divider, Menu, MenuItem, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { PR_CONFIG } from '../data/config';
import * as cart from '../logic/cart';
import { selectedBooking } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import { Icon, SectionLabel } from '../components/primitives';
import { Callout, Field, FilledButton, ModalFrame, OutlineButton } from './ModalFrame';
import { Stack } from '../components/Stack';
import { demoNow } from '../data/bookings';
import { tabById } from '../state/restaurant';
import { amountDue, dueNow, registerTotals, type OperationsModal } from '../state/operations';
import { useV1V2 } from '../edition';
import { ReceiptSlip } from '../components/ReceiptSlip';
import type { TenderKey } from '../state/settings';
import { tenderLabel } from '../logic/order-lookup';
import { CREDIT_ICONS, CREDIT_KINDS, CREDIT_NAMES } from '../logic/credit-tenders';
import { cardSurcharge, isPricing, type Pricing } from '../logic/pricing';
import { currentPart, pricingOf } from '../state/checkout';

/**
 * V1 → V2, Wave 3: the tenders that are not a card reader. Each opens its own dialog, which pays
 * the order — or, for a gift card that does not cover it, part of it.
 */
const OPS_TENDERS: { kind: OperationsModal['kind']; label: string; icon: string }[] = [
  { kind: 'tenderGiftCard', label: 'Gift card', icon: 'card_giftcard' },
  { kind: 'tenderHouseAccount', label: 'House account', icon: 'account_balance' },
  { kind: 'tenderCardOnFile', label: 'Card on file', icon: 'credit_score' },
  { kind: 'tenderEvent', label: 'Charge to event', icon: 'calendar_month' },
  { kind: 'tenderCheck', label: 'Check', icon: 'receipt' },
];

/** Which Settings switch each of the tenders above answers to. */
const TENDER_SETTING: Record<string, TenderKey> = {
  tenderGiftCard: 'giftcard',
  tenderHouseAccount: 'house',
  tenderCardOnFile: 'cardonfile',
  tenderEvent: 'event',
  tenderCheck: 'check',
};


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
export function Checkout({ tip: carried = 0 }: { tip?: number } = {}) {
  const { state, dispatch, toast } = usePos();
  const booking = selectedBooking(state);
  const v1v2 = useV1V2();
  // What is left to pay: the total, less any part already paid (V1 → V2, Wave 3) — or, on a split
  // check (Nov 26), what is left of the part being paid.
  const due = dueNow(state);
  const checkSplit = state.checkSplit;
  const payingPart = currentPart(checkSplit);
  const split = state.splitTender;
  // Settings (V1 → V2): which tenders checkout offers, and the tip presets.
  const { tenders: tenderSwitches, tipPresets } = state.terminalSettings.checkout;
  const offered = (key: string) => tenderSwitches[key as TenderKey] !== false;

  // The one order total (`orderTotals`): golf taxed by its booking's tax line, everything
  // else at the sales-tax rate — or, in V1 → V2, by Buck's tax per line with Buck's service charges
  // (`pricingOf`). The register's Pay button, this receipt and the reader all read it, so they
  // can't disagree — before, this added the golf tax twice.
  const totals = registerTotals(state);
  const base = { discounts: Math.abs(totals.discount), subtotal: totals.subtotal, tax: totals.tax, total: totals.total };

  const [mode, setMode] = useState<'tendered' | 'tip'>('tendered');
  const [creditsAnchor, setCreditsAnchor] = useState<HTMLElement | null>(null);
  const [tenderedDigits, setTenderedDigits] = useState('');
  // A tip already recalculated in comes back with checkout when a gift card paid part (V1 → V2).
  const [tipDigits, setTipDigits] = useState(carried > 0 ? String(Math.round(carried * 100)) : '');
  const [bakedTip, setBakedTip] = useState(carried);

  const stagedTip = tipDigits ? parseInt(tipDigits, 10) / 100 : 0;
  const chargeTotal = +(due + bakedTip).toFixed(2);
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

  // Service charges are totals rows, not lines (V1 → V2); index kept so a line's discount can be found.
  const lines = state.cart.map((item, index) => ({ item, index })).filter(({ item: i }) => !i.isTax && i.name !== 'Taxes' && !i.serviceCharge);
  const discountOf = (id: string) => totals.discountLines?.find((d) => d.id === id);

  return (
    <ModalFrame
      width={760}
      tall
      title="Checkout"
      subtitle={
        booking
          ? `${booking.name} · ${booking.conf}`
          : // A restaurant tab being paid is not a walk-in (V1 → V2): say whose it is.
            (tabById(state, state.payingTabId)?.name ?? 'Walk-in order')
      }
      icon="point_of_sale"
      actions={
        v1v2 ? (
          // Nov 26: split by item or evenly, a service charge by hand, a discount on the order.
          <>
            <OutlineButton disabled={Boolean(state.splitTender)} onClick={() => dispatch({ type: 'openModal', modal: { kind: 'splitCheck', ...(bakedTip > 0 && { tip: bakedTip }) } })}>
              Split
            </OutlineButton>
            <OutlineButton disabled={Boolean(state.splitTender)} onClick={() => dispatch({ type: 'openModal', modal: { kind: 'serviceCharge', ...(bakedTip > 0 && { tip: bakedTip }) } })}>
              Service charge
            </OutlineButton>
            <OutlineButton disabled={Boolean(state.splitTender)} onClick={() => dispatch({ type: 'openModal', modal: { kind: 'orderDiscount', tab: 'types' } })}>
              Discount
            </OutlineButton>
            <Box sx={{ flex: 1 }} />
            <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          </>
        ) : (
        <>
          <OutlineButton onClick={() => toast('Split evenly — coming soon')}>Split evenly</OutlineButton>
          <OutlineButton onClick={() => toast('Service charge — coming soon')}>
            Service charge
          </OutlineButton>
          <Box sx={{ flex: 1 }} />
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
        </>
        )
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
            {lines.map(({ item, index }, i) => {
              const lineOff = discountOf(`line-${index}`);
              const orderOff = item.orderDiscount ? discountOf(`order-${index}`) : undefined;
              const lineTotal = item.orderDiscount
                ? (orderOff?.amount ?? 0)
                : item.isCheckIn
                ? (item.players ?? []).reduce(
                    (s, p) => s + cart.playerPrice(item.unitPrice ?? 0, p),
                    0,
                  )
                : item.price * item.qty;
              return (
                <Box key={i} sx={{ p: '10px 12px', borderBottom: `1px solid ${md3.surfaceContainer}`, '&:last-of-type': { borderBottom: 'none' } }}>
                  <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1} data-checkout-line={index}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                      {item.isCheckIn || item.orderDiscount ? item.name : `${item.qty}× ${item.name}`}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: lineTotal < 0 ? md3.error : undefined }}>
                      {cart.money(lineTotal)}
                    </Typography>
                  </Stack>
                  {/* A Buck discount on the line (V1 → V2), negative, by name. */}
                  {lineOff && (
                    <Stack direction="row" justifyContent="space-between" sx={{ pl: 1.5, fontSize: 11, color: md3.onSurfaceVariant, mt: '2px' }} data-checkout-line-discount={index}>
                      <span>{item.lineDiscount?.label}</span>
                      <Box component="span" sx={{ color: md3.error, fontWeight: 700 }}>
                        {cart.money(lineOff.amount)}
                      </Box>
                    </Stack>
                  )}
                  {item.priceOverride && (
                    <Box sx={{ pl: 1.5, fontSize: 11, color: md3.onSurfaceVariant }}>
                      Price override · was {cart.money(item.priceOverride.from)} each
                    </Box>
                  )}
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

          {/* A split check (Nov 26): its parts, which are paid, and which one this tender pays. */}
          {checkSplit && (
            <Box data-check-split={checkSplit.mode} sx={{ border: `1.5px solid ${md3.primary}`, borderRadius: `${radius.md}px`, p: '8px 12px', mb: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <SectionLabel color={md3.primary}>
                  Split {checkSplit.mode === 'even' ? `evenly ${checkSplit.parts.length} ways` : 'by item'}
                </SectionLabel>
                {!state.splitTender && (
                  <ButtonBase onClick={() => dispatch({ type: 'cancelSplit' })} sx={{ fontSize: 11.5, fontWeight: 700, color: md3.primary }}>
                    Undo split
                  </ButtonBase>
                )}
              </Stack>
              {checkSplit.parts.map((p, i) => {
                const paid = checkSplit.paid[i] >= p.amount - 0.004;
                return (
                  <Stack key={i} data-split-part={i} data-split-part-state={paid ? 'paid' : i === payingPart ? 'paying' : 'due'} direction="row" justifyContent="space-between" sx={{ fontSize: 12, py: '1px', fontWeight: i === payingPart && !paid ? 800 : 500 }}>
                    <span>
                      {p.label}
                      {paid ? ' · paid' : i === payingPart ? ' · paying now' : ''}
                    </span>
                    <span>{cart.money(p.amount)}</span>
                  </Stack>
                );
              })}
            </Box>
          )}

          <Stack gap={0.5} sx={{ fontSize: 12.5 }}>
            <Row label="Discounts" value={base.discounts > 0 ? cart.creditMoney(base.discounts) : '$0.00'} color={base.discounts > 0 ? md3.error : undefined} />
            <Row label="Subtotal" value={cart.money(base.subtotal)} />
            {/* Buck's service charges (V1 → V2, Nov 26), each its own line. */}
            {(totals.serviceCharges ?? []).map((c) => (
              <Box key={c.id} data-service-charge={c.id} sx={{ display: 'contents' }}>
                <Row label={c.label} value={cart.money(c.amount)} />
              </Box>
            ))}
            {totals.taxes ? (
              // Buck's tax per line, by type: Sales Tax, Alcohol Tax, Food Tax when it has a rate of its own.
              totals.taxes.length === 0 ? (
                <Row label={totals.exempt ? 'Tax (exempt)' : 'Tax'} value={cart.money(0)} />
              ) : (
                totals.taxes.map((t) => (
                  <Box key={t.id} data-tax-line={t.id} sx={{ display: 'contents' }}>
                    <Row label={t.label} value={cart.money(t.amount)} />
                  </Box>
                ))
              )
            ) : (
              <Row label="Tax" value={cart.money(base.tax)} />
            )}
            {bakedTip > 0 && <Row label="Tip" value={cart.money(bakedTip)} />}
            <Divider sx={{ my: 0.75 }} />
            {split ? (
              // Part paid: the order's total, what each tender has paid, and what is left.
              <Box data-split-tender sx={{ display: 'contents' }}>
                <Row label="Order total" value={cart.money(base.total)} />
                {split.tenders.map((t) => (
                  <Row
                    key={t.paymentId}
                    label={`Paid · ${tenderLabel(t.method, t.ref)}`}
                    value={cart.creditMoney(t.amount)}
                    color="#16a34a"
                  />
                ))}
                <Row label={checkSplit ? `${checkSplit.parts[payingPart]?.label ?? 'This part'} due` : 'Balance due'} value={cart.money(chargeTotal)} bold />
              </Box>
            ) : (
              <Row label={checkSplit ? `${checkSplit.parts[payingPart]?.label ?? 'This part'} due` : 'Total'} value={cart.money(chargeTotal)} bold />
            )}
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
              position: 'relative',
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
            {/* Settings' tip presets (V1 → V2), one tap each, in the space the readout leaves. */}
            {v1v2 && mode === 'tip' && (
              <Stack gap={0.5} sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
                {tipPresets.map((pct) => (
                  <ButtonBase
                    key={pct}
                    data-checkout-tip-preset={pct}
                    onClick={() => setTipDigits(String(Math.round(base.total * pct)))}
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: `${radius.xl}px`,
                      border: `1.5px solid ${md3.outlineVariant}`,
                      bgcolor: '#fff',
                      fontSize: 11.5,
                      fontWeight: 700,
                      '&:hover': { borderColor: md3.primary, color: md3.primary },
                    }}
                  >
                    {pct}%
                  </ButtonBase>
                ))}
              </Stack>
            )}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0.75 }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'].map((k) => (
              <ButtonBase
                key={k}
                onClick={() => press(k)}
                sx={{
                  py: v1v2 ? 1.125 : 1.5,
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
          {/* V1 → V2 has nine tenders; three across keeps them all above the fold, not behind a scroll. */}
          <Box sx={{ display: 'grid', gridTemplateColumns: v1v2 ? 'repeat(3,1fr)' : 'repeat(2,1fr)', gap: 0.75 }}>
            {Object.entries(PR_CONFIG)
              // V1 → V2 spends real gift cards (Gift card, below); the prototype's "Gift cert" stand-in
              // only ran the reader animation, and beside the real one it is a wrong tap waiting to happen.
              .filter(([method]) => !(v1v2 && method === 'giftcert'))
              // Settings (V1 → V2) can turn a tender off.
              .filter(([method]) => !v1v2 || offered(method))
              .map(([method, cfg]) => (
              <ButtonBase
                key={method}
                onClick={() =>
                  // The reader charges this checkout's total, tip included.
                  dispatch({ type: 'openModal', modal: { kind: 'paymentReader', method, ...(bakedTip > 0 && { tip: bakedTip }) } })
                }
                sx={{
                  flexDirection: 'column',
                  gap: 0.5,
                  py: v1v2 ? 0.875 : 1.5,
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
            {v1v2 &&
              OPS_TENDERS.filter((t) => offered(TENDER_SETTING[t.kind])).map((t) => (
                <ButtonBase
                  key={t.kind}
                  data-tender={t.kind}
                  // The tip goes with the tender, as it does to the card reader.
                  onClick={() => dispatch({ type: 'openModal', modal: { kind: t.kind, ...(bakedTip > 0 && { tip: bakedTip }) } as OperationsModal })}
                  sx={{
                    flexDirection: 'column',
                    gap: 0.5,
                    py: 0.875,
                    textAlign: 'center',
                    lineHeight: 1.2,
                    borderRadius: `${radius.md}px`,
                    border: `1.5px solid ${md3.outlineVariant}`,
                    bgcolor: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    color: md3.onSurfaceVariant,
                    '&:hover': { borderColor: md3.primary, color: md3.primary, bgcolor: md3.primaryContainer },
                  }}
                >
                  <Icon name={t.icon} size={20} />
                  {t.label}
                </ButtonBase>
              ))}
            {/* Credits as tenders (Nov 26): one tile, so every tender stays above the fold on the
                Clover Mini — the customer's rain checks, punch cards, credit books and lesson credits. */}
            {v1v2 && CREDIT_KINDS.some((k) => offered(k)) && (
              <ButtonBase
                data-tender="credits"
                aria-haspopup="menu"
                onClick={(e) => setCreditsAnchor(e.currentTarget)}
                sx={{
                  flexDirection: 'column',
                  gap: 0.5,
                  py: 0.875,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  borderRadius: `${radius.md}px`,
                  border: `1.5px solid ${creditsAnchor ? md3.primary : md3.outlineVariant}`,
                  bgcolor: creditsAnchor ? md3.primaryContainer : '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  color: creditsAnchor ? md3.primary : md3.onSurfaceVariant,
                  '&:hover': { borderColor: md3.primary, color: md3.primary, bgcolor: md3.primaryContainer },
                }}
              >
                <Icon name="redeem" size={20} />
                Credits
              </ButtonBase>
            )}
          </Box>
          <Menu anchorEl={creditsAnchor} open={Boolean(creditsAnchor)} onClose={() => setCreditsAnchor(null)} slotProps={{ paper: { sx: { width: 220 } } }}>
            {CREDIT_KINDS.filter((k) => offered(k)).map((k) => (
              <MenuItem
                key={k}
                data-tender={`credit-${k}`}
                onClick={() => {
                  setCreditsAnchor(null);
                  dispatch({ type: 'openModal', modal: { kind: 'tenderCredit', credit: k, ...(bakedTip > 0 && { tip: bakedTip }) } });
                }}
                sx={{ gap: 1.25, fontSize: 13.5, fontWeight: 600 }}
              >
                <Icon name={CREDIT_ICONS[k]} size={18} color={md3.onSurfaceVariant} />
                {CREDIT_NAMES[k]}
              </MenuItem>
            ))}
          </Menu>

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
export function PaymentReader({ method, tip = 0 }: { method: string; tip?: number }) {
  const { state, dispatch, toast } = usePos();
  const cfg = PR_CONFIG[method] ?? PR_CONFIG.card;
  // `key`: the card typed in by hand (V1 → V2, Nov 26) instead of tapped.
  const [stage, setStage] = useState<1 | 'key' | 2 | 3>(1);
  const [keyed, setKeyed] = useState<string | null>(null);
  // Settings (V1 → V2): the receipt shows on the done step, and prints by "Receipts after a sale".
  const v1v2 = useV1V2();
  const { hardware, checkout: checkoutSettings } = state.terminalSettings;
  const printing = v1v2 ? hardware.printReceipts : 'ask';

  // Exactly the checkout total — `orderTotals` plus the tip checkout recalculated in. No
  // second tax: the reader used to add a flat 8% on top of an amount that already had it.
  // Less any part already paid by another tender (V1 → V2, Wave 3) — and, on a split check, only
  // the part being paid (Nov 26).
  const due = dueNow(state);
  const isPart = Boolean(state.checkSplit) && due < amountDue(state) - 0.005;
  // Buck's Credit Card Surcharge (V1 → V2, Nov 26) on a card — 0% at this club unless Buck pushes a rate.
  const surcharge = method === 'card' ? cardSurcharge(due, pricingOf(state)) : 0;
  const amount = +(due + tip + surcharge).toFixed(2);

  const advance = () => {
    if (stage === 1 || stage === 'key') {
      setStage(2);
      // A short delay stands in for the reader round-trip so the processing state
      // is actually observable rather than flashing past.
      window.setTimeout(() => {
        setStage(3);
        if (printing === 'always') toast(`Receipt printed · ${hardware.receiptPrinter}`);
      }, 900);
      return;
    }
    if (stage === 3) {
      // The tip travels apart from the amount, so Orders & Tips can adjust it later (V1 → V2).
      dispatch({
        type: 'recordPayment',
        method,
        amount,
        tip,
        ...(surcharge > 0 && { surcharge }),
        ...(keyed && { ref: { cardLast4: keyed.slice(-4), entry: 'keyed' as const } }),
      });
      // One part of a split paid: back to checkout for the next.
      dispatch(isPart ? { type: 'openModal', modal: { kind: 'checkout' } } : { type: 'closeModal' });
      toast(isPart ? `Part paid · ${cart.money(amount)}` : `Payment approved · ${cart.money(amount)}`);
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
            {cfg.showKeyIn && (
              <OutlineButton onClick={() => (v1v2 ? setStage('key') : toast('Key-in — coming soon'))}>Key in</OutlineButton>
            )}
            <Box sx={{ flex: 1 }} />
            <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
            <FilledButton onClick={advance}>
              {method.startsWith('cash') ? 'Cash received' : 'Simulate tap'}
            </FilledButton>
          </>
        ) : stage === 'key' ? (
          <>
            <OutlineButton onClick={() => setStage(1)}>Back to the reader</OutlineButton>
            <Box sx={{ flex: 1 }} />
            <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          </>
        ) : stage === 3 ? (
          <>
            {printing !== 'never' && (
              <OutlineButton onClick={() => toast(v1v2 ? `Receipt printed · ${hardware.receiptPrinter}` : 'Receipt printed ✓')}>
                {printing === 'always' ? 'Reprint' : 'Print receipt'}
              </OutlineButton>
            )}
            <Box sx={{ flex: 1 }} />
            <FilledButton onClick={advance}>Done</FilledButton>
          </>
        ) : undefined
      }
    >
      {stage === 'key' ? (
        <KeyInCard
          amount={amount}
          onCharge={(number) => {
            setKeyed(number);
            advance();
          }}
        />
      ) : (
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
          {surcharge > 0 && (
            <Typography data-card-surcharge={surcharge.toFixed(2)} sx={{ fontSize: 12, color: md3.onSurfaceVariant, mt: 0.5 }}>
              Includes Credit Card Surcharge {isPricing(pricingOf(state)) ? (pricingOf(state) as Pricing).club.serviceCharges.card : 0}% · {cart.money(surcharge)}
            </Typography>
          )}
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
              Approved · {method} · {demoNow().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </Callout>
          </Box>
        )}
        {stage === 3 && v1v2 && (
          <ReceiptSlip
            header={checkoutSettings.receiptHeader}
            footer={checkoutSettings.receiptFooter}
            register={hardware.name}
            when={demoNow().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            lines={state.cart}
            totals={registerTotals(state)}
            tip={tip}
            surcharge={surcharge}
            tender={method === 'cashpay' ? 'Other' : tenderLabel(method, keyed ? { cardLast4: keyed.slice(-4), entry: 'keyed' } : undefined)}
            amount={amount}
            earlier={(state.splitTender?.tenders ?? []).map((t) => ({ label: tenderLabel(t.method, t.ref), amount: t.amount }))}
          />
        )}
      </Stack>
      )}
    </ModalFrame>
  );
}

/** Luhn's check — a mistyped card number fails it before the processor is asked. */
const luhn = (digits: string): boolean => {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
};

/**
 * The reader's **Key in** (V1 → V2, Nov 26): a card typed in when it will not tap or swipe — the
 * number, its expiry, the security code and the billing ZIP, checked before the charge goes out.
 * The payment records the last four and that it was keyed.
 */
function KeyInCard({ amount, onCharge }: { amount: number; onCharge: (number: string) => void }) {
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [zip, setZip] = useState('');
  const [tried, setTried] = useState(false);
  const digits = number.replace(/\D/g, '');
  const [mm, yy] = exp.split('/').map((x) => Number(x));
  const today = demoNow();
  const expOk = /^\d{2}\/\d{2}$/.test(exp) && mm >= 1 && mm <= 12 && new Date(2000 + yy, mm, 1).getTime() > today.getTime();
  const problems = [
    !(digits.length >= 13 && digits.length <= 19 && luhn(digits)) && 'That card number doesn’t check out.',
    !expOk && 'Expiry is MM/YY, and not in the past.',
    !/^\d{3,4}$/.test(cvv) && 'The security code is 3 or 4 digits.',
    !/^\d{5}$/.test(zip) && 'The billing ZIP is 5 digits.',
  ].filter(Boolean) as string[];
  return (
    <Box data-key-in sx={{ py: 1 }}>
      <Stack gap={1.25}>
        <Field autoFocus label="Card number" value={number} onChange={(v) => setNumber(v.replace(/[^\d ]/g, '').slice(0, 23))} placeholder="Typed from the card" />
        <Stack direction="row" gap={1}>
          <Field label="Expiry" value={exp} onChange={(v) => setExp(v.replace(/[^\d/]/g, '').slice(0, 5))} placeholder="MM/YY" />
          <Field label="Security code" value={cvv} onChange={(v) => setCvv(v.replace(/\D/g, '').slice(0, 4))} placeholder="CVV" />
          <Field label="Billing ZIP" value={zip} onChange={(v) => setZip(v.replace(/\D/g, '').slice(0, 5))} placeholder="ZIP" />
        </Stack>
      </Stack>
      {tried && problems.length > 0 && (
        <Box data-key-in-problems sx={{ mt: 1.25 }}>
          <Callout tone="warning">
            {problems.map((p) => (
              <Typography key={p} sx={{ fontSize: 12 }}>
                {p}
              </Typography>
            ))}
          </Callout>
        </Box>
      )}
      <Typography sx={{ fontSize: 11, color: md3.outline, mt: 1 }}>Demo: 4242 4242 4242 4242, any future expiry.</Typography>
      <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
        <FilledButton
          onClick={() => {
            setTried(true);
            if (problems.length === 0) onCharge(digits);
          }}
        >
          Charge {cart.money(amount)}
        </FilledButton>
      </Box>
    </Box>
  );
}
