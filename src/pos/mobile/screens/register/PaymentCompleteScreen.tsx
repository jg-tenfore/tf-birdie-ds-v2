import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Button, ButtonBase, Typography } from '@mui/material';
import Check from '@mui/icons-material/Check';
import CheckCircle from '@mui/icons-material/CheckCircle';
import DoNotDisturbAltOutlined from '@mui/icons-material/DoNotDisturbAltOutlined';
import MailOutlined from '@mui/icons-material/MailOutlined';
import PrintOutlined from '@mui/icons-material/PrintOutlined';
import SmsOutlined from '@mui/icons-material/SmsOutlined';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { findMemberByName, findMemberByPhone } from '../../../data/golfers';
import * as cartLogic from '../../../logic/cart';
import { selectedBooking } from '../../../state/pos-store';
import { useGolferRoster, usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import { orderLines } from './parts';

/**
 * Receipt — a **takeover** that *replaced* the reader, so there's no back: the sale is
 * done and there is nothing behind it to return to. Its exits are forward only.
 *
 *  - **New order** clears the order and pops the Register stack to its root, ready for
 *    the next customer — the phone's version of the terminal's New order button.
 *  - For a round that came from the tee sheet, **Back to tee sheet** does the same and
 *    switches destination, because that's where the operator was working.
 *
 * Receipt delivery is a choice, not a step: tapping one marks it sent and stays here.
 */
export function PaymentCompleteScreen() {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const [sent, setSent] = useState<string | null>(null);
  const booking = selectedBooking(state);
  const roster = useGolferRoster();
  const paid = state.lastPayment;
  const golfer =
    state.selectedGolfer ?? (booking ? (findMemberByPhone(booking.phone, roster) ?? findMemberByName(booking.name, roster)) : undefined);

  const finish = (toTee: boolean) => {
    dispatch({ type: 'clearOrder' });
    nav.popToRoot();
    if (toTee) nav.selectTab('tee');
  };

  const receipt = (id: string, label: string) => {
    setSent(id);
    toast(label);
  };

  const lines = orderLines(state.cart).length;

  return (
    <MobileScreen
      bottomBar={
        <Box sx={{ px: 2, pb: 2, pt: 1 }}>
          <Button variant="contained" size="large" fullWidth onClick={() => finish(false)}>
            New order
          </Button>
          {booking && (
            <Button fullWidth sx={{ mt: 1 }} onClick={() => finish(true)}>
              Back to tee sheet
            </Button>
          )}
        </Box>
      }
    >
      <Stack alignItems="center" sx={{ pt: 6, px: 3, textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 72, color: md3.primary }} />
        <Typography variant="h4" sx={{ mt: 2 }}>
          Payment approved
        </Typography>
        <Typography sx={{ fontSize: 45, lineHeight: 1.2, mt: 1 }}>{cartLogic.money(paid?.amount ?? 0)}</Typography>
        <Typography variant="body2" sx={{ color: md3.onSurfaceVariant, mt: 1 }}>
          {methodLabel(paid?.method)} · {paid?.time ?? '—'} · {lines} line{lines === 1 ? '' : 's'}
          {booking ? ` · ${booking.conf}` : ''}
        </Typography>
      </Stack>

      <Typography variant="subtitle2" sx={{ color: md3.primary, px: 2, pt: 4, pb: 1 }}>
        Receipt
      </Typography>
      <Box sx={{ mx: 2, borderRadius: `${radius.lg}px`, bgcolor: mobile.surfaceContainerLow, overflow: 'hidden' }}>
        <ReceiptOption icon={<PrintOutlined />} label="Print" sent={sent === 'print'} onClick={() => receipt('print', 'Receipt printed')} />
        <ReceiptOption
          icon={<MailOutlined />}
          label="Email"
          detail={golfer?.email}
          sent={sent === 'email'}
          onClick={() => receipt('email', `Receipt emailed${golfer?.email ? ` to ${golfer.email}` : ''}`)}
        />
        <ReceiptOption
          icon={<SmsOutlined />}
          label="Text"
          detail={golfer?.phone ?? booking?.phone}
          sent={sent === 'text'}
          onClick={() => receipt('text', 'Receipt texted')}
        />
        <ReceiptOption icon={<DoNotDisturbAltOutlined />} label="No receipt" sent={sent === 'none'} onClick={() => setSent('none')} last />
      </Box>
    </MobileScreen>
  );
}

const methodLabel = (m?: string) =>
  !m ? 'Paid' : m === 'giftcert' ? 'Gift certificate' : m === 'cashpay' ? 'Cash' : m.charAt(0).toUpperCase() + m.slice(1);

function ReceiptOption({
  icon,
  label,
  detail,
  sent,
  onClick,
  last,
}: {
  icon: ReactNode;
  label: string;
  detail?: string;
  sent: boolean;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        gap: 2,
        px: 2,
        minHeight: detail ? mobile.listItem.two : mobile.listItem.one,
        borderBottom: last ? 'none' : `1px solid ${md3.outlineVariant}`,
        textAlign: 'left',
      }}
    >
      <Box sx={{ display: 'flex', color: md3.onSurfaceVariant }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1">{label}</Typography>
        {detail && (
          <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
            {detail}
          </Typography>
        )}
      </Box>
      {sent && <Check sx={{ color: md3.primary }} />}
    </ButtonBase>
  );
}
