import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Button, ButtonBase, CircularProgress, Typography } from '@mui/material';
import { keyframes } from '@emotion/react';
import BackspaceOutlined from '@mui/icons-material/BackspaceOutlined';
import CardGiftcardOutlined from '@mui/icons-material/CardGiftcardOutlined';
import Contactless from '@mui/icons-material/Contactless';
import CreditCard from '@mui/icons-material/CreditCard';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { PR_CONFIG } from '../../../data/config';
import * as cartLogic from '../../../logic/cart';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { useCompletePayment } from './parts';

/**
 * Taking payment — a **takeover**: no back arrow, no navigation bar, and a back gesture
 * does nothing. Mid-transaction is the one moment an accidental swipe must not undo, so
 * the only ways out are the explicit Cancel (returns to the step before) or an approval,
 * which *replaces* this screen with the receipt so there is nothing to go back to.
 *
 * Card and gift certificate wait on the reader; cash is the same takeover in its
 * tendered form — a keypad and the change due — because handing over change is just as
 * much "mid-transaction" as a card on the reader.
 *
 * The reader can't be driven from a prototype, so "Simulate approval" stands in for the
 * customer tapping their card.
 */
export function PaymentReaderScreen({ route }: ScreenProps<'paymentReader'>) {
  const nav = useMobileNav();
  const { toast } = usePos();
  const complete = useCompletePayment();
  const [stage, setStage] = useState<'waiting' | 'processing'>('waiting');
  const isCash = route.method.startsWith('cash');
  const cfg = PR_CONFIG[route.method] ?? PR_CONFIG.card;

  const approve = () => {
    complete(route.method, route.amount);
    nav.replace({ name: 'paymentComplete' });
  };

  // A short beat stands in for the processor round-trip, so "Processing" is actually seen.
  // Cancel is disabled meanwhile, so the screen can't unmount under the timer.
  const simulate = () => {
    setStage('processing');
    window.setTimeout(approve, 900);
  };

  const header = (
    <Stack direction="row" alignItems="center" sx={{ height: mobile.topAppBarH, px: 1, flexShrink: 0 }}>
      <Button onClick={() => nav.pop()} disabled={stage === 'processing'}>
        Cancel
      </Button>
      <Typography variant="subtitle1" sx={{ flex: 1, textAlign: 'center', mr: 10 }}>
        {cfg.title}
      </Typography>
    </Stack>
  );

  if (isCash) return <CashTender amount={route.amount} header={header} onDone={approve} />;

  const Ico = route.method === 'giftcert' ? CardGiftcardOutlined : CreditCard;

  return (
    <MobileScreen
      topBar={header}
      bottomBar={
        <Box sx={{ px: 2, pb: 2, pt: 1 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={stage === 'processing'}
            onClick={simulate}
          >
            Simulate approval
          </Button>
          {cfg.showKeyIn && (
            <Button fullWidth sx={{ mt: 1 }} disabled={stage === 'processing'} onClick={() => toast('Key-in — coming soon')}>
              {route.method === 'giftcert' ? 'Key in number' : 'Key in card'}
            </Button>
          )}
        </Box>
      }
    >
      <Stack alignItems="center" justifyContent="center" gap={3} sx={{ minHeight: '100%', px: 3, textAlign: 'center' }}>
        <Box sx={{ position: 'relative', width: 160, height: 160, display: 'grid', placeItems: 'center' }}>
          {stage === 'waiting' && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                bgcolor: md3.primaryContainer,
                animation: `${pulse} 1.6s ${mobile.motion.easing} infinite`,
              }}
            />
          )}
          <Box
            sx={{
              position: 'relative',
              width: 112,
              height: 112,
              borderRadius: '50%',
              bgcolor: md3.primary,
              color: md3.onPrimary,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {stage === 'processing' ? (
              <CircularProgress size={48} sx={{ color: md3.onPrimary }} />
            ) : route.method === 'card' ? (
              <Contactless sx={{ fontSize: 56 }} />
            ) : (
              <Ico sx={{ fontSize: 56 }} />
            )}
          </Box>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 57, lineHeight: 1.1, fontWeight: 400 }}>{cartLogic.money(route.amount)}</Typography>
          <Typography variant="h5" sx={{ mt: 1.5 }}>
            {stage === 'processing'
              ? 'Processing…'
              : route.method === 'card'
                ? 'Tap, insert or swipe'
                : 'Scan gift certificate'}
          </Typography>
          <Typography variant="body2" sx={{ color: md3.onSurfaceVariant, mt: 0.75 }}>
            {stage === 'processing' ? "Don't remove the card" : 'Hand the reader to the customer'}
          </Typography>
        </Box>
      </Stack>
    </MobileScreen>
  );
}

const pulse = keyframes`
  0%   { transform: scale(.72); opacity: .9; }
  100% { transform: scale(1);   opacity: 0; }
`;

// ─── Cash ───────────────────────────────────────────────────────────────────

/** Next "sensible" notes above the amount — exact, then round-ups a customer hands over. */
function quickTenders(amount: number): number[] {
  const ups = [5, 10, 20, 50, 100].map((n) => Math.ceil(amount / n) * n);
  return [...new Set([amount, ...ups])].filter((v) => v >= amount).slice(0, 4);
}

function CashTender({ amount, header, onDone }: { amount: number; header: ReactNode; onDone: () => void }) {
  const [digits, setDigits] = useState('');
  const tendered = digits ? Number.parseInt(digits, 10) / 100 : 0;
  const change = +(tendered - amount).toFixed(2);
  const enough = tendered >= amount;

  const press = (k: string) => {
    if (k === 'back') return setDigits((d) => d.slice(0, -1));
    setDigits((d) => (d.length >= 7 ? d : (d + k).replace(/^0+(?=\d)/, '')));
  };

  return (
    <MobileScreen
      topBar={header}
      bottomBar={
        <Box sx={{ px: 2, pb: 2, pt: 1 }}>
          <Button variant="contained" size="large" fullWidth disabled={!enough} onClick={onDone} startIcon={<PaymentsOutlined />}>
            {enough ? `Cash received · change ${cartLogic.money(change)}` : `Enter at least ${cartLogic.money(amount)}`}
          </Button>
        </Box>
      }
    >
      <Stack alignItems="center" sx={{ px: 2, pt: 1 }}>
        <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
          Due {cartLogic.money(amount)}
        </Typography>
        <Typography sx={{ fontSize: 45, lineHeight: 1.2 }}>{cartLogic.money(tendered)}</Typography>
        <Typography variant="subtitle1" sx={{ color: enough ? md3.primary : md3.onSurfaceVariant, minHeight: 24 }}>
          {enough ? `Change due ${cartLogic.money(change)}` : 'Amount tendered'}
        </Typography>
      </Stack>

      <Stack direction="row" gap={1} sx={{ px: 2, pt: 2 }}>
        {quickTenders(amount).map((v) => (
          <Button
            key={v}
            variant="outlined"
            onClick={() => setDigits(String(Math.round(v * 100)))}
            sx={{ flex: 1, px: 0, minWidth: 0 }}
          >
            {v === amount ? 'Exact' : cartLogic.moneyShort(v)}
          </Button>
        ))}
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, p: 2 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'].map((k) => (
          <ButtonBase
            key={k}
            onClick={() => press(k)}
            aria-label={k === 'back' ? 'Delete' : k}
            sx={{ height: 56, borderRadius: `${radius.md}px`, bgcolor: mobile.surfaceContainerLow, fontSize: 22 }}
          >
            {k === 'back' ? <BackspaceOutlined /> : k}
          </ButtonBase>
        ))}
      </Box>
    </MobileScreen>
  );
}
