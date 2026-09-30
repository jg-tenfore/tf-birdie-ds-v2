import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { staffById } from '../data/staff';
import { money } from '../logic/cart';
import { tipAt, tipNeedsConfirm, tipPercent } from '../logic/tips';
import type { RestaurantModal } from '../state/restaurant';
import { usePos } from '../state/PosProvider';
import { Field, FilledButton, ModalFrame, OutlineButton } from './ModalFrame';
import { Stack } from '../components/Stack';

/**
 * Changing a card tip after the fact (V1 → V2, Wave 2).
 *
 * The usual percentages are one tap, because a server adjusting a tip is copying a number off a
 * signed slip and wants to check it is sane. A tip bigger than half the sale is accepted — it
 * happens — but only after a second confirm, because it is far more often an $80 typed for $8.00.
 */
const PRESETS = [15, 18, 20, 22];

export function AdjustTipDialog({ m }: { m: Extract<RestaurantModal, { kind: 'adjustTip' }> }) {
  const { state, dispatch, toast } = usePos();
  const p = state.payments.find((x) => x.id === m.paymentId);
  const [text, setText] = useState(p ? p.tip.toFixed(2) : '0.00');
  const [confirming, setConfirming] = useState(false);
  if (!p) return null;

  const tip = Math.max(0, Math.round((parseFloat(text) || 0) * 100) / 100);
  const needsConfirm = tipNeedsConfirm(p.amount, tip);
  const close = () => dispatch({ type: 'closeModal' });
  const save = () => {
    if (needsConfirm && !confirming) return setConfirming(true);
    dispatch({ type: 'adjustTip', paymentId: p.id, tip });
    close();
    toast(`Tip on ${p.orderNumber} is now ${money(tip)}`);
  };

  return (
    <ModalFrame
      title={`Adjust tip · ${p.orderNumber}`}
      subtitle={`${p.time} · ${p.cardLast4 ? `Card •••• ${p.cardLast4}` : 'Card'} · ${staffById(p.staffId)?.short ?? ''}`}
      icon="attach_money"
      width={460}
      onClose={close}
      actions={
        <>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
          <Box sx={{ flex: 1 }} />
          <FilledButton onClick={save}>{confirming ? `Yes, tip ${money(tip)}` : 'Save tip'}</FilledButton>
        </>
      }
    >
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant }}>Sale</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{money(p.amount)}</Typography>
      </Stack>

      <Stack direction="row" gap={0.75} sx={{ mb: 1.5 }}>
        {PRESETS.map((pct) => {
          const v = tipAt(p.amount, pct);
          const on = Math.abs(v - tip) < 0.005;
          return (
            <ButtonBase
              key={pct}
              data-tip-preset={pct}
              onClick={() => {
                setText(v.toFixed(2));
                setConfirming(false);
              }}
              sx={{
                flex: 1,
                height: 56,
                flexDirection: 'column',
                borderRadius: `${radius.md}px`,
                border: `1.5px solid ${on ? md3.primary : md3.outlineVariant}`,
                bgcolor: on ? md3.primaryContainer : '#fff',
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{pct}%</Typography>
              <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>{money(v)}</Typography>
            </ButtonBase>
          );
        })}
      </Stack>

      <Field
        label="Tip"
        prefix="$"
        value={text}
        onChange={(v) => {
          setText(v.replace(/[^0-9.]/g, ''));
          setConfirming(false);
        }}
        hint={`${tipPercent({ amount: p.amount, tip })}% · new total ${money(p.amount + tip)}`}
      />

      {needsConfirm && (
        <Box
          data-tip-warning
          sx={{ mt: 1.5, p: '10px 12px', borderRadius: `${radius.md}px`, bgcolor: '#fef3c7', color: '#78350f', fontSize: 12.5, fontWeight: 600 }}
        >
          That is more than half the sale. Check the slip — {confirming ? 'tap again to confirm.' : 'you will be asked once more.'}
        </Box>
      )}
    </ModalFrame>
  );
}
