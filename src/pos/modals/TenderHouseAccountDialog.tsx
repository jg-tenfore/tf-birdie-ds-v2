import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { liveCustomer } from '../data/roster';
import { money } from '../logic/cart';
import { houseAccountProblem, orderCustomerId, plainName } from '../logic/customer-search';
import { amountDue, type OperationsModal } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { Stack } from '../components/Stack';
import { Callout, FilledButton, ModalFrame, ModalSection, OutlineButton } from './ModalFrame';
import { TenderCustomerPicker } from './TenderCustomerPicker';

/**
 * Charge to a house account (V1 → V2, Wave 3).
 *
 * v1 had no house-account tender at checkout; the account lived on the customer record, beside
 * Swipe CC and Pay on balance. Justin's decision is that it is a **tender**: the order is charged to
 * the member's account, which raises their balance ("positive means they owe the course"), and
 * paying that off is Customer Search's Pay balance.
 *
 * It charges what is still due — on a split tender, the part a gift card did not pay. It will not
 * take an account payment: paying one account off onto an account is moving a debt, not paying it.
 */
export function TenderHouseAccountDialog({ m }: { m: Extract<OperationsModal, { kind: 'tenderHouseAccount' }> }) {
  void m;
  const { state, dispatch, toast } = usePos();
  const [customerId, setCustomerId] = useState<string | null>(() => {
    const id = orderCustomerId(state);
    // An account being paid off is the one customer this tender must not default to.
    return id && id !== state.payingAccountId ? id : null;
  });
  const customer = liveCustomer(customerId ?? undefined, state.customerEdits);
  const due = amountDue(state);
  const blocked = houseAccountProblem(state.cart);
  const after = customer ? Math.round((customer.balance + due) * 100) / 100 : 0;
  const back = () => dispatch({ type: 'openModal', modal: { kind: 'checkout' } });

  const charge = () => {
    if (!customer || blocked || due <= 0) return;
    dispatch({ type: 'recordPayment', method: 'house', amount: due, ref: { customerId: customer.id } });
    dispatch({ type: 'closeModal' });
    toast(`Charged ${money(due)} to ${plainName(customer)}’s account · balance ${money(after)}`);
  };

  return (
    <ModalFrame
      width={520}
      title="Charge to a house account"
      subtitle={`Balance due ${money(due)}`}
      icon="account_balance"
      onClose={back}
      actions={
        <>
          <OutlineButton onClick={back}>Back to checkout</OutlineButton>
          <FilledButton disabled={!customer || Boolean(blocked) || due <= 0} onClick={charge}>
            {customer ? `Charge ${money(due)}` : 'Charge'}
          </FilledButton>
        </>
      }
    >
      {blocked ? (
        <Callout tone="danger">{blocked}</Callout>
      ) : (
        <>
          <ModalSection title="Account">
            <TenderCustomerPicker
              customerId={customerId}
              onChange={setCustomerId}
              note={(c) => (c.balance > 0 ? `Owes ${money(c.balance)}` : 'Nothing owed')}
            />
          </ModalSection>
          {customer && (
            <Box data-house-charge sx={{ border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, p: '10px 14px' }}>
              <Row label="Balance now" value={money(customer.balance)} />
              <Row label="This order" value={`+${money(due)}`} />
              <Box sx={{ borderTop: `1px solid ${md3.outlineVariant}`, mt: 0.75, pt: 0.75 }} data-balance-after={after.toFixed(2)}>
                <Row label="Balance after" value={money(after)} bold />
              </Box>
              <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 0.75 }}>
                They owe the course this until it is paid off from Customer Search.
              </Typography>
            </Box>
          )}
        </>
      )}
    </ModalFrame>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: '2px' }}>
      <Typography sx={{ fontSize: bold ? 14 : 12.5, fontWeight: bold ? 800 : 400, color: md3.onSurfaceVariant }}>{label}</Typography>
      <Typography sx={{ fontSize: bold ? 14 : 12.5, fontWeight: bold ? 800 : 600 }}>{value}</Typography>
    </Stack>
  );
}
