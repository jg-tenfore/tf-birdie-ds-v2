import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { DEMO_TODAY } from '../data/bookings';
import { liveCustomer } from '../data/roster';
import { money } from '../logic/cart';
import { cardExpired, orderCustomerId, plainName } from '../logic/customer-search';
import { amountDue, type OperationsModal } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { Icon } from '../components/primitives';
import { Stack } from '../components/Stack';
import { Callout, FilledButton, ModalFrame, ModalSection, OutlineButton } from './ModalFrame';
import { TenderCustomerPicker } from './TenderCustomerPicker';

/**
 * Charge the card on file (V1 → V2, Wave 3).
 *
 * v1 put Swipe CC and Key CC on the customer record, so a card was charged wherever someone was
 * looked up — with no order in front of you to say what for. Here the card on file is a **tender**:
 * pick the customer (the order's own, to start), see the card and its expiry, charge what is due.
 *
 * An expired card is refused rather than tried; the reader would decline it, and saying so up front
 * saves the round trip.
 */
export function TenderCardOnFileDialog({ m }: { m: Extract<OperationsModal, { kind: 'tenderCardOnFile' }> }) {
  const { state, dispatch, toast } = usePos();
  const [customerId, setCustomerId] = useState<string | null>(() => orderCustomerId(state));
  const customer = liveCustomer(customerId ?? undefined, state.customerEdits);
  // The tip recalculated into checkout travels with the tender (V1 → V2): it is charged here with the order.
  const tip = m.tip ?? 0;
  const orderDue = amountDue(state);
  const due = Math.round((orderDue + tip) * 100) / 100;
  const card = customer?.cardOnFile;
  const expired = Boolean(card) && cardExpired(customer?.cardExpires, DEMO_TODAY());
  const back = () => dispatch({ type: 'openModal', modal: { kind: 'checkout', ...(tip > 0 && { tip }) } });
  const ready = Boolean(customer && card && !expired && due > 0);

  const charge = () => {
    if (!ready || !customer || !card) return;
    dispatch({ type: 'recordPayment', method: 'cardonfile', amount: due, ...(tip > 0 && { tip }), ref: { customerId: customer.id, cardLast4: card } });
    dispatch({ type: 'closeModal' });
    toast(`Charged ${money(due)} to ${plainName(customer)}’s card •••• ${card}`);
  };

  return (
    <ModalFrame
      width={520}
      title="Charge the card on file"
      subtitle={`Balance due ${money(due)}`}
      icon="credit_score"
      onClose={back}
      actions={
        <>
          <OutlineButton onClick={back}>Back to checkout</OutlineButton>
          <FilledButton disabled={!ready} onClick={charge}>
            {ready ? `Charge •••• ${card} · ${money(due)}` : 'Charge'}
          </FilledButton>
        </>
      }
    >
      <ModalSection title="Customer">
        <TenderCustomerPicker
          customerId={customerId}
          onChange={setCustomerId}
          note={(c) => (c.cardOnFile ? `Card •••• ${c.cardOnFile}${c.cardExpires ? ` · exp ${c.cardExpires}` : ''}` : 'No card on file')}
        />
      </ModalSection>
      {customer &&
        (card ? (
          <Stack
            data-card-on-file={card}
            direction="row"
            alignItems="center"
            gap={1.25}
            sx={{ border: `1px solid ${expired ? md3.error : md3.outlineVariant}`, borderRadius: `${radius.md}px`, p: '12px 14px', mb: expired ? 1.25 : 0 }}
          >
            <Icon name={expired ? 'credit_card_off' : 'credit_card'} size={22} color={expired ? md3.error : md3.onSurfaceVariant} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 800 }}>•••• {card}</Typography>
              <Typography sx={{ fontSize: 12, color: expired ? md3.error : md3.onSurfaceVariant }}>
                {customer.cardExpires ? `${expired ? 'Expired' : 'Expires'} ${customer.cardExpires}` : 'No expiry on record'}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>{money(due)}</Typography>
          </Stack>
        ) : (
          <Box data-no-card-on-file>
            <Callout tone="warning" icon="credit_card_off">
              {plainName(customer)} has no card on file. Take a card on the reader instead, or pick someone else.
            </Callout>
          </Box>
        ))}
      {customer && card && expired && (
        <Box data-card-expired>
          <Callout tone="danger">This card has expired. Take a new card on the reader.</Callout>
        </Box>
      )}
    </ModalFrame>
  );
}
