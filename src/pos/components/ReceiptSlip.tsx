import { Box, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { money, type OrderTotals } from '../logic/cart';
import { lineAmount } from '../logic/order-lookup';
import type { CartItem } from '../types';
import { Stack } from './Stack';

/**
 * The receipt, as it prints (V1 → V2, Settings) — on the card reader's done step, so the receipt is
 * seen before it is printed, and whether it prints at all follows Settings' "Receipts after a sale".
 * The header and footer are Settings' own text; the rest is the order being paid.
 *
 * Receipt-width and monospaced on purpose: it is the paper, not the screen, being shown.
 */
export function ReceiptSlip({
  header,
  footer,
  register,
  when,
  lines,
  totals,
  tip,
  tender,
  amount,
  earlier = [],
}: {
  header: string;
  footer: string;
  register: string;
  when: string;
  lines: CartItem[];
  totals: OrderTotals;
  tip: number;
  tender: string;
  amount: number;
  /** On a split, what the tenders before this one paid. */
  earlier?: { label: string; amount: number }[];
}) {
  const row = (label: string, value: string, strong?: boolean) => (
    <Stack direction="row" justifyContent="space-between" sx={{ fontWeight: strong ? 800 : 400 }}>
      <span>{label}</span>
      <span>{value}</span>
    </Stack>
  );
  const items = lines.filter((l) => !l.isTax && l.name !== 'Taxes');
  return (
    <Box
      data-receipt
      sx={{
        width: 300,
        maxHeight: 260,
        overflowY: 'auto',
        mx: 'auto',
        p: '14px 16px',
        bgcolor: '#fff',
        border: `1px dashed ${md3.outline}`,
        borderRadius: `${radius.sm}px`,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11.5,
        lineHeight: 1.5,
        color: md3.onSurface,
      }}
    >
      <Typography data-receipt-header sx={{ font: 'inherit', fontWeight: 800, textAlign: 'center', whiteSpace: 'pre-line' }}>
        {header}
      </Typography>
      <Typography sx={{ font: 'inherit', textAlign: 'center', color: md3.onSurfaceVariant, mb: 1 }}>
        {register} · {when}
      </Typography>
      <Box sx={{ borderTop: `1px dashed ${md3.outlineVariant}`, pt: 0.75, mb: 0.75 }}>
        {items.map((l, i) => (
          <Box key={i}>{row(`${l.isCheckIn ? '' : `${l.qty}× `}${l.name}`, money(lineAmount(l)))}</Box>
        ))}
      </Box>
      <Box sx={{ borderTop: `1px dashed ${md3.outlineVariant}`, pt: 0.75 }}>
        {row('Subtotal', money(totals.subtotal))}
        {row('Tax', money(totals.tax))}
        {tip > 0 && row('Tip', money(tip))}
        {earlier.map((e, i) => (
          <Box key={i}>{row(e.label, money(e.amount))}</Box>
        ))}
        {row(tender, money(amount), true)}
      </Box>
      <Typography data-receipt-footer sx={{ font: 'inherit', textAlign: 'center', color: md3.onSurfaceVariant, mt: 1, whiteSpace: 'pre-line' }}>
        {footer}
      </Typography>
    </Box>
  );
}
