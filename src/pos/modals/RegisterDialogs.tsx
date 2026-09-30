import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { money, orderTotals } from '../logic/cart';
import {
  GIFT_CARD_PRESETS,
  PAYOUT_REASONS,
  defaultHoldName,
  giftCardLineName,
  giftCardProblem,
  payoutProblem,
  payoutReasonLabel,
  type GiftCardDraft,
  type PayoutReason,
} from '../logic/register-extras';
import { canHold, type HeldOrder, type RegisterExtrasModal } from '../state/register-extras';
import { DEFAULT_GIFT_CATEGORIES, SPEND_CATEGORIES, type SpendCategory } from '../data/spend';
import { useV1V2 } from '../edition';
import { usePos } from '../state/PosProvider';
import type { CartItem, GiftCardRecipient } from '../types';
import { Icon, SectionLabel } from '../components/primitives';
import { Stack } from '../components/Stack';
import { Callout, Field, FilledButton, ModalFrame, ModalSection, OutlineButton } from './ModalFrame';
import { CashAmountPad } from './CashAmountPad';

/**
 * The register's V1 → V2 dialogs: Hold, Held orders, Cash payout and Gift card.
 *
 * Routed from `ModalHost`'s default branch through `RegisterDialog`, so the host gains one line
 * rather than four cases. Each is reachable only from a control behind `useV1V2()`.
 *
 * Touch sizes, as on the rail: every choice and key is at least 48px tall — the shared
 * `PillGroup` is about 30px, which is fine for a filter and too small for "how much cash is
 * leaving the drawer".
 */
export function RegisterDialog({ modal }: { modal: RegisterExtrasModal }) {
  switch (modal.kind) {
    case 'holdOrder':
      return <HoldOrderDialog />;
    case 'heldOrders':
      return <HeldOrdersDialog />;
    case 'cashPayout':
      return <CashPayoutDialog />;
    case 'giftCard':
      return <GiftCardDialog draft={modal.draft} />;
  }
}

/** Items as a person counts them — tax rows are on the order but nobody added them. */
const itemCount = (cart: CartItem[]): number =>
  cart.filter((i) => !i.isTax && i.name !== 'Taxes').reduce((n, i) => n + (i.qty || 1), 0);

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** A large option button — reasons and gift-card amounts. */
function Choice({
  selected,
  onClick,
  children,
  ...rest
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  [data: `data-${string}`]: string | undefined;
}) {
  return (
    <ButtonBase
      {...rest}
      aria-pressed={selected}
      onClick={onClick}
      sx={{
        minHeight: 48,
        px: 1.75,
        borderRadius: `${radius.md}px`,
        border: `1.5px solid ${selected ? md3.primary : md3.outlineVariant}`,
        bgcolor: selected ? md3.primaryContainer : '#fff',
        color: selected ? md3.onPrimaryContainer : md3.onSurface,
        fontSize: 13.5,
        fontWeight: 700,
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      {children}
    </ButtonBase>
  );
}

// ─── Hold ───────────────────────────────────────────────────────────────────

/**
 * Hold this order — under a name, pre-filled.
 *
 * The name defaults to whoever the order is for (`defaultHoldName`), so the common case is one
 * more tap. It is editable because "the guy in the red hat" is sometimes the only name there
 * is, and the counter knows that better than the order does.
 */
function HoldOrderDialog() {
  const { state, dispatch, toast } = usePos();
  const booking = state.bookings.find((b) => b.id === state.selectedBookingId);
  const suggested = defaultHoldName(
    { bookingName: booking?.name, golferName: state.selectedGolfer?.name, cart: state.cart },
    state.registerSeq.held + 1,
  );
  const [name, setName] = useState(suggested);
  const count = itemCount(state.cart);

  const hold = () => {
    const as = name.trim() || suggested;
    dispatch({ type: 'holdOrder', name: as });
    toast(`Held · ${as}`);
  };

  return (
    <ModalFrame
      width={460}
      title="Hold this order"
      subtitle={`${plural(count, 'item')} · ${money(orderTotals(state.cart).total)}`}
      icon="pause_circle"
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton disabled={!canHold(state)} onClick={hold}>
            Hold order
          </FilledButton>
        </>
      }
    >
      <ModalSection title="Hold as" hint="Shown in the held list">
        <Field autoFocus value={name} onChange={setName} placeholder={suggested} />
      </ModalSection>
      <Callout tone="info">
        The rail empties for the next customer. Everything on this order — lines, golfer and the
        booking it came from — comes back when it is resumed.
      </Callout>
    </ModalFrame>
  );
}

// ─── Held orders ────────────────────────────────────────────────────────────

/**
 * The held list, and resuming from it.
 *
 * Resuming onto a rail that already has an order never discards it. The dialog asks first and
 * offers the only safe answer — hold the current one, then resume — or backing out. There is
 * deliberately no "replace": a one-tap way to lose a sale is not a feature.
 */
function HeldOrdersDialog() {
  const { state, dispatch, toast } = usePos();
  const [pending, setPending] = useState<HeldOrder | null>(null);
  const busy = canHold(state);
  const currentCount = itemCount(state.cart);

  const resume = (h: HeldOrder, holdCurrent = false) => {
    dispatch({ type: 'resumeHeldOrder', id: h.id, holdCurrent });
    toast(holdCurrent ? `Current order held · ${h.name} resumed` : `Resumed · ${h.name}`);
  };

  return (
    <ModalFrame
      width={560}
      title="Held orders"
      subtitle={plural(state.heldOrders.length, 'order')}
      icon="pause_circle"
      actions={<OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Close</OutlineButton>}
    >
      {pending ? (
        <Box data-resume-confirm>
          <Callout tone="warning">
            The rail already has an order — {plural(currentCount, 'item')},{' '}
            {money(orderTotals(state.cart).total)}. Hold it first, then resume <b>{pending.name}</b>?
          </Callout>
          <Stack direction="row" gap={1} sx={{ mt: 1.75, justifyContent: 'flex-end' }}>
            <OutlineButton onClick={() => setPending(null)}>Back</OutlineButton>
            <FilledButton onClick={() => resume(pending, true)}>Hold current & resume</FilledButton>
          </Stack>
        </Box>
      ) : state.heldOrders.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant, textAlign: 'center', py: 3 }}>
          Nothing is held.
        </Typography>
      ) : (
        <Stack gap={1}>
          {state.heldOrders.map((h) => {
            const total = orderTotals(h.order.cart).total;
            const booked = Boolean(h.order.selectedBookingId);
            return (
              <Stack
                key={h.id}
                data-held-order={h.id}
                direction="row"
                alignItems="center"
                gap={1.5}
                sx={{ p: '10px 12px', borderRadius: `${radius.md}px`, border: `1.5px solid ${md3.outlineVariant}` }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{h.name}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
                    Held {h.heldAt} · {plural(itemCount(h.order.cart), 'item')} · {money(total)}
                    {booked ? ' · tee time' : ''}
                  </Typography>
                </Box>
                <ButtonBase
                  data-resume={h.id}
                  onClick={() => (busy ? setPending(h) : resume(h))}
                  sx={{
                    minHeight: 48,
                    px: 2,
                    gap: 0.75,
                    borderRadius: `${radius.xl}px`,
                    bgcolor: md3.onSurface,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <Icon name="play_circle" size={18} />
                  Resume
                </ButtonBase>
              </Stack>
            );
          })}
        </Stack>
      )}
    </ModalFrame>
  );
}

// ─── Amount keypad ──────────────────────────────────────────────────────────

/**
 * A cents-entry keypad: `4`, `0`, `0`, `0` reads $40.00. The same entry model as checkout's
 * tendered keypad, so a payout is keyed the way cash is everywhere else on the terminal.
 */
function AmountPad({ cents, onChange }: { cents: string; onChange: (digits: string) => void }) {
  // The keys are the terminal's one cash pad, shared with the drawer dialogs (Wave 3).
  return (
    <Box>
      <Box sx={{ p: '12px 16px', bgcolor: md3.surfaceContainer, borderRadius: `${radius.md}px`, mb: 1, textAlign: 'right' }}>
        <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant, fontWeight: 700 }}>Amount</Typography>
        <Typography data-payout-amount sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15 }}>
          {money(cents ? parseInt(cents, 10) / 100 : 0)}
        </Typography>
      </Box>
      <CashAmountPad cents={cents} onChange={onChange} />
    </Box>
  );
}

// ─── Cash payout ────────────────────────────────────────────────────────────

/**
 * Pay cash out of the drawer.
 *
 * Recorded as a `DrawerEvent`, never as a line: the order on the rail — if there is one — is
 * not touched, and the dialog says so, because v1 trained staff to expect the opposite. See
 * `DrawerEvent` for why a payout is a drawer event and not a sale.
 */
function CashPayoutDialog() {
  const { state, dispatch, toast } = usePos();
  const [digits, setDigits] = useState('');
  const [reason, setReason] = useState<PayoutReason | null>(null);
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');

  const draft = { amount: digits ? parseInt(digits, 10) / 100 : 0, reason, recipient, note };
  const problem = payoutProblem(draft);
  const paidOut = state.drawerEvents.reduce((s, e) => s - e.cashDelta, 0);

  const confirm = () => {
    if (problem) return;
    dispatch({ type: 'recordCashPayout', draft });
    dispatch({ type: 'closeModal' });
    toast(`Paid out ${money(draft.amount)} · ${payoutReasonLabel(reason!)}`);
  };

  return (
    <ModalFrame
      width={760}
      title="Cash payout"
      subtitle="Cash out of the drawer — not a sale, and not part of any order"
      icon="payments"
      actions={
        <>
          {state.drawerEvents.length > 0 && (
            <Typography data-drawer-summary sx={{ fontSize: 12, color: md3.onSurfaceVariant, mr: 'auto' }}>
              {plural(state.drawerEvents.length, 'payout')} this session · {money(paidOut)}
            </Typography>
          )}
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton disabled={Boolean(problem)} onClick={confirm}>
            {draft.amount > 0 ? `Pay out ${money(draft.amount)}` : 'Pay out'}
          </FilledButton>
        </>
      }
    >
      <Stack direction="row" gap={2.5} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ModalSection title="Reason">
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
              {PAYOUT_REASONS.map((r) => (
                <Choice key={r.key} data-reason={r.key} selected={reason === r.key} onClick={() => setReason(r.key)}>
                  {r.label}
                </Choice>
              ))}
            </Box>
          </ModalSection>
          <ModalSection title="Paid to" hint="Optional">
            <Field value={recipient} onChange={setRecipient} placeholder="Who is receiving the cash" />
          </ModalSection>
          <ModalSection title={reason === 'other' ? 'Note · required for Other' : 'Note'} hint={reason === 'other' ? undefined : 'Optional'}>
            <Field value={note} onChange={setNote} placeholder="Saturday skins, 3 winners" multiline />
          </ModalSection>
          {state.cart.length > 0 && (
            <Callout tone="info">The order on the rail is not changed by a payout.</Callout>
          )}
          {problem && draft.amount > 0 && (
            <Typography data-payout-problem sx={{ mt: 1, fontSize: 12, color: md3.error, fontWeight: 600 }}>
              {problem}
            </Typography>
          )}
        </Box>
        <Box sx={{ width: 280, flexShrink: 0 }}>
          <AmountPad cents={digits} onChange={setDigits} />
        </Box>
      </Stack>
    </ModalFrame>
  );
}

// ─── Gift card ──────────────────────────────────────────────────────────────

/** v1's four card types (`create-gift-card.tsx`), in its order. */
const GIFT_CARD_TYPES: NonNullable<GiftCardDraft['cardType']>[] = ['Purchased', 'Winnings', 'Promotional', 'Replacement'];

/**
 * Sell a gift card.
 *
 * v1's version was a full-screen form with two parties — FROM and TO — and four lookup fields
 * each: first name, last name, email and phone, every one of them a separate search. Only the
 * recipient's match mattered (it is whose record the card lands on); the purchaser's was
 * searched and then thrown away. Here the recipient is **one** pick from the roster — the same
 * picker the rest of the register uses, via its gift-card target — or a name and email typed
 * for someone who is not in the system. "From" is a name on the card, not a lookup.
 *
 * Confirming adds one line to the order. The card itself is created when the order is paid.
 *
 * V1 → V2, Wave 3 adds v1's **type** (Purchased, Winnings, Promotional, Replacement) and the
 * **categories** a card may pay for. v1 ticked all four categories on every new card, alcohol
 * included, and its own note called that "worth a decision rather than a default". Justin's
 * decision: everything but alcohol, unless it is turned on for this card — and checkout enforces it.
 */
function GiftCardDialog({ draft }: { draft?: GiftCardDraft }) {
  const { dispatch, toast } = usePos();
  const v1v2 = useV1V2();
  const [cardType, setCardType] = useState<NonNullable<GiftCardDraft['cardType']>>(draft?.cardType ?? 'Purchased');
  const [categories, setCategories] = useState<SpendCategory[]>(draft?.categories ?? DEFAULT_GIFT_CATEGORIES);
  const toggleCategory = (c: SpendCategory) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : SPEND_CATEGORIES.map((s) => s.id).filter((id) => id === c || prev.includes(id))));
  const initialAmount = draft?.amount ?? 50;
  const [preset, setPreset] = useState<number | 'custom'>(
    (GIFT_CARD_PRESETS as readonly number[]).includes(initialAmount) ? initialAmount : 'custom',
  );
  const [custom, setCustom] = useState(preset === 'custom' ? String(initialAmount) : '');
  const [picked, setPicked] = useState<GiftCardRecipient | null>(draft?.recipient?.customerId ? draft.recipient : null);
  const [typedName, setTypedName] = useState(draft?.recipient && !draft.recipient.customerId ? draft.recipient.name : '');
  const [typedEmail, setTypedEmail] = useState(draft?.recipient && !draft.recipient.customerId ? (draft.recipient.email ?? '') : '');
  const [from, setFrom] = useState(draft?.from ?? '');
  const [message, setMessage] = useState(draft?.message ?? '');

  const amount = preset === 'custom' ? Number(custom) || 0 : preset;
  const recipient: GiftCardRecipient | null =
    picked ?? (typedName.trim() ? { name: typedName, ...(typedEmail.trim() && { email: typedEmail.trim() }) } : null);
  // Carried on the draft in V1 → V2 only, so a round trip through the roster picker keeps them.
  const current: GiftCardDraft = { amount, recipient, from, message, ...(v1v2 && { cardType, categories }) };
  const problem = giftCardProblem(current) ?? (v1v2 && categories.length === 0 ? 'Pick at least one thing the card can pay for' : null);

  const findOnRoster = () =>
    dispatch({ type: 'openModal', modal: { kind: 'golferSearch', target: { giftCard: current } } });

  const add = () => {
    if (problem) return;
    dispatch({ type: 'addGiftCardLine', draft: current });
    dispatch({ type: 'closeModal' });
    toast(`Added: ${giftCardLineName(amount, recipient!)}`);
  };

  return (
    <ModalFrame
      width={620}
      title="Gift card"
      subtitle="Issued to the recipient when this order is paid"
      icon="redeem"
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton disabled={Boolean(problem)} onClick={add}>
            {problem ? 'Add to order' : `Add to order · ${money(amount)}`}
          </FilledButton>
        </>
      }
    >
      <ModalSection title="Amount">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0.75 }}>
          {GIFT_CARD_PRESETS.map((p) => (
            <Choice key={p} data-amount={String(p)} selected={preset === p} onClick={() => setPreset(p)}>
              {money(p).replace(/\.00$/, '')}
            </Choice>
          ))}
          <Choice data-amount="custom" selected={preset === 'custom'} onClick={() => setPreset('custom')}>
            Custom
          </Choice>
        </Box>
        {preset === 'custom' && (
          <Box sx={{ mt: 1, maxWidth: 220 }}>
            <Field autoFocus label="Custom amount" prefix="$" type="number" value={custom} onChange={setCustom} placeholder="75" />
          </Box>
        )}
      </ModalSection>

      <ModalSection title="For">
        {picked ? (
          <Stack
            data-gift-recipient={picked.customerId}
            direction="row"
            alignItems="center"
            gap={1.25}
            sx={{ p: '8px 8px 8px 14px', borderRadius: `${radius.md}px`, border: `1.5px solid ${md3.primary}`, bgcolor: md3.primaryContainer }}
          >
            <Icon name="person" size={18} color={md3.onPrimaryContainer} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: md3.onPrimaryContainer }}>{picked.name}</Typography>
              <Typography sx={{ fontSize: 11.5, color: md3.onPrimaryContainer }}>
                On the roster — the card goes onto their record
              </Typography>
            </Box>
            <OutlineButton onClick={findOnRoster}>Change</OutlineButton>
            <OutlineButton onClick={() => setPicked(null)}>Clear</OutlineButton>
          </Stack>
        ) : (
          <>
            <ButtonBase
              data-find-recipient
              onClick={findOnRoster}
              sx={{
                width: '100%',
                minHeight: 48,
                gap: 1,
                px: 1.75,
                justifyContent: 'flex-start',
                borderRadius: `${radius.md}px`,
                border: `1.5px dashed ${md3.outline}`,
                fontSize: 13.5,
                fontWeight: 700,
                color: md3.onSurface,
              }}
            >
              <Icon name="person_search" size={18} />
              Find a customer
            </ButtonBase>
            <SectionLabel color={md3.outline} sx={{ mt: 1.5, mb: 0.75 }}>
              Or someone not in the system
            </SectionLabel>
            <Stack direction="row" gap={1.25}>
              <Field value={typedName} onChange={setTypedName} placeholder="Name" />
              <Field value={typedEmail} onChange={setTypedEmail} placeholder="Email (optional)" type="email" />
            </Stack>
          </>
        )}
      </ModalSection>

      <Stack direction="row" gap={1.25}>
        <ModalSection title="From" hint="Optional" sx={{ flex: 1, mb: 0 }}>
          <Field value={from} onChange={setFrom} placeholder="Who is giving it" />
        </ModalSection>
        <ModalSection title="Message" hint="Optional" sx={{ flex: 1.4, mb: 0 }}>
          <Field value={message} onChange={setMessage} placeholder="Happy birthday — see you on the first tee" />
        </ModalSection>
      </Stack>

      {v1v2 && (
        <Stack direction="row" gap={1.25} sx={{ mt: 2.25 }}>
          <ModalSection title="Type" sx={{ flex: 0.85, mb: 0 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 0.75 }}>
              {GIFT_CARD_TYPES.map((t) => (
                <Choice key={t} data-card-type={t} selected={cardType === t} onClick={() => setCardType(t)}>
                  {t}
                </Choice>
              ))}
            </Box>
          </ModalSection>
          <ModalSection title="Good for" hint="Alcohol is off unless you turn it on" sx={{ flex: 1.35, mb: 0 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 0.75 }}>
              {SPEND_CATEGORIES.map((c) => (
                <Choice key={c.id} data-card-category={c.id} selected={categories.includes(c.id)} onClick={() => toggleCategory(c.id)}>
                  {categories.includes(c.id) && <Icon name="check" size={15} sx={{ mr: 0.5 }} />}
                  {c.label}
                </Choice>
              ))}
            </Box>
          </ModalSection>
        </Stack>
      )}

      {problem && amount > 0 && recipient && (
        <Typography data-gift-problem sx={{ mt: 1.5, fontSize: 12, color: md3.error, fontWeight: 600 }}>
          {problem}
        </Typography>
      )}
    </ModalFrame>
  );
}
