import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { md3 } from '../../theme/tokens';
import { money } from '../logic/cart';
import { centsToDollars, dollarsToCents, dropProblem } from '../logic/drawer';
import { drawerWorkings } from '../logic/shift';
import type { OperationsModal } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { Stack } from '../components/Stack';
import { AmountReadout, CashAmountPad } from './CashAmountPad';
import { Field, FilledButton, ModalFrame, ModalSection, OutlineButton, PillGroup } from './ModalFrame';

/**
 * Cash drop (V1 → V2, Wave 3): cash out of the drawer and into the safe, mid-shift.
 *
 * In v1 this sat in Orders & Tips' bottom bar, beside two print jobs — a drawer job on a tips
 * screen. It moves here, to the drawer, and it knows what the drawer holds: the expected cash is on
 * the dialog, "Leave the float" drops everything above the start cash in one tap, and a drop larger
 * than the drawer should hold is refused — v1 took any number, so one slipped digit made the drawer
 * "expected" to be negative.
 */
export function CashDropDialog({ m }: { m: Extract<OperationsModal, { kind: 'cashDrop' }> }) {
  void m;
  const { state, dispatch, toast } = usePos();
  const [digits, setDigits] = useState('');
  const [note, setNote] = useState('');
  const shift = state.drawerShift;
  const w = shift ? drawerWorkings(shift, state.payments, state.drawerEvents) : null;
  const expected = w?.expected ?? 0;
  const amount = centsToDollars(digits);
  const problem = shift ? dropProblem(amount, expected) : 'No drawer is open.';
  const aboveFloat = w ? Math.round((w.expected - w.startCash) * 100) / 100 : 0;
  const presets = [
    ...(aboveFloat > 0 ? [{ label: `Leave the float · ${money(aboveFloat)}`, value: aboveFloat }] : []),
    ...[100, 200].filter((n) => n <= expected).map((n) => ({ label: money(n), value: n })),
  ];

  const confirm = () => {
    if (problem) return;
    dispatch({ type: 'cashDrop', amount, note: note.trim() || undefined });
    dispatch({ type: 'closeModal' });
    toast(`${money(amount)} dropped to the safe`);
  };

  return (
    <ModalFrame
      width={700}
      title="Cash drop"
      subtitle="From the drawer to the safe"
      icon="savings"
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton disabled={Boolean(problem)} onClick={confirm}>
            {amount > 0 ? `Drop ${money(amount)}` : 'Drop'}
          </FilledButton>
        </>
      }
    >
      <Stack direction="row" gap={2.5} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ModalSection title="In the drawer">
            <Typography sx={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }} data-drop-expected>
              {money(expected)}
            </Typography>
            <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
              Expected now{shift ? ` on ${shift.id}` : ''}
              {amount > 0 && !problem ? ` · ${money(expected - amount)} after this drop` : ''}
            </Typography>
          </ModalSection>
          {presets.length > 0 && (
            <ModalSection title="Quick amounts">
              <PillGroup value={amount} options={presets} onChange={(v) => setDigits(dollarsToCents(v))} />
            </ModalSection>
          )}
          <ModalSection title="Note" hint="Optional">
            <Field value={note} onChange={setNote} placeholder="Bag number, who carried it" />
          </ModalSection>
          {problem && amount > 0 && (
            <Typography data-drop-problem sx={{ fontSize: 12, color: md3.error, fontWeight: 600 }}>
              {problem}
            </Typography>
          )}
        </Box>
        <Box sx={{ width: 260, flexShrink: 0 }}>
          <AmountReadout label="Drop" value={money(amount)} />
          <Box sx={{ mt: 1 }}>
            <CashAmountPad cents={digits} onChange={setDigits} />
          </Box>
        </Box>
      </Stack>
    </ModalFrame>
  );
}
