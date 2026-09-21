import { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import NightlightOutlined from '@mui/icons-material/NightlightOutlined';
import WbSunnyOutlined from '@mui/icons-material/WbSunnyOutlined';
import WbTwilightOutlined from '@mui/icons-material/WbTwilightOutlined';
import { md3, mobile, payBadges, radius, shifts } from '../../../../theme/tokens';
import { RATE_PRICING, TEE_PRICES } from '../../../data/courses';
import { money, moneyShort } from '../../../logic/cart';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { MobileScreen, TopAppBar } from '../../chrome';
import type { ScreenProps } from '../types';
import { ChipRow, FilterChip } from './parts';

type Band = 'early' | 'peak' | 'twilight';
const BANDS: Array<{ id: Band; short: string; Icon: typeof WbSunnyOutlined }> = [
  { id: 'early', short: 'Early', Icon: WbTwilightOutlined },
  { id: 'peak', short: 'Peak', Icon: WbSunnyOutlined },
  { id: 'twilight', short: 'Twilight', Icon: NightlightOutlined },
];

const hourLabel = (h: number) => `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`;

/** How a tee-sheet booking of each kind is priced before any rate is chosen. */
const BOOKING_DEFAULTS: Array<{ key: keyof typeof TEE_PRICES; label: string }> = [
  { key: 'booked', label: 'Reservation' },
  { key: 'walkin', label: 'Walk-in' },
  { key: 'member', label: 'Member' },
  { key: 'group', label: 'Group' },
];

/**
 * The published rate card — read-only, so a push page with a back arrow, not a dialog.
 *
 * Time-of-day bands are MD3 primary tabs (they're views of the same card); the course
 * selector is a chip row because the club may have one course or three. Rates are the
 * same across courses in this data set — the selector is there so the structure is right
 * when they diverge.
 */
export function RateCardScreen({ route }: ScreenProps<'rateCard'>) {
  const { state } = usePos();
  const visible = state.courses.filter((c) => c.visible);
  const [courseId, setCourseId] = useState(route.courseId ?? visible[0]?.id ?? '');
  const [band, setBand] = useState<Band>('peak');
  const course = state.courses.find((c) => c.id === courseId);
  const day = state.currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const s = shifts[band];

  return (
    <MobileScreen
      topBar={
        <TopAppBar title="Rate card" subtitle={`${course?.name ?? ''} · ${day}`}>
          {visible.length > 1 && (
            <ChipRow>
              {visible.map((c) => (
                <FilterChip key={c.id} label={c.name} selected={c.id === courseId} onClick={() => setCourseId(c.id)} />
              ))}
            </ChipRow>
          )}
          <Tabs value={band} onChange={(_, v: Band) => setBand(v)} variant="fullWidth" sx={{ borderBottom: `1px solid ${md3.outlineVariant}` }}>
            {BANDS.map(({ id, short, Icon }) => (
              <Tab
                key={id}
                value={id}
                label={short}
                icon={<Icon sx={{ color: shifts[id].iconColor }} />}
                iconPosition="start"
                sx={{ minHeight: 48 }}
              />
            ))}
          </Tabs>
        </TopAppBar>
      }
    >
      <Typography variant="body2" sx={{ px: 2, pt: 2, color: md3.onSurfaceVariant }}>
        {s.label} · {hourLabel(s.startH)} – {hourLabel(s.endH)}
      </Typography>

      <Box sx={{ m: 2, mt: 1.5, borderRadius: `${radius.md}px`, border: `1px solid ${md3.outlineVariant}`, overflow: 'hidden' }}>
        <Stack direction="row" sx={{ px: 2, py: 1, bgcolor: md3.surfaceContainer }}>
          <Typography variant="overline" sx={{ flex: 1 }}>
            Rate
          </Typography>
          <Typography variant="overline" sx={{ width: 64, textAlign: 'right' }}>
            18 holes
          </Typography>
          <Typography variant="overline" sx={{ width: 64, textAlign: 'right' }}>
            9 holes
          </Typography>
        </Stack>
        {RATE_PRICING[band].map((r) => (
          <Stack
            key={r.rate}
            direction="row"
            alignItems="center"
            sx={{
              px: 2,
              minHeight: 56,
              borderTop: `1px solid ${md3.surfaceContainer}`,
              bgcolor: r.rack ? s.bg ?? 'transparent' : 'transparent',
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0, py: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: r.rack ? 700 : 400, color: md3.onSurface }}>
                {r.rate}
              </Typography>
              {(r.discount === 100 || r.rack || (r.discount && r.discount < 100)) && (
                <Typography variant="caption" sx={{ color: r.rack ? payBadges.rain_chk.text : payBadges.paid.text, fontWeight: 500 }}>
                  {r.rack ? 'Rack rate' : r.discount === 100 ? 'Included in membership' : `${r.discount}% member discount`}
                </Typography>
              )}
            </Box>
            <Typography variant="body2" sx={{ width: 64, textAlign: 'right', fontWeight: 500, color: md3.onSurface }}>
              {money(r.p18)}
            </Typography>
            <Typography variant="body2" sx={{ width: 64, textAlign: 'right', fontWeight: 500, color: md3.onSurface }}>
              {money(r.p9)}
            </Typography>
          </Stack>
        ))}
      </Box>

      <Typography variant="subtitle2" sx={{ color: md3.primary, px: 2, pt: 1, pb: 1 }}>
        Tee sheet booking defaults
      </Typography>
      <Box sx={{ mx: 2, borderRadius: `${radius.md}px`, bgcolor: mobile.surfaceContainerLow, border: `1px solid ${md3.outlineVariant}` }}>
        {BOOKING_DEFAULTS.map(({ key, label }, i) => {
          const p = TEE_PRICES[key];
          return (
            <Stack
              key={key}
              direction="row"
              alignItems="center"
              sx={{ px: 2, minHeight: 56, borderTop: i ? `1px solid ${md3.outlineVariant}` : 'none' }}
            >
              <Typography variant="body1" sx={{ flex: 1 }}>
                {label}
              </Typography>
              <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
                {moneyShort(p.basePrice)} round · {moneyShort(p.cartFee)} cart
              </Typography>
            </Stack>
          );
        })}
      </Box>

      <Typography variant="caption" component="p" sx={{ px: 2, py: 2 }}>
        Overrides set on a tee-sheet row take precedence over these rates for the rows they cover.
      </Typography>
    </MobileScreen>
  );
}
