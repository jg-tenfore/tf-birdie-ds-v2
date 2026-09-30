import { useEffect, useState } from 'react';
import { Box, ButtonBase, Divider, Typography } from '@mui/material';
import { grid as gridTokens, md3, radius } from '../../theme/tokens';
import { DEMO_NOW_MIN, DEMO_TODAY } from '../data/bookings';
import { formatTimeLabel, toDateStr } from '../data/courses';
import { SHEETS, resourcesOf, type ResourceBooking, type ResourceKind } from '../data/resources';
import { canStartAt, clampDuration, formatDuration, maxDurationAt, snap } from '../logic/resource-booking';
import { usePos } from '../state/PosProvider';
import { DatePickerPopover } from './DatePickerPopover';
import { ToolbarButton } from './TeeSheetView';
import { Icon } from './primitives';
import { Stack } from './Stack';

/**
 * The court sheet and the bay sheet — one scheduler, configured twice (V1 → V2).
 *
 * ## What v1 did
 *
 * Two different schedulers for one job. **Court Sheet** was a stack of discrete 20-minute
 * cards, one column per court, with the time printed inside each card and no duration at all —
 * a booking stored only a display name. **Bay Sheet** was a continuous time axis with ruled
 * lines, where a booking's height was its length. An operator who could use one had to learn
 * the other from scratch, for the identical act of putting a person on a resource for a while.
 *
 * ## What this does
 *
 * One time axis for both, running down the left in a gutter, one column per resource. A booking
 * is a block whose height **is** its length, so a glance down a column shows how full it is,
 * and a 90-minute bay session looks three times the size of a 30-minute one. The grid is 30
 * minutes on both sheets, so nothing can land between two lines.
 *
 * Colour follows the tee sheet exactly — white with a green edge while it is owed, solid green
 * once paid — so a court booking and a tee time say the same thing in the same way.
 *
 * **Tapping an empty stretch books it**, at the start of the half-hour you touched, for the
 * sheet's default length or whatever fits before the next booking. The new booking opens in its
 * panel as a draft; closing the panel without confirming removes it, so a stray tap leaves no
 * trace. Where the minimum length does not fit, the tap does nothing — a sheet that offers a
 * booking it then refuses is worse than one that says nothing.
 */

/**
 * Pixels per minute. 1.6 makes the 30-minute grid 48px, the smallest target this app allows,
 * so the shortest possible booking is still tappable.
 */
export const PPM = 1.6;
const GUTTER = 64;
const HEADER = 52;

export function ResourceSheetView({ kind }: { kind: ResourceKind }) {
  const { state, dispatch } = usePos();
  const cfg = SHEETS[kind];
  const resources = resourcesOf(kind);
  const date = toDateStr(state.currentDate);

  // A day is filled the first time either sheet visits it, and then left alone — see
  // `seedResourceDay` in the store.
  useEffect(() => {
    dispatch({ type: 'seedResourceDay', kind, date });
  }, [dispatch, kind, date]);

  const bookings = state.resourceBookings.filter((b) => b.kind === kind && b.date === date);
  const height = (cfg.closeMin - cfg.openMin) * PPM;
  const isToday = date === toDateStr(DEMO_TODAY());

  const hours: number[] = [];
  for (let m = cfg.openMin; m <= cfg.closeMin; m += 60) hours.push(m);
  const lines: number[] = [];
  for (let m = cfg.openMin; m < cfg.closeMin; m += cfg.stepMin) lines.push(m);

  const bookAt = (resourceId: string, offsetY: number) => {
    const start = snap(kind, cfg.openMin + offsetY / PPM);
    if (!canStartAt(kind, resourceId, date, start, state.resourceBookings)) return;
    const room = maxDurationAt(kind, resourceId, date, start, state.resourceBookings);
    const booking: ResourceBooking = {
      id: `${kind}-new-${date}-${resourceId}-${start}-${state.resourceBookings.length}`,
      kind,
      resourceId,
      date,
      startMin: start,
      durationMin: clampDuration(kind, cfg.defaultDurationMin, room),
      name: 'Walk-in',
      players: 1,
      checkedIn: false,
      paid: false,
      draft: true,
    };
    dispatch({ type: 'createResourceBooking', booking });
  };

  const booked = bookings.length;
  const paid = bookings.filter((b) => b.paid).length;

  return (
    <Stack sx={{ flex: 1, minWidth: 0, height: '100%' }} data-resource-sheet={kind}>
      <ResourceToolbar title={cfg.title} summary={`${booked} booked · ${paid} paid`} />

      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: md3.surfaceContainer, position: 'relative' }}>
        {/* Column headers, pinned while the day scrolls under them. */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 3,
            display: 'grid',
            gridTemplateColumns: `${GUTTER}px repeat(${resources.length}, minmax(140px, 1fr))`,
            height: HEADER,
            bgcolor: '#fff',
            borderBottom: `1px solid ${md3.outlineVariant}`,
          }}
        >
          <Box />
          {resources.map((r) => (
            <Box
              key={r.id}
              sx={{ px: 1.25, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: `1px solid ${md3.outlineVariant}` }}
            >
              <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: md3.onSurface, lineHeight: 1.2 }} noWrap>
                {r.name}
              </Typography>
              <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>${r.hourly}/hr</Typography>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `${GUTTER}px repeat(${resources.length}, minmax(140px, 1fr))`,
            position: 'relative',
            height,
          }}
        >
          {/* Time gutter */}
          <Box sx={{ position: 'relative', bgcolor: '#fff', borderRight: `1px solid ${md3.outlineVariant}` }}>
            {hours.map((m) => (
              <Typography
                key={m}
                sx={{
                  position: 'absolute',
                  top: (m - cfg.openMin) * PPM,
                  right: 8,
                  transform: m === cfg.openMin ? 'none' : 'translateY(-50%)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: md3.onSurfaceVariant,
                }}
              >
                {formatTimeLabel(m)}
              </Typography>
            ))}
          </Box>

          {resources.map((r) => (
            <Box
              key={r.id}
              data-resource-column={r.id}
              aria-label={`${r.name} — tap an empty time to book`}
              onClick={(e) => {
                // Only the column itself books; a tap on a booking block is that block's.
                if (e.target !== e.currentTarget) return;
                const rect = e.currentTarget.getBoundingClientRect();
                bookAt(r.id, e.clientY - rect.top);
              }}
              sx={{
                position: 'relative',
                borderLeft: `1px solid ${md3.outlineVariant}`,
                bgcolor: '#fafcfa',
                cursor: 'pointer',
                // The 30-minute grid, drawn rather than rendered as elements, so a day of six
                // columns is not a thousand boxes.
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${cfg.stepMin * PPM - 1}px, ${md3.outlineVariant}66 ${cfg.stepMin * PPM - 1}px, ${md3.outlineVariant}66 ${cfg.stepMin * PPM}px)`,
              }}
            >
              {bookings
                .filter((b) => b.resourceId === r.id)
                .map((b) => (
                  <BookingBlock key={b.id} booking={b} openMin={cfg.openMin} />
                ))}
            </Box>
          ))}

          {/* Hour rules across every column. */}
          {lines
            .filter((m) => (m - cfg.openMin) % 60 === 0 && m !== cfg.openMin)
            .map((m) => (
              <Box
                key={m}
                sx={{
                  position: 'absolute',
                  left: GUTTER,
                  right: 0,
                  top: (m - cfg.openMin) * PPM,
                  borderTop: `1px solid ${md3.outlineVariant}`,
                  pointerEvents: 'none',
                }}
              />
            ))}

          {/* Now, on the demo's own day — the same red line the tee sheet draws. */}
          {isToday && DEMO_NOW_MIN >= cfg.openMin && DEMO_NOW_MIN <= cfg.closeMin && (
            <Box
              data-now-line
              sx={{
                position: 'absolute',
                left: GUTTER - 4,
                right: 0,
                top: (DEMO_NOW_MIN - cfg.openMin) * PPM,
                borderTop: '2px solid #dc2626',
                pointerEvents: 'none',
                zIndex: 2,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: -5,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#dc2626',
                },
              }}
            />
          )}
        </Box>
      </Box>
    </Stack>
  );
}

/**
 * One booking on the sheet. Its height is its length; below 60 minutes it drops the second
 * line, because a 48px block has room for a name and nothing else legible.
 */
function BookingBlock({ booking: b, openMin }: { booking: ResourceBooking; openMin: number }) {
  const { state, dispatch } = usePos();
  const open = state.resourcePanel?.bookingId === b.id;
  const tall = b.durationMin >= 60;
  // The tee sheet's palette: owed is white with a green edge, paid is solid green.
  const tone = b.paid
    ? { bg: md3.primary, border: md3.primary, name: '#fff', meta: 'rgba(255,255,255,.8)' }
    : { bg: '#fff', border: md3.primary, name: md3.onSurface, meta: md3.onSurfaceVariant };

  return (
    <ButtonBase
      data-resource-booking={b.id}
      aria-label={`${b.name}, ${formatTimeLabel(b.startMin)}, ${formatDuration(b.durationMin)}${b.paid ? ', paid' : ''}`}
      onClick={() => dispatch({ type: 'openResourceBooking', bookingId: b.id })}
      sx={{
        position: 'absolute',
        top: (b.startMin - openMin) * PPM + 2,
        left: 4,
        right: 4,
        height: b.durationMin * PPM - 4,
        borderRadius: `${radius.sm}px`,
        border: `1.5px solid ${tone.border}`,
        bgcolor: tone.bg,
        px: 1,
        py: 0.5,
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        textAlign: 'left',
        overflow: 'hidden',
        boxShadow: open ? `0 0 0 3px ${md3.primary}55` : 'none',
        zIndex: 1,
      }}
    >
      <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: tone.name, lineHeight: 1.25 }} noWrap>
        {b.name}
      </Typography>
      {tall && (
        <Typography sx={{ fontSize: 11, color: tone.meta, lineHeight: 1.3 }} noWrap>
          {formatTimeLabel(b.startMin)} · {formatDuration(b.durationMin)} · {b.players}
        </Typography>
      )}
      {tall && (b.checkedIn || b.paid) && (
        <Typography sx={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.04em', color: tone.meta, mt: 'auto' }}>
          {b.paid ? 'PAID' : 'CHECKED IN'}
        </Typography>
      )}
    </ButtonBase>
  );
}

/**
 * The tee sheet's date controls, reused — the same prev / date / next / Today, so moving
 * between the three sheets does not move the controls under the operator's hand.
 */
function ResourceToolbar({ title, summary }: { title: string; summary: string }) {
  const { state, dispatch } = usePos();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const dateLabel = state.currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.75}
      sx={{
        height: gridTokens.topbarH,
        bgcolor: '#fff',
        borderBottom: `1px solid ${md3.outlineVariant}`,
        px: 1.75,
        flexShrink: 0,
        position: 'relative',
        zIndex: 40,
      }}
    >
      <Typography sx={{ fontSize: 16, fontWeight: 800, color: md3.onSurface, mr: 0.5 }}>{title}</Typography>
      <Divider orientation="vertical" flexItem sx={{ my: 1.25, mx: 0.25 }} />
      <ToolbarButton icon="chevron_left" onClick={() => dispatch({ type: 'shiftDate', days: -1 })} title="Previous day" />
      <Box sx={{ position: 'relative' }}>
        <ButtonBase
          onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
          sx={{
            fontSize: 16,
            fontWeight: 700,
            px: 0.5,
            whiteSpace: 'nowrap',
            borderRadius: `${radius.sm}px`,
            '&:hover': { bgcolor: md3.surfaceContainer },
          }}
        >
          {dateLabel}
          <Icon name="expand_more" size={18} color={md3.outline} />
        </ButtonBase>
        {anchor && <DatePickerPopover onClose={() => setAnchor(null)} />}
      </Box>
      <ToolbarButton icon="chevron_right" onClick={() => dispatch({ type: 'shiftDate', days: 1 })} title="Next day" />
      <ToolbarButton label="Today" onClick={() => dispatch({ type: 'setDate', date: DEMO_TODAY() })} />
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: md3.onSurfaceVariant }} data-resource-summary>
        {summary}
      </Typography>
    </Stack>
  );
}
