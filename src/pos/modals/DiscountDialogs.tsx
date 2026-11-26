import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { productSettings } from '../data/products';
import { PROMO_CODES, isPromoExpired, promoByCode } from '../data/promo-codes';
import { staffById, staffByPin } from '../data/staff';
import { linePayable, lineNets, money } from '../logic/cart';
import { applied, lineDiscountAmount, lineDiscountOffers, orderDiscountOffers, promoDiscount, promoProblem, type DiscountOffer } from '../logic/discounts';
import type { CheckoutModal } from '../state/checkout';
import { canManageStaff } from '../state/settings';
import { usePos } from '../state/PosProvider';
import { Icon, SectionLabel } from '../components/primitives';
import { Stack } from '../components/Stack';
import { Callout, Field, FilledButton, ModalFrame, OutlineButton, PillGroup } from './ModalFrame';

/**
 * Discounts at the register (Nov 26, "checkout that's right"): Buck's discount types on one line or on
 * the whole order, a price override where the product allows it, and promo codes.
 *
 * Only the types that apply are offered — a line's category against each type's categories, so a beer
 * never sees *Senior* and a shirt never sees *League Pass*. Cost plus is offered only where the shop
 * knows the product's cost. A type Buck flags for approval shows a lock for anyone but a manager, and
 * tapping it asks for a manager's PIN there and then — the PIN sign-in's own staff and roles — so the
 * person at the counter keeps the order rather than signing out.
 */

/** The four-digit pad a manager approves on, from the PIN sign-in's staff and roles. */
export function ManagerPin({ what, onApproved, onCancel }: { what: string; onApproved: (staffId: string) => void; onCancel: () => void }) {
  const { state } = usePos();
  const [pin, setPin] = useState('');
  const [refused, setRefused] = useState<string | null>(null);
  const press = (k: string) => {
    setRefused(null);
    if (k === 'clear') return setPin('');
    if (k === 'back') return setPin((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, 4);
    setPin(next);
    if (next.length < 4) return;
    const who = staffByPin(next, state.staffRoster);
    setPin('');
    if (!who) return setRefused('PIN not recognised');
    if (who.role !== 'manager') return setRefused(`${who.short} is not a manager`);
    onApproved(who.id);
  };
  return (
    <Box data-manager-pin sx={{ border: `1.5px solid ${md3.primary}`, borderRadius: `${radius.md}px`, p: '12px 14px', mt: 1.5 }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
        <Icon name="lock" size={18} color={md3.primary} />
        <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>A manager’s PIN to approve {what}</Typography>
        <OutlineButton onClick={onCancel}>Cancel</OutlineButton>
      </Stack>
      <Stack direction="row" gap={1} justifyContent="center" sx={{ mb: 1 }} data-pin-dots={pin.length}>
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: i < pin.length ? md3.primary : md3.outlineVariant }} />
        ))}
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gap: 0.75, justifyContent: 'center' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map((k) => (
          <ButtonBase
            key={k}
            aria-label={k === 'back' ? 'Delete' : k === 'clear' ? 'Clear' : k}
            onClick={() => press(k)}
            sx={{ height: 44, borderRadius: `${radius.md}px`, border: `1.5px solid ${md3.outlineVariant}`, bgcolor: '#fff', fontSize: 16, fontWeight: 700 }}
          >
            {k === 'back' ? <Icon name="backspace" size={18} /> : k === 'clear' ? <Typography sx={{ fontSize: 11, fontWeight: 700 }}>Clear</Typography> : k}
          </ButtonBase>
        ))}
      </Box>
      {refused && (
        <Typography data-pin-refused sx={{ fontSize: 12, color: md3.error, fontWeight: 700, textAlign: 'center', mt: 1 }}>
          {refused}
        </Typography>
      )}
      <Typography sx={{ fontSize: 11, color: md3.outline, textAlign: 'center', mt: 0.75 }}>Demo: the manager’s PIN is 1111.</Typography>
    </Box>
  );
}

function OfferList({ offers, current, onPick }: { offers: DiscountOffer[]; current?: number; onPick: (o: DiscountOffer) => void }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.75 }}>
      {offers.map((o) => {
        const on = o.type.id === current;
        return (
          <ButtonBase
            key={o.type.id}
            data-discount-offer={o.type.id}
            data-discount-locked={o.needsManager || undefined}
            aria-pressed={on}
            aria-label={o.needsManager ? `${o.label}, needs a manager` : o.label}
            onClick={() => onPick(o)}
            sx={{
              justifyContent: 'flex-start',
              gap: 0.75,
              textAlign: 'left',
              p: '9px 11px',
              borderRadius: `${radius.md}px`,
              border: `1.5px solid ${on ? md3.primary : md3.outlineVariant}`,
              bgcolor: on ? md3.primaryContainer : '#fff',
              fontSize: 12.5,
              fontWeight: 700,
              color: md3.onSurface,
              '&:hover': { borderColor: md3.primary },
            }}
          >
            {o.needsManager && <Icon name="lock" size={15} color={md3.outline} />}
            <Box component="span" sx={{ flex: 1 }}>
              {o.label}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/** A Buck discount, or a price override, on one line. */
export function LineDiscountDialog({ m }: { m: Extract<CheckoutModal, { kind: 'lineDiscount' }> }) {
  const { state, dispatch, toast } = usePos();
  const line = state.cart[m.index];
  const isManager = canManageStaff(state);
  const [pending, setPending] = useState<DiscountOffer | null>(null);
  const [price, setPrice] = useState(line ? line.price.toFixed(2) : '');
  const close = () => dispatch({ type: 'closeModal' });
  if (!line) return null;

  const offers = lineDiscountOffers(line, isManager);
  const gross = linePayable(line);
  const net = lineNets(state.cart)[m.index];
  const overridable = Boolean(productSettings(line.name)?.priceOverride) && !line.isCheckIn;
  const apply = (o: DiscountOffer, approvedBy?: string) => {
    dispatch({ type: 'applyLineDiscount', index: m.index, discount: applied(o.type, approvedBy) });
    const by = approvedBy ? ` · approved by ${staffById(approvedBy, state.staffRoster)?.short}` : '';
    toast(`${line.name}: ${o.label}${by}`);
    close();
  };

  return (
    <ModalFrame
      width={560}
      title={`Discount · ${line.name}`}
      subtitle={line.lineDiscount ? `${money(gross)} → ${money(net)} · ${line.lineDiscount.label}` : `${line.isCheckIn ? `${line.qty} seats · ` : line.qty > 1 ? `${line.qty} × ` : ''}${money(gross)}`}
      icon="sell"
      actions={
        <>
          {line.lineDiscount && (
            <OutlineButton
              onClick={() => {
                dispatch({ type: 'applyLineDiscount', index: m.index, discount: null });
                toast(`${line.name}: discount removed`);
                close();
              }}
            >
              Remove discount
            </OutlineButton>
          )}
          <Box sx={{ flex: 1 }} />
          <OutlineButton onClick={close}>Done</OutlineButton>
        </>
      }
    >
      <SectionLabel color={md3.outline} sx={{ mb: 0.75 }}>
        Buck’s discount types for this line
      </SectionLabel>
      {offers.length === 0 ? (
        <Callout tone="info">No discount type applies to this line.</Callout>
      ) : (
        <OfferList offers={offers} current={line.lineDiscount?.typeId} onPick={(o) => (o.needsManager ? setPending(o) : apply(o))} />
      )}
      {pending && <ManagerPin what={pending.label} onApproved={(id) => apply(pending, id)} onCancel={() => setPending(null)} />}
      {line.lineDiscount && (
        <Box sx={{ mt: 1.25 }} data-line-discount-now>
          <Callout tone="success">
            {line.lineDiscount.label} · {money(-lineDiscountAmount(line, gross))}
            {line.lineDiscount.approvedBy ? ` · approved by ${staffById(line.lineDiscount.approvedBy, state.staffRoster)?.short}` : ''}
          </Callout>
        </Box>
      )}
      {overridable && (
        <Box sx={{ mt: 2 }} data-price-override>
          <SectionLabel color={md3.outline} sx={{ mb: 0.75 }}>
            Price override
          </SectionLabel>
          <Stack direction="row" gap={1} alignItems="flex-end">
            <Box sx={{ width: 160 }}>
              <Field label="Price each" prefix="$" value={price} onChange={(v) => setPrice(v.replace(/[^\d.]/g, ''))} />
            </Box>
            <FilledButton
              disabled={!(Number(price) >= 0) || price === '' || Number(price) === line.price}
              onClick={() => {
                dispatch({ type: 'overridePrice', index: m.index, price: Number(price) });
                toast(`${line.name}: ${money(line.priceOverride?.from ?? line.price)} → ${money(Number(price))} each`);
                close();
              }}
            >
              Set price
            </FilledButton>
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 0.5 }}>
            Buck’s “Price override” is on for this product{line.priceOverride ? ` · was ${money(line.priceOverride.from)}` : ''}.
          </Typography>
        </Box>
      )}
    </ModalFrame>
  );
}

/** A Buck discount, or a promo code, on the whole order. */
export function OrderDiscountDialog({ m }: { m: Extract<CheckoutModal, { kind: 'orderDiscount' }> }) {
  const { state, dispatch, toast } = usePos();
  const [tab, setTab] = useState<'types' | 'promo'>(m.tab ?? 'types');
  const [pending, setPending] = useState<DiscountOffer | null>(null);
  const [code, setCode] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const isManager = canManageStaff(state);
  const offers = orderDiscountOffers(state.cart, isManager);
  const close = () => dispatch({ type: 'closeModal' });
  const apply = (o: DiscountOffer, approvedBy?: string) => {
    dispatch({ type: 'applyOrderDiscount', discount: applied(o.type, approvedBy) });
    toast(`Order: ${o.label}${approvedBy ? ` · approved by ${staffById(approvedBy, state.staffRoster)?.short}` : ''}`);
    close();
  };
  const tryCode = () => {
    const why = promoProblem(code, state.cart, linePayable, promoByCode, (p) => isPromoExpired(p));
    setProblem(why);
    if (why) return;
    const p = promoByCode(code)!;
    dispatch({ type: 'applyOrderDiscount', discount: promoDiscount(p) });
    toast(`${p.label} applied`);
    close();
  };

  return (
    <ModalFrame
      width={600}
      title="Discount the order"
      subtitle="Comes off the lines it applies to, before tax"
      icon="sell"
      actions={<OutlineButton onClick={close}>Done</OutlineButton>}
    >
      <PillGroup
        value={tab}
        options={[
          { label: 'Discount types', value: 'types' },
          { label: 'Promo code', value: 'promo' },
        ]}
        onChange={(v) => setTab(v)}
      />
      <Box sx={{ mt: 1.5 }}>
        {tab === 'types' ? (
          <>
            {offers.length === 0 ? (
              <Callout tone="info">No discount type applies to anything on this order.</Callout>
            ) : (
              <OfferList offers={offers} onPick={(o) => (o.needsManager ? setPending(o) : apply(o))} />
            )}
            {pending && <ManagerPin what={pending.label} onApproved={(id) => apply(pending, id)} onCancel={() => setPending(null)} />}
            <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 1 }}>
              Cost-plus types are per line — an order has no one cost. Use a line’s Discount.
            </Typography>
          </>
        ) : (
          <Box data-promo>
            <Stack direction="row" gap={1} alignItems="flex-end">
              <Field autoFocus label="Promo code" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="Type or scan the code" />
              <FilledButton disabled={!code.trim()} onClick={tryCode}>
                Apply
              </FilledButton>
            </Stack>
            {problem && (
              <Box sx={{ mt: 1.25 }} data-promo-problem>
                <Callout tone="warning">{problem}</Callout>
              </Box>
            )}
            <Typography sx={{ fontSize: 11.5, color: md3.outline, mt: 1.25 }}>
              Demo codes: {PROMO_CODES.map((p) => `${p.code}${isPromoExpired(p) ? ' (expired)' : ''}`).join(', ')}.
            </Typography>
          </Box>
        )}
      </Box>
    </ModalFrame>
  );
}
