import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { Icon } from '../components/primitives';

/**
 * The drawer dialogs' cents keypad (V1 → V2, Wave 3): `2`, `0`, `0`, `0`, `0` reads $200.00 — the
 * entry model of Checkout's tendered pad and Wave 1's cash payout, so money is keyed one way
 * everywhere on the terminal.
 *
 * A copy of `RegisterDialogs`' private `AmountPad` rather than an import of it: that file belongs
 * to the register's dialogs, and exporting from it would couple three drawer dialogs to one of its
 * internals. The report proposes lifting both into one shared pad.
 */
export function CashAmountPad({ cents, onChange }: { cents: string; onChange: (digits: string) => void }) {
  const press = (k: string) => {
    if (k === 'back') return onChange(cents.slice(0, -1));
    if (cents.length >= 7) return;
    onChange((cents + k).replace(/^0+(?=\d)/, ''));
  };
  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0.75 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'].map((k) => (
          <ButtonBase
            key={k}
            data-key={k}
            aria-label={k === 'back' ? 'Delete' : k}
            onClick={() => press(k)}
            sx={{ height: 52, borderRadius: `${radius.md}px`, border: `1.5px solid ${md3.outlineVariant}`, bgcolor: '#fff', fontSize: 18, fontWeight: 700 }}
          >
            {k === 'back' ? <Icon name="backspace" size={20} /> : k}
          </ButtonBase>
        ))}
      </Box>
      <ButtonBase
        onClick={() => onChange('')}
        sx={{ mt: 0.75, width: '100%', height: 44, borderRadius: `${radius.md}px`, border: `1.5px solid ${md3.outlineVariant}`, fontSize: 13, fontWeight: 600, color: md3.onSurfaceVariant }}
      >
        Clear
      </ButtonBase>
    </Box>
  );
}

/**
 * The figure a pad is keying, as a tappable readout — tap it to make it the pad's target when a
 * dialog keys more than one amount (Close shift's cash and checks).
 */
export function AmountReadout({
  label,
  value,
  active,
  onClick,
  sub,
  ...rest
}: {
  label: string;
  value: string;
  active?: boolean;
  onClick?: () => void;
  sub?: string;
} & Record<`data-${string}`, string>) {
  const sx = {
    display: 'block',
    width: '100%',
    textAlign: 'right',
    p: '10px 14px',
    borderRadius: `${radius.md}px`,
    bgcolor: active ? md3.primaryContainer : md3.surfaceContainer,
    border: `1.5px solid ${active ? md3.primary : 'transparent'}`,
  } as const;
  const body = (
    <>
      <Typography component="span" sx={{ display: 'block', fontSize: 11, color: md3.onSurfaceVariant, fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography component="span" data-readout sx={{ display: 'block', fontSize: 26, fontWeight: 800, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      {sub && (
        <Typography component="span" sx={{ display: 'block', fontSize: 11, color: md3.onSurfaceVariant, mt: 0.25 }}>
          {sub}
        </Typography>
      )}
    </>
  );
  // A readout nothing can retarget is a figure, not a control — as a button it would read as one.
  if (!onClick) {
    return (
      <Box sx={sx} {...rest}>
        {body}
      </Box>
    );
  }
  return (
    <ButtonBase onClick={onClick} aria-pressed={Boolean(active)} sx={sx} {...rest}>
      {body}
    </ButtonBase>
  );
}
