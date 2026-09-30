import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { md3 } from '../../theme/tokens';
import { money } from '../logic/cart';
import { centsToDollars, dollarsToCents } from '../logic/drawer';
import type { OperationsModal } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { Stack } from '../components/Stack';
import { AmountReadout, CashAmountPad } from './CashAmountPad';
import { FilledButton, ModalFrame, ModalSection, OutlineButton, PillGroup } from './ModalFrame';

const FLOATS = [100, 200, 300] as const;

/**
 * Open the drawer (V1 → V2, Wave 3): count the float in, and the shift starts.
 *
 * v1 had no way to open a shift on the terminal — its Shift screen only ended one, and a new shift
 * appeared from somewhere else with a start cash nobody on the screen had keyed. Here the float is
 * the one thing asked, prefilled with the last shift's (the float is usually the same every day)
 * and with the usual amounts one tap away.
 */
export function ShiftOpenDialog({ m }: { m: Extract<OperationsModal, { kind: 'shiftOpen' }> }) {
  void m;
  const { state, dispatch, toast } = usePos();
  const last = state.drawerHistory[0];
  const [digits, setDigits] = useState(dollarsToCents(last?.startCash ?? 200));
  const amount = centsToDollars(digits);

  const confirm = () => {
    dispatch({ type: 'openShift', startCash: amount });
    dispatch({ type: 'closeModal' });
    toast(`Drawer opened with ${money(amount)}`);
  };

  return (
    <ModalFrame
      width={640}
      title="Open shift"
      subtitle="Count the float into the drawer"
      icon="lock_open"
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton onClick={confirm}>Open with {money(amount)}</FilledButton>
        </>
      }
    >
      <Stack direction="row" gap={2.5} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ModalSection title="Float">
            <PillGroup
              value={FLOATS.find((f) => f === amount) ?? -1}
              options={FLOATS.map((f) => ({ label: money(f), value: f as number }))}
              onChange={(v) => setDigits(dollarsToCents(v))}
            />
          </ModalSection>
          <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, lineHeight: 1.5 }}>
            {last ? `The last shift, ${last.id}, started with ${money(last.startCash)}. ` : ''}
            The shift opens now, under your name. Everything the drawer takes from here is worked into its expected cash.
          </Typography>
        </Box>
        <Box sx={{ width: 260, flexShrink: 0 }}>
          <AmountReadout label="Start cash" value={money(amount)} data-start-cash={String(amount)} />
          <Box sx={{ mt: 1 }}>
            <CashAmountPad cents={digits} onChange={setDigits} />
          </Box>
        </Box>
      </Stack>
    </ModalFrame>
  );
}
