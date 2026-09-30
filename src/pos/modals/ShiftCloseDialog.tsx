import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { VarianceText } from '../components/operations/OpsParts';
import { Stack } from '../components/Stack';
import { money } from '../logic/cart';
import { centsToDollars, isLargeVariance, varianceLabel } from '../logic/drawer';
import { drawerWorkings, variance } from '../logic/shift';
import type { OperationsModal } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { AmountReadout, CashAmountPad } from './CashAmountPad';
import { Callout, Field, FilledButton, ModalFrame, ModalSection, OutlineButton } from './ModalFrame';

/**
 * Close the drawer (V1 → V2, Wave 3): count it, see how far off it is, and close.
 *
 * v1's close was two filled fields — Ending Cash Total, Ending Check Total — and END SHIFT. It never
 * said what the drawer should have held, so nobody knew at the counter that they were $10 short;
 * that surfaced later, if ever. Here the expected cash and its workings are on the dialog, the
 * variance updates as the count is keyed, and a variance of $20 or more either way asks for a
 * second tap — nearly always a miscount, and worth a recount before it goes in the history.
 */
export function ShiftCloseDialog({ m }: { m: Extract<OperationsModal, { kind: 'shiftClose' }> }) {
  void m;
  const { state, dispatch, toast } = usePos();
  const [cash, setCash] = useState('');
  const [checks, setChecks] = useState('');
  const [target, setTarget] = useState<'cash' | 'checks'>('cash');
  const [note, setNote] = useState('');
  const [armed, setArmed] = useState(false);
  const shift = state.drawerShift;
  if (!shift) return null;

  const w = drawerWorkings(shift, state.payments, state.drawerEvents);
  const counted = centsToDollars(cash);
  const v = variance(counted, w.expected);
  const large = isLargeVariance(v);
  const ready = cash !== '';

  const key = (digits: string) => {
    setArmed(false);
    if (target === 'cash') setCash(digits);
    else setChecks(digits);
  };

  const confirm = () => {
    if (!ready) return;
    if (large && !armed) return setArmed(true);
    dispatch({ type: 'closeShift', countedCash: counted, countedChecks: centsToDollars(checks), note: note.trim() || undefined });
    dispatch({ type: 'closeModal' });
    toast(`${shift.id} closed · ${varianceLabel(v)}`);
  };

  const label = !ready ? 'Close shift' : armed ? `Yes, close ${varianceLabel(v)}` : 'Close shift';

  return (
    <ModalFrame
      width={760}
      title={`Close shift ${shift.id}`}
      subtitle={`Opened ${shift.openedAt} with ${money(shift.startCash)}`}
      icon="point_of_sale"
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton disabled={!ready} destructive={armed} onClick={confirm}>
            {label}
          </FilledButton>
        </>
      }
    >
      <Stack direction="row" gap={2.5} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ModalSection title="Expected">
            <Box data-close-workings sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, lineHeight: 1.7 }}>
              <Row label="Start cash" value={money(w.startCash)} />
              <Row label="+ Cash in" value={money(w.cashIn)} />
              <Row label="− Cash refunds" value={money(w.cashRefunds)} />
              <Row label="− Payouts" value={money(w.payouts)} />
              <Row label="− Drops" value={money(w.drops)} />
            </Box>
            <Stack direction="row" alignItems="baseline" sx={{ mt: 0.75, pt: 0.75, borderTop: `1px solid ${md3.outlineVariant}` }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, flex: 1 }}>Expected cash</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }} data-close-expected>
                {money(w.expected)}
              </Typography>
            </Stack>
          </ModalSection>

          <Box
            data-close-variance
            sx={{ p: '10px 12px', mb: 2, borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>Variance</Typography>
            {ready ? <VarianceText value={v} pill /> : <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>Key the cash count</Typography>}
          </Box>

          {ready && large && (
            <Box sx={{ mb: 2 }}>
              <Callout tone={armed ? 'danger' : 'warning'}>
                {varianceLabel(v)} is a lot for one drawer. Recount before closing — and say what happened in the note.
              </Callout>
            </Box>
          )}

          <ModalSection title="Note" hint={v !== 0 && ready ? 'Recommended' : 'Optional'}>
            <Field value={note} onChange={setNote} placeholder="What explains the difference" multiline />
          </ModalSection>
        </Box>

        <Box sx={{ width: 280, flexShrink: 0 }}>
          <Stack gap={0.75} sx={{ mb: 1 }}>
            <AmountReadout label="Cash counted" value={money(counted)} active={target === 'cash'} onClick={() => setTarget('cash')} data-count-target="cash" />
            <AmountReadout
              label="Checks counted"
              value={money(centsToDollars(checks))}
              active={target === 'checks'}
              onClick={() => setTarget('checks')}
              data-count-target="checks"
            />
          </Stack>
          <CashAmountPad cents={target === 'cash' ? cash : checks} onChange={key} />
        </Box>
      </Stack>
    </ModalFrame>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row">
      <Box sx={{ flex: 1 }}>{label}</Box>
      <Box sx={{ fontVariantNumeric: 'tabular-nums', color: md3.onSurface }}>{value}</Box>
    </Stack>
  );
}
