import { useMemo, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { golferOf } from '../data/customers';
import { liveCustomer, searchRoster } from '../data/roster';
import { money } from '../logic/cart';
import {
  CREDIT_ICONS,
  CREDIT_NAMES,
  balanceLabel,
  coveredByCredits,
  coversOf,
  creditCoverage,
  trimCoverage,
  type CreditOption,
  type CreditRef,
} from '../logic/credit-tenders';
import { orderCustomerId, plainName } from '../logic/customer-search';
import { creditOptionsFor } from '../state/credit-ledger';
import type { CheckoutModal } from '../state/checkout';
import { amountDue, dueNow, registerLineTotals } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { Icon, SectionLabel } from '../components/primitives';
import { Stack } from '../components/Stack';
import { Callout, Field, FilledButton, ModalFrame, OutlineButton, ResultList } from './ModalFrame';

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Pay with a credit (Nov 26, "checkout that's right") — a rain check, a punch card, a credit book or
 * a lesson credit, on the customer on the order.
 *
 * One dialog for the four, because the job is the same: whose credits, which one, what it pays and
 * what it leaves. What it may pay is Buck's rule for that credit (`creditCoverage`): a rain check pays
 * tee times, a punch pays one eligible item (or a bay's minutes), a book pays only what it applies to,
 * a lesson credit one lesson of its length. Lines it cannot pay are named and stay due — the credit
 * pays its part (`payPart`) and checkout takes the rest on another tender, exactly as a gift card does.
 *
 * Each credit shows its **balance before and after**, and the payment records which credit paid it
 * (`PaymentRef.credit`), so Orders & Tips, Order Lookup, the receipt and a refund all say so.
 *
 * A rain check's amount is **keyed** — Buck's own New rain check takes an amount, and nothing here
 * prorates. A credit book's may be keyed down too. Credits never carry a tip.
 */
export function TenderCreditDialog({ m }: { m: Extract<CheckoutModal, { kind: 'tenderCredit' }> }) {
  const { state, dispatch, toast } = usePos();
  const kind = m.credit;
  const tip = m.tip ?? 0;
  const back = () => dispatch({ type: 'openModal', modal: { kind: 'checkout', ...(tip > 0 && { tip }) } });
  const due = dueNow(state);

  const holderId = orderCustomerId(state);
  const holder = liveCustomer(holderId ?? undefined, state.customerEdits);
  const options = useMemo(() => creditOptionsFor(state, kind, holderId), [state, kind, holderId]);
  const [pickKey, setPickKey] = useState<string | null>(null);
  const option: CreditOption | undefined = options.find((o) => o.key === pickKey) ?? options.find((o) => o.usable);

  const totals = registerLineTotals(state);
  const covered = coveredByCredits(state.splitTender?.tenders ?? []);
  const full = option?.usable ? creditCoverage(option, state.cart, { totals, due, covered, resources: state.resourceBookings }) : null;
  const money1 = option?.unit === 'money';
  const [typed, setTyped] = useState<string | null>(null);
  const keyed = typed == null || !full ? full?.amount ?? 0 : Math.max(0, Math.min(full.amount, Number(typed) || 0));
  const coverage = full && money1 ? trimCoverage(full, keyed) : full;
  const pays = coverage?.amount ?? 0;
  const covers = pays >= due - 0.005;
  const left = cents(Math.max(0, due - pays));
  const before = option?.balance ?? 0;
  const after = option ? (money1 ? cents(before - pays) : before - (coverage?.units ?? 0)) : 0;

  const pay = () => {
    if (!option || !coverage || pays <= 0) return;
    const credit: CreditRef = {
      kind,
      key: option.key,
      id: option.id,
      label: option.title,
      unit: option.unit,
      ...(option.unit !== 'money' && { units: coverage.units }),
      value: pays,
      covers: coversOf(coverage),
    };
    const ref = { customerId: holder?.id, credit };
    const what = `${option.title} · ${balanceLabel(option.unit, before, money)} → ${balanceLabel(option.unit, after, money)}`;
    if (covers) {
      dispatch({ type: 'recordPayment', method: kind, amount: due, ref });
      // One part of a split check paid (Nov 26): back to checkout for the next part.
      if (state.checkSplit && due < amountDue(state) - 0.005) back();
      else dispatch({ type: 'closeModal' });
      toast(tip > 0 ? `Paid ${money(due)} · ${what} · the ${money(tip)} tip was not taken — credits don’t pay tips` : `Paid ${money(due)} · ${what}`);
    } else {
      dispatch({ type: 'payPart', method: kind, amount: pays, ref });
      back();
      toast(`${CREDIT_NAMES[kind]} paid ${money(pays)} · ${money(left)} still due`);
    }
  };

  const [query, setQuery] = useState('');
  const found = query.trim().length >= 2 ? searchRoster(query, 6) : [];

  return (
    <ModalFrame
      width={600}
      title={`Pay with a ${CREDIT_NAMES[kind].toLowerCase()}`}
      subtitle={`Balance due ${money(due)}${holder ? ` · ${plainName(holder)}` : ''}`}
      icon={CREDIT_ICONS[kind]}
      onClose={back}
      actions={
        <>
          <OutlineButton onClick={back}>Back to checkout</OutlineButton>
          <Box data-credit-pay>
            <FilledButton disabled={!coverage || pays <= 0} onClick={pay}>
              {!option || !coverage ? 'Pay' : pays <= 0 ? 'Nothing this credit can pay' : covers ? `Pay ${money(due)}` : `Pay ${money(pays)} · ${money(left)} left due`}
            </FilledButton>
          </Box>
        </>
      }
    >
      {!holder ? (
        <Box data-credit-no-customer>
          <Callout tone="info" icon="person_search">
            Credits are on a customer’s record. Attach the customer to the order to see theirs.
          </Callout>
          <Box sx={{ mt: 1.5 }}>
            <Field autoFocus label="Find the customer" value={query} onChange={setQuery} placeholder="Name, phone or email" />
          </Box>
          {found.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <ResultList maxHeight={240}>
                {found.map((c) => (
                  <ButtonBase
                    key={c.id}
                    data-credit-attach={c.id}
                    onClick={() => dispatch({ type: 'selectGolfer', golfer: golferOf(c) })}
                    sx={{ display: 'flex', width: '100%', justifyContent: 'flex-start', textAlign: 'left', p: '10px 14px', borderBottom: `1px solid ${md3.outlineVariant}`, '&:hover': { bgcolor: md3.primaryContainer } }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{plainName(c)}</Typography>
                  </ButtonBase>
                ))}
              </ResultList>
            </Box>
          )}
        </Box>
      ) : options.length === 0 ? (
        <Box data-credit-none>
          <Callout tone="info">
            {plainName(holder)} has no {CREDIT_NAMES[kind].toLowerCase()}s.
          </Callout>
        </Box>
      ) : (
        <>
          <SectionLabel color={md3.outline} sx={{ mb: 0.75 }}>
            {plainName(holder)}’s {CREDIT_NAMES[kind].toLowerCase()}s
          </SectionLabel>
          <ResultList maxHeight={196}>
            {options.map((o) => {
              const chosen = o.key === option?.key;
              return (
                <ButtonBase
                  key={o.key}
                  data-credit-option={o.key}
                  aria-pressed={chosen}
                  disabled={!o.usable}
                  onClick={() => {
                    setPickKey(o.key);
                    setTyped(null);
                  }}
                  sx={{
                    display: 'flex',
                    width: '100%',
                    gap: 1.25,
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    p: '10px 14px',
                    minHeight: 52,
                    bgcolor: chosen ? md3.primaryContainer : undefined,
                    '&.Mui-disabled': { pointerEvents: 'auto', cursor: 'not-allowed', opacity: 0.6 },
                    borderBottom: `1px solid ${md3.outlineVariant}`,
                    '&:last-of-type': { borderBottom: 'none' },
                  }}
                >
                  <Icon name={chosen ? 'radio_button_checked' : 'radio_button_unchecked'} size={18} color={chosen ? md3.primary : md3.outline} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{o.title}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>{o.reason ? `${o.reason} · ${o.detail}` : o.detail}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: o.usable ? md3.onSurface : md3.outline }}>{balanceLabel(o.unit, o.balance, money)}</Typography>
                </ButtonBase>
              );
            })}
          </ResultList>

          {option && coverage && (
            <>
              {money1 && (
                <Stack direction="row" alignItems="flex-end" gap={1} sx={{ mt: 1.5 }}>
                  <Box sx={{ width: 180 }} data-credit-amount>
                    <Field
                      label={kind === 'raincheck' ? 'Amount to take (keyed — never prorated)' : 'Amount to take'}
                      value={typed ?? (full?.amount ?? 0).toFixed(2)}
                      onChange={(v) => setTyped(v.replace(/[^\d.]/g, ''))}
                      prefix="$"
                    />
                  </Box>
                  <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, pb: 1 }}>
                    Up to {money(full?.amount ?? 0)} — what it may pay of this order.
                  </Typography>
                </Stack>
              )}
              <Box data-credit-pays={pays.toFixed(2)} sx={{ border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, p: '10px 14px', mt: 1.5 }}>
                {coverage.lines.map((l) => (
                  <Row key={l.index} label={l.what} value={money(l.amount)} />
                ))}
                {coverage.lines.length === 0 && <Row label="Nothing on this order it may pay" value={money(0)} />}
                <Row label="This credit pays" value={money(pays)} strong />
                <Row label="Still due after" value={money(left)} tone={left > 0 ? 'warn' : undefined} />
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75, pt: 0.75, borderTop: `1px dashed ${md3.outlineVariant}` }}>
                  <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>Balance</Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                    <span data-credit-before>{balanceLabel(option.unit, before, money)}</span> → <span data-credit-after>{balanceLabel(option.unit, after, money)}</span>
                  </Typography>
                </Stack>
              </Box>
              {coverage.cannot.length > 0 && (
                <Box data-credit-cannot sx={{ mt: 1.25 }}>
                  <Callout tone="warning" icon="block">
                    <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.25 }}>It doesn’t pay</Typography>
                    {coverage.cannot.map((c, i) => (
                      <Typography key={i} data-credit-cannot-line={c.name} sx={{ fontSize: 12 }}>
                        {c.name} — {c.reason}
                      </Typography>
                    ))}
                    <Typography sx={{ fontSize: 12, mt: 0.5 }}>That stays due — take it on another tender.</Typography>
                  </Callout>
                </Box>
              )}
              {tip > 0 && (
                <Box sx={{ mt: 1.25 }}>
                  <Callout tone="info">The {money(tip)} tip stays for a card or cash — credits don’t pay tips.</Callout>
                </Box>
              )}
            </>
          )}
          {option && !option.usable && (
            <Box sx={{ mt: 1.25 }}>
              <Callout tone="danger">{option.reason}</Callout>
            </Box>
          )}
        </>
      )}
    </ModalFrame>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'warn' }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: '2px' }}>
      <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, fontWeight: strong ? 700 : 400 }}>{label}</Typography>
      <Typography sx={{ fontSize: strong ? 14 : 12.5, fontWeight: strong ? 800 : 600, color: tone === 'warn' ? '#92400e' : md3.onSurface }}>{value}</Typography>
    </Stack>
  );
}
