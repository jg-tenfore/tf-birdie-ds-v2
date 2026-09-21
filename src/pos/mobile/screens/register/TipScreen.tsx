import { useState } from 'react';
import { Box, Button, ButtonBase, InputAdornment, TextField, Typography } from '@mui/material';
import { md3, mobile, radius } from '../../../../theme/tokens';
import * as cartLogic from '../../../logic/cart';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { BottomActionBar, MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { orderMoney } from './parts';

/**
 * Tip — pushed from checkout for card payments; back returns to the tender list.
 *
 * Its own step, before the reader, because the tip changes the amount the reader asks
 * for. The terminal handles that with a staged tip and a Recalculate button; here the
 * amount simply isn't sent to the reader until the operator continues, so a mistyped tip
 * can't become the charge without being seen on the button first.
 */

const PRESETS = [
  { id: 'none', label: 'No tip', pct: 0 },
  { id: '15', label: '15%', pct: 0.15 },
  { id: '18', label: '18%', pct: 0.18 },
  { id: '20', label: '20%', pct: 0.2 },
] as const;

export function TipScreen({ route }: ScreenProps<'tip'>) {
  const { state } = usePos();
  const nav = useMobileNav();
  const { total, goods } = orderMoney(state.cart);
  const [choice, setChoice] = useState<string>('none');
  const [custom, setCustom] = useState('');

  const preset = PRESETS.find((p) => p.id === choice);
  // Percentages apply to goods, not tax — the convention on a printed tip line.
  const tip = choice === 'custom' ? Math.max(0, Number.parseFloat(custom) || 0) : +(goods * (preset?.pct ?? 0)).toFixed(2);
  const amount = +(total + tip).toFixed(2);

  return (
    <MobileScreen
      topBar={<TopAppBar title="Add a tip" subtitle={`${route.method === 'card' ? 'Card' : route.method} · ${cartLogic.money(total)} due`} />}
      bottomBar={
        <BottomActionBar
          summary={
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
                {cartLogic.money(total)} + {cartLogic.money(tip)} tip
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {cartLogic.money(amount)}
              </Typography>
            </Stack>
          }
        >
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => nav.push({ name: 'paymentReader', method: route.method, amount })}
          >
            Continue to reader
          </Button>
        </BottomActionBar>
      }
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, p: 2 }}>
        {PRESETS.map((p) => (
          <TipCard
            key={p.id}
            on={choice === p.id}
            label={p.label}
            sub={p.pct ? cartLogic.money(+(goods * p.pct).toFixed(2)) : 'Charge the total'}
            onClick={() => setChoice(p.id)}
          />
        ))}
      </Box>
      <Box sx={{ px: 2 }}>
        <TipCard
          on={choice === 'custom'}
          label="Custom amount"
          sub="Enter a tip in dollars"
          onClick={() => setChoice('custom')}
          wide
        />
        {choice === 'custom' && (
          <TextField
            autoFocus
            label="Tip"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ''))}
            slotProps={{
              htmlInput: { inputMode: 'decimal' },
              input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
            }}
            sx={{ mt: 2 }}
          />
        )}
      </Box>
    </MobileScreen>
  );
}

function TipCard({
  on,
  label,
  sub,
  onClick,
  wide,
}: {
  on: boolean;
  label: string;
  sub: string;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={on}
      sx={{
        width: '100%',
        flexDirection: 'column',
        alignItems: wide ? 'flex-start' : 'center',
        gap: 0.5,
        py: wide ? 2 : 2.5,
        px: 2,
        borderRadius: `${radius.lg}px`,
        border: `1px solid ${on ? md3.primary : md3.outlineVariant}`,
        bgcolor: on ? md3.primaryContainer : mobile.surfaceContainerLow,
        color: on ? md3.onPrimaryContainer : md3.onSurface,
      }}
    >
      <Typography variant={wide ? 'subtitle1' : 'h4'} sx={{ color: 'inherit' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: on ? md3.onPrimaryContainer : md3.onSurfaceVariant }}>
        {sub}
      </Typography>
    </ButtonBase>
  );
}
