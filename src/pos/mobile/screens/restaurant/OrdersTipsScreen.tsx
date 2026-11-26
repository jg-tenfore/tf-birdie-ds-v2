import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { DEMO_TODAY } from '../../../data/bookings';
import { toDateStr } from '../../../data/courses';
import { staffById } from '../../../data/staff';
import { money } from '../../../logic/cart';
import { clockMin } from '../../../logic/tab-list';
import { dayTotals, tipPercent, tipsByStaff } from '../../../logic/tips';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { Empty, Pill, ScrollRow } from './parts';
import { isRootRoute } from './restaurant-helpers';

/**
 * Orders & Tips — today's payments, read-only on the handheld (V1 → V2).
 *
 * The tablet's `OrdersTipsView` is where tips are adjusted after the fact and refunds are found.
 * The handheld answers the question a server asks at the end of a shift — *what did I take, and
 * what did I make* — from the same payment ledger and arithmetic (`logic/tips.ts`): the day's
 * totals, always numbers, tips by person, and every payment newest first with its tip and
 * percentage. **Mine** narrows it to the signed-in operator. Adjusting a tip stays on the tablet,
 * so the phone can't change money it can't show the whole picture of (an open question).
 */
export function OrdersTipsScreen({ route }: ScreenProps<'ordersTips'>) {
  const { state } = usePos();
  const nav = useMobileNav();
  const [mine, setMine] = useState(false);
  const today = toDateStr(DEMO_TODAY());
  const day = state.payments.filter((p) => p.date === today);
  const shown = (mine ? day.filter((p) => p.staffId === state.operatorId) : day)
    .slice()
    .sort((a, b) => (clockMin(b.time) ?? 0) - (clockMin(a.time) ?? 0));
  const t = dayTotals(shown);
  const byStaff = tipsByStaff(day, state.staffRoster);

  return (
    <MobileScreen
      topBar={
        <TopAppBar title="Orders & Tips" subtitle="Today · read-only here" leading={isRootRoute(nav, route) ? 'none' : 'back'}>
          <ScrollRow label="Whose payments" sx={{ pb: 1 }}>
            <Pill label="Everyone" active={!mine} onClick={() => setMine(false)} />
            <Pill label="Mine" active={mine} onClick={() => setMine(true)} />
          </ScrollRow>
        </TopAppBar>
      }
    >
      <Box data-day-totals sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, px: 2, pt: 1 }}>
        <Total label="Sales" value={money(t.sales)} />
        <Total label="Tips" value={money(t.tips)} />
        <Total label="Card" value={money(t.card)} />
        <Total label="Cash" value={money(t.cash)} />
        <Total label="Payments" value={String(t.payments)} />
        <Total label="Average tip" value={`${t.averageTipPct}%`} />
      </Box>

      {!mine && byStaff.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ px: 2, pt: 2.5, pb: 0.5, color: md3.primary }}>
            Tips by person
          </Typography>
          {byStaff.map((s) => (
            <Stack
              key={s.staffId}
              direction="row"
              justifyContent="space-between"
              sx={{ px: 2, py: 1, borderBottom: `1px solid ${md3.outlineVariant}` }}
            >
              <Typography variant="body1">{s.name}</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {money(s.tips)}
              </Typography>
            </Stack>
          ))}
        </>
      )}

      <Typography variant="subtitle2" sx={{ px: 2, pt: 2.5, pb: 0.5, color: md3.primary }}>
        Payments
      </Typography>
      {shown.length === 0 ? (
        <Empty icon={<ReceiptLongOutlined sx={{ fontSize: 48 }} />} title="No payments yet" />
      ) : (
        shown.map((p) => (
          <Stack
            key={p.id}
            direction="row"
            alignItems="center"
            gap={1.5}
            data-payment={p.id}
            sx={{ px: 2, minHeight: mobile.listItem.two, borderBottom: `1px solid ${md3.outlineVariant}` }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" noWrap>
                {p.kind === 'refund' ? 'Refund · ' : ''}#{p.orderNumber}
              </Typography>
              <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
                {p.time} · {p.method}
                {p.cardLast4 ? ` ··${p.cardLast4}` : ''} · {staffById(p.staffId, state.staffRoster)?.short ?? p.staffId}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: p.amount < 0 ? md3.error : md3.onSurface }}>
                {money(p.amount)}
              </Typography>
              <Typography variant="caption">{p.tip ? `+${money(p.tip)} · ${tipPercent(p)}%` : 'No tip'}</Typography>
            </Box>
          </Stack>
        ))
      )}
      <Box sx={{ height: 24 }} />
    </MobileScreen>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ px: 1.5, py: 1, borderRadius: `${radius.md}px`, bgcolor: mobile.surfaceContainerLow }}>
      <Typography variant="caption">{label}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Box>
  );
}
