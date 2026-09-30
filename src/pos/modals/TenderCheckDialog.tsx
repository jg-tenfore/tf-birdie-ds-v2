import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { money } from '../logic/cart';
import { amountDue, type OperationsModal } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { Icon } from '../components/primitives';
import { Stack } from '../components/Stack';
import { Field, FilledButton, ModalFrame, ModalSection, OutlineButton } from './ModalFrame';

/**
 * Pay by check (V1 → V2, Wave 3 follow-up).
 *
 * v1's Shift asked for a check total at close, but nothing at the counter could be paid by check,
 * so the count had nothing to be held against. A check is a tender here: the amount is what is due
 * (tip included), the number is optional — some clubs write it on the slip, some do not — and the
 * shift's expected check total is the sum of the checks taken, as its expected cash is of the cash.
 */
export function TenderCheckDialog({ m }: { m: Extract<OperationsModal, { kind: 'tenderCheck' }> }) {
  const { state, dispatch, toast } = usePos();
  const [number, setNumber] = useState('');
  const tip = m.tip ?? 0;
  const due = Math.round((amountDue(state) + tip) * 100) / 100;
  const back = () => dispatch({ type: 'openModal', modal: { kind: 'checkout', ...(tip > 0 && { tip }) } });
  const checkNumber = number.replace(/\D/g, '');

  const take = () => {
    if (due <= 0) return;
    dispatch({ type: 'recordPayment', method: 'check', amount: due, ...(tip > 0 && { tip }), ref: checkNumber ? { checkNumber } : undefined });
    dispatch({ type: 'closeModal' });
    toast(`Check${checkNumber ? ` #${checkNumber}` : ''} taken · ${money(due)}`);
  };

  return (
    <ModalFrame
      width={460}
      title="Pay by check"
      subtitle={`Balance due ${money(due)}`}
      icon="receipt"
      onClose={back}
      actions={
        <>
          <OutlineButton onClick={back}>Back to checkout</OutlineButton>
          <Box sx={{ flex: 1 }} />
          <FilledButton disabled={due <= 0} onClick={take}>
            Check received · {money(due)}
          </FilledButton>
        </>
      }
    >
      <Stack
        data-check-amount={due.toFixed(2)}
        direction="row"
        alignItems="center"
        gap={1.25}
        sx={{ border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, p: '12px 14px', mb: 1.5 }}
      >
        <Icon name="receipt" size={22} color={md3.onSurfaceVariant} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Made out for exactly the balance due</Typography>
          <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
            {tip > 0 ? `${money(tip)} tip included · ` : ''}it goes in the drawer and is counted at close
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 800 }}>{money(due)}</Typography>
      </Stack>
      <ModalSection title="Check number">
        <Field value={number} onChange={setNumber} placeholder="Optional — as printed on the check" autoFocus />
      </ModalSection>
    </ModalFrame>
  );
}
