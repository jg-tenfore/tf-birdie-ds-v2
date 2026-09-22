import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, payBadges, radius } from '../../theme/tokens';
import { TRANSPORT_META } from '../data/config';
import * as cart from '../logic/cart';
import type { Booking, CartItem } from '../types';
import { usePos } from '../state/PosProvider';
import { BookingMemberDot, Icon, MemberDot, SectionLabel } from './primitives';
import { Stack } from './Stack';

/**
 * The golf on the order, read-only (Weston Edits · register).
 *
 * Once a reservation is checked in, the register shows *what it is charging for* — players,
 * holes, fee and transport per player — and nothing to fiddle with. Changing the golf means
 * going back to the reservation (**Edit reservation**), because that is where golf is
 * decided; "+ modifier" and "Guest Details" are gone from golf lines. Modifiers still apply
 * to food, beverage and retail.
 *
 * Reads the cart lines, not the booking, so every number here is what Pay will charge.
 */
export function RegisterGolfSummary({ booking: b, lines }: { booking: Booking; lines: CartItem[] }) {
  const { state, dispatch } = usePos();
  const round = lines[0];
  const course = state.courses.find((c) => c.id === b.course);
  const players = lines.flatMap((l) => (l.players ?? []).map((p) => ({ p, unit: l.unitPrice ?? l.price })));
  const total = players.reduce((s, x) => s + cart.playerPrice(x.unit, x.p), 0);

  return (
    <Box
      data-golf-summary
      sx={{
        bgcolor: md3.surfaceContainer,
        borderRadius: `${radius.md}px`,
        borderLeft: `3px solid ${md3.primary}`,
        p: '11px 12px',
        mb: 1.25,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <SectionLabel color={md3.primary}>
          {round?.name ?? 'Tee time'} · {b.conf}
        </SectionLabel>
        <Icon name="golf_course" size={16} color={md3.primary} />
      </Stack>
      <Stack direction="row" alignItems="center" gap={0.75} sx={{ fontSize: 12, mb: 1 }}>
        <Icon name="schedule" size={14} color={md3.onSurfaceVariant} />
        <Box component="span" sx={{ fontWeight: 700 }}>
          {round?.teeTime?.label}
        </Box>
        <Box component="span" sx={{ color: md3.onSurfaceVariant }}>
          · {course?.name ?? round?.teeTime?.courseName}
        </Box>
      </Stack>

      <Stack gap={0.5}>
        {players.map(({ p, unit }, i) => {
          const bd = cart.playerBreakdown(unit, p);
          const settled = p.paid || p.noShow;
          return (
            <Stack
              key={i}
              direction="row"
              alignItems="center"
              gap={0.75}
              sx={{ p: '6px 8px', bgcolor: md3.onPrimary, borderRadius: `${radius.sm}px`, opacity: p.noShow ? 0.6 : 1 }}
            >
              {i === 0 ? <BookingMemberDot booking={b} size={6} /> : <MemberDot name={p.name} size={6} />}
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
                {p.name}
              </Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: md3.onSurfaceVariant }}>{p.holes ?? 9}H</Typography>
              <Icon name={TRANSPORT_META[p.transport]?.icon ?? 'directions_walk'} size={14} color={md3.onSurfaceVariant} />
              <Box sx={{ minWidth: 64, textAlign: 'right' }}>
                {settled ? (
                  <Box
                    component="span"
                    sx={{
                      fontSize: 10,
                      fontWeight: 800,
                      px: 0.75,
                      py: '1px',
                      borderRadius: `${radius.xl}px`,
                      bgcolor: p.noShow ? payBadges.no_show.bg : payBadges.paid.bg,
                      color: p.noShow ? payBadges.no_show.text : payBadges.paid.text,
                    }}
                  >
                    {p.noShow ? 'NO SHOW' : 'PAID'}
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{cart.money(bd.total)}</Typography>
                )}
              </Box>
            </Stack>
          );
        })}
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
        <ButtonBase
          onClick={() => dispatch({ type: 'openReservation', bookingId: b.id })}
          sx={{
            gap: 0.5,
            px: 1.25,
            py: 0.625,
            borderRadius: `${radius.xl}px`,
            border: `1.5px solid ${md3.primary}`,
            color: md3.primary,
            fontSize: 12,
            fontWeight: 700,
            '&:hover': { bgcolor: md3.primaryContainer },
          }}
        >
          <Icon name="edit" size={14} />
          Edit reservation
        </ButtonBase>
        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
          {total > 0 ? `Golf ${cart.money(total)}` : 'Golf paid'}
        </Typography>
      </Stack>

      {b.note && (
        <Typography sx={{ fontSize: 11.5, mt: 0.75, color: md3.onSurfaceVariant, lineHeight: 1.35 }}>
          <Icon name="sticky_note_2" size={12} color={md3.onSurfaceVariant} /> {b.note}
        </Typography>
      )}
    </Box>
  );
}
