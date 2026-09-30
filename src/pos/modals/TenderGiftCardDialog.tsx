import { useMemo, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { liveCustomer } from '../data/roster';
import { SPEND_CATEGORIES, spendCategoryOf } from '../data/spend';
import { money } from '../logic/cart';
import { giftCardCanPay, isSpent, orderCustomerId, plainName, searchGiftCards, withPlainHolders } from '../logic/customer-search';
import { linesACardCannotPay } from '../logic/tenders';
import { allGiftCards, amountDue, findGiftCard, type OperationsModal } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { GoodForChips, SpentBadge } from '../components/operations/CustomerChips';
import { Icon, SectionLabel } from '../components/primitives';
import { Stack } from '../components/Stack';
import { Callout, Field, FilledButton, ModalFrame, OutlineButton, ResultList } from './ModalFrame';

/**
 * Pay with a gift card (V1 → V2, Wave 3).
 *
 * v1's GIFT CARD tab took a card number and paid the order — whatever was on it. A card's spend
 * categories were a label: the default card was good for alcohol, and a card that wasn't paid for
 * the beer anyway.
 *
 * Here **checkout enforces the categories** (`giftCardCovers`). A card pays the lines it is good for,
 * with their share of the tax, capped at its balance and at what is due; the lines it cannot pay are
 * named, and stay due on another tender. When it pays only part, that is `payPart` — the order stays
 * open, checkout shows what each tender has paid and the balance due, and the next tender finishes it.
 *
 * A spent card is badged and cannot be chosen.
 */
export function TenderGiftCardDialog({ m }: { m: Extract<OperationsModal, { kind: 'tenderGiftCard' }> }) {
  void m;
  const { state, dispatch, toast } = usePos();
  const [query, setQuery] = useState('');
  const [pick, setPick] = useState<{ cardId: string; customerId?: string } | null>(null);
  const due = amountDue(state);
  const back = () => dispatch({ type: 'openModal', modal: { kind: 'checkout' } });

  const { customerEdits, issuedGiftCards } = state;
  const all = useMemo(() => withPlainHolders(allGiftCards({ customerEdits, issuedGiftCards }), customerEdits), [customerEdits, issuedGiftCards]);
  const holderId = orderCustomerId(state);
  const holder = liveCustomer(holderId ?? undefined, state.customerEdits);
  // The order's own customer's cards, before anyone types — the card is usually theirs.
  const theirs = holder ? all.filter((x) => x.customerId === holder.id) : [];
  const results = query.trim().length >= 2 ? searchGiftCards(query, all).slice(0, 8) : theirs;

  const found = pick ? findGiftCard(state, pick.cardId, pick.customerId) : undefined;
  const card = found?.card;
  const canPay = card ? giftCardCanPay(card, state.cart, due, state.splitTender) : 0;
  const cannot = card ? linesACardCannotPay(card, state.cart) : [];
  const covers = card ? canPay >= due - 0.005 : false;
  const left = Math.max(0, Math.round((due - canPay) * 100) / 100);

  const pay = () => {
    if (!card || canPay <= 0) return;
    const ref = { giftCardId: card.id, ...(found?.customerId && { customerId: found.customerId }) };
    if (covers) {
      dispatch({ type: 'recordPayment', method: 'giftcard', amount: due, ref });
      dispatch({ type: 'closeModal' });
      toast(`Paid ${money(due)} with gift card #${card.id}`);
    } else {
      dispatch({ type: 'payPart', method: 'giftcard', amount: canPay, ref });
      // Back to checkout, which now reads the split: paid so far, and the balance due.
      back();
      toast(`Gift card paid ${money(canPay)} · ${money(left)} still due`);
    }
  };

  return (
    <ModalFrame
      width={600}
      title="Pay with a gift card"
      subtitle={`Balance due ${money(due)}`}
      icon="card_giftcard"
      onClose={back}
      actions={
        <>
          <OutlineButton onClick={back}>Back to checkout</OutlineButton>
          <Box data-gift-card-pay>
            <FilledButton disabled={!card || canPay <= 0} onClick={pay}>
              {!card
                ? 'Pay'
                : canPay <= 0
                  ? 'Nothing this card can pay'
                  : covers
                    ? `Pay ${money(due)}`
                    : `Pay ${money(canPay)} · ${money(left)} left due`}
            </FilledButton>
          </Box>
        </>
      }
    >
      {card ? (
        <>
          <Stack
            data-chosen-card={card.id}
            direction="row"
            alignItems="flex-start"
            gap={1.25}
            sx={{ p: '12px 14px', borderRadius: `${radius.md}px`, border: `1.5px solid ${md3.primary}`, bgcolor: md3.primaryContainer, mb: 1.5 }}
          >
            <Icon name="card_giftcard" size={20} color={md3.onPrimaryContainer} sx={{ mt: '2px' }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" gap={0.75}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: md3.onPrimaryContainer }}>
                  {card.type} · #{card.id}
                </Typography>
                {isSpent(card) && <SpentBadge />}
              </Stack>
              <Typography sx={{ fontSize: 12, color: md3.onPrimaryContainer, mb: 0.75 }}>
                {all.find((x) => x.card.id === card.id)?.holder ?? 'Not on the roster'} · balance {money(card.balance)}
              </Typography>
              <GoodForChips card={card} />
            </Box>
            <OutlineButton onClick={() => setPick(null)}>Change</OutlineButton>
          </Stack>

          {/* What it pays, and what it leaves — the numbers the button acts on. */}
          <Box data-card-pays={canPay.toFixed(2)} sx={{ border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, p: '10px 14px', mb: 1.5 }}>
            <Row label="Due now" value={money(due)} />
            <Row label="This card pays" value={money(canPay)} strong />
            <Row label="Still due after" value={money(left)} tone={left > 0 ? 'warn' : undefined} />
          </Box>

          {cannot.length > 0 && (
            <Box data-card-cannot-pay>
              <Callout tone="warning" icon="block">
                <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.25 }}>This card isn’t good for</Typography>
                {cannot.map((l, i) => {
                  const cat = spendCategoryOf(l);
                  return (
                    <Typography key={i} data-cannot-line={l.name} sx={{ fontSize: 12 }}>
                      {l.qty}× {l.name} — {cat ? SPEND_CATEGORIES.find((c) => c.id === cat)!.label.toLowerCase() : 'not something a gift card buys'}
                    </Typography>
                  );
                })}
                <Typography sx={{ fontSize: 12, mt: 0.5 }}>Those stay due — take them on another tender.</Typography>
              </Callout>
            </Box>
          )}
          {isSpent(card) && (
            <Box sx={{ mt: 1.25 }}>
              <Callout tone="danger">This card has nothing left on it.</Callout>
            </Box>
          )}
        </>
      ) : (
        <>
          <Field autoFocus label="Card number, UPC or holder" value={query} onChange={setQuery} placeholder="Scan or type the card" />
          <SectionLabel color={md3.outline} sx={{ mt: 1.5, mb: 0.75 }}>
            {query.trim().length >= 2 ? 'Cards' : holder ? `${plainName(holder)}’s cards` : 'Cards'}
          </SectionLabel>
          {results.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }} data-no-gift-cards>
              {query.trim().length >= 2 ? `No card matches “${query.trim()}”.` : 'Scan the card, or type its number or the holder’s name.'}
            </Typography>
          ) : (
            <ResultList maxHeight={300}>
              {results.map((x) => {
                const spent = isSpent(x.card);
                return (
                  <ButtonBase
                    key={x.card.id}
                    data-gift-card-option={x.card.id}
                    disabled={spent}
                    onClick={() => setPick({ cardId: x.card.id, customerId: x.customerId })}
                    sx={{
                      display: 'flex',
                      width: '100%',
                      gap: 1.25,
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      p: '10px 14px',
                      minHeight: 52,
                      '&.Mui-disabled': { pointerEvents: 'auto', cursor: 'not-allowed' },
                      borderBottom: `1px solid ${md3.outlineVariant}`,
                      '&:last-of-type': { borderBottom: 'none' },
                      '&:hover': { bgcolor: spent ? undefined : md3.primaryContainer },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" gap={0.75}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                          #{x.card.id} · {x.holder}
                        </Typography>
                        {spent && <SpentBadge />}
                      </Stack>
                      <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>{x.card.type}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: spent ? md3.outline : md3.onSurface }}>{money(x.card.balance)}</Typography>
                  </ButtonBase>
                );
              })}
            </ResultList>
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
