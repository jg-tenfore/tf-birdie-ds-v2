import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { demoNow, minutesOfDay } from '../data/bookings';
import { RATE_PRICING } from '../data/courses';
import { moneyShort } from '../logic/cart';
import { rateBand } from '../logic/rates';
import { usePos } from '../state/PosProvider';
import type { Course } from '../types';
import { Icon } from './primitives';
import { Stack } from './Stack';

const BAND_LABEL = { early: 'Early morning · 6–10am', peak: 'Peak · 10am–2pm', twilight: 'Twilight · 2–6pm' } as const;
const fmtHour = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

/**
 * The course's ⓘ, as a callout under the button (V1 → V2, 100226).
 *
 * It used to open the full Tee time prices dialog over the sheet — a modal for what is usually a
 * glance. On the Oct 2 call Justin flagged the callouts as still not right, and the call was for
 * both: the course at a glance on top (holes, interval, hours, who's out today, any note), and the
 * rates for the band you are in below, with **Full rates** for the dialog when it is needed.
 */
export function CourseInfoCallout({ course, golfers, riders, walkers }: { course: Course; golfers: number; riders: number; walkers: number }) {
  const { state, dispatch } = usePos();
  const [open, setOpen] = useState(false);
  const band = rateBand(minutesOfDay(demoNow()));
  const rows = (RATE_PRICING[band] ?? []).slice(0, 5);
  const s = state.settings;
  const dayName = state.currentDate.toLocaleDateString('en-US', { weekday: 'long' });

  const link = (label: string, icon: string, run: () => void) => (
    <ButtonBase
      onClick={() => {
        setOpen(false);
        run();
      }}
      sx={{ gap: 0.5, px: 1, py: 0.5, borderRadius: `${radius.xl}px`, border: `1.5px solid ${md3.outlineVariant}`, fontSize: 12, fontWeight: 700, '&:hover': { bgcolor: md3.surfaceContainer } }}
    >
      <Icon name={icon} size={14} />
      {label}
    </ButtonBase>
  );

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <ButtonBase
        title="Course info"
        aria-label={`${course.name} info`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        sx={{ p: 0.375, borderRadius: '50%', color: open ? md3.primary : md3.onSurfaceVariant, '&:hover': { bgcolor: md3.surfaceContainer } }}
      >
        <Icon name="info" size={17} />
      </ButtonBase>
      {open && (
        <>
          <Box onClick={() => setOpen(false)} sx={{ position: 'fixed', inset: 0, zIndex: 199 }} />
          <Box
            data-course-info={course.id}
            role="dialog"
            aria-label={`${course.name} at a glance`}
            sx={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: -28,
              width: 300,
              zIndex: 200,
              bgcolor: '#fff',
              border: `1.5px solid ${md3.outlineVariant}`,
              borderRadius: `${radius.md}px`,
              boxShadow: '0 4px 8px 3px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.12)',
              textAlign: 'left',
              overflow: 'hidden',
            }}
          >
            {/* ── The course ── */}
            <Box sx={{ p: '10px 14px', borderBottom: `1px solid ${md3.surfaceContainer}` }} data-course-facts>
              <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{course.name}</Typography>
              <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 0.25 }}>
                {course.holeCount} holes · {s.intervalMins}-min interval · {fmtHour(s.gridStartHour)}–{fmtHour(s.gridEndHour)}
                {course.locked ? ' · Locked' : ''}
              </Typography>
              <Stack direction="row" gap={1.5} sx={{ mt: 0.75, fontSize: 12, fontWeight: 700 }}>
                <span>{golfers} golfers</span>
                <span>{riders} riding</span>
                <span>{walkers} walking</span>
              </Stack>
              {course.note && <Typography sx={{ fontSize: 11.5, color: '#92400e', mt: 0.5 }}>📌 {course.note}</Typography>}
            </Box>

            {/* ── Rates now ── */}
            <Box sx={{ p: '8px 14px 10px' }} data-course-rates={band}>
              <Stack direction="row" alignItems="baseline" sx={{ mb: 0.5 }}>
                <Typography sx={{ flex: 1, fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', color: md3.outline }}>
                  RATES · {BAND_LABEL[band].toUpperCase()}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ fontSize: 10.5, fontWeight: 700, color: md3.outline, mb: 0.25 }}>
                <Box sx={{ flex: 1 }} />
                <Box sx={{ width: 48, textAlign: 'right' }}>18</Box>
                <Box sx={{ width: 44, textAlign: 'right' }}>9</Box>
              </Stack>
              {rows.map((r) => (
                <Stack key={r.rate} direction="row" sx={{ py: 0.25, fontSize: 12 }}>
                  <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.rate}</Box>
                  <Box sx={{ width: 48, textAlign: 'right', fontWeight: 700 }}>{moneyShort(r.p18)}</Box>
                  <Box sx={{ width: 44, textAlign: 'right', fontWeight: 700 }}>{moneyShort(r.p9)}</Box>
                </Stack>
              ))}
              <Typography sx={{ fontSize: 10.5, color: md3.outline, mt: 0.5 }}>{dayName}'s published rates</Typography>
            </Box>

            <Stack direction="row" gap={0.75} sx={{ p: '8px 14px 10px', borderTop: `1px solid ${md3.surfaceContainer}` }}>
              {link('Full rates', 'sell', () => dispatch({ type: 'openModal', modal: { kind: 'courseRates', courseId: course.id } }))}
              {link('Time settings', 'schedule', () => dispatch({ type: 'openModal', modal: { kind: 'courseTimeSettings', courseId: course.id } }))}
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
}
