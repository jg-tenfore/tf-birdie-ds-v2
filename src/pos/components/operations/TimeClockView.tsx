import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { demoNow } from '../../data/bookings';
import { toDateStr } from '../../data/courses';
import { staffById, type StaffMember } from '../../data/staff';
import type { Punch } from '../../data/staff-seed';
import { fmtHours, punchDays, punchHours, shortDate, weeklyTotals } from '../../logic/staff-hours';
import { onTheClock } from '../../state/operations';
import { usePos } from '../../state/PosProvider';
import { Icon } from '../primitives';
import { Stack } from '../Stack';
import { OpsScreen, OpsToolbar } from './OpsToolbar';
import { DataTable, PanelHeading, Td, ToolbarPrimary } from './OpsParts';

/**
 * Time Clock (V1 → V2, Wave 3) — who is working, and the hours they have worked.
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/time-clock.tsx`, from `references/072926/13-timeclock/`: two
 * 357px buttons, CLOCK IN and CLOCK OUT, 101px apart so the wrong one is hard to hit, and a log of
 * bare punches — `07/29/2026 8:51 AM  Clock In` — newest on top. Only one button was ever live.
 *
 * ## What was wrong with it
 *
 * It clocked **one person** — whoever was signed in — and said nothing about anybody else. A manager
 * opening the shop could not see who was on, could not clock out a server who had left without
 * doing it, and could not see hours at all: the log was punches, never pairs, so a week's hours
 * were added up by hand from a list of timestamps.
 *
 * ## What this does
 *
 * - **Everyone, on one list**: who is on the clock and since when, with hours so far. Each row has
 *   its own Clock in / Clock out, so a manager can fix a forgotten punch; the signed-in person's row
 *   says "You", and their own punch is also the toolbar's one button. v1's lesson kept: one live
 *   action per person, never both.
 * - **Punches in pairs**: in, out, hours, for today and every day before it. A punch still open
 *   counts up to now.
 * - **Weekly totals per person**, Monday to Sunday — the number payroll actually wants.
 * - The store refuses a second clock-in or an out with nothing open, so double taps are harmless.
 */
export function TimeClockView() {
  const { state, dispatch, toast } = usePos();
  const now = demoNow();
  const nowTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const today = toDateStr(now);
  const me = staffById(state.operatorId, state.staffRoster);
  // Settings' roster (V1 → V2): someone added there can clock in; someone deactivated is off the list.
  const people = state.staffRoster.filter((s) => s.active);
  const onNow = people.filter((s) => onTheClock(state, s.id));
  const days = punchDays(state.punches, nowTime, today);
  const todayLog = days.find((d) => d.date === today);
  const earlier = days.filter((d) => d.date !== today);
  const weeks = weeklyTotals(state.punches, nowTime, today);

  const punch = (s: StaffMember) => {
    const open = onTheClock(state, s.id);
    if (open) {
      dispatch({ type: 'clockOut', staffId: s.id });
      toast(`${s.name} clocked out at ${nowTime} · ${fmtHours(punchHours({ ...open, out: nowTime }, nowTime, today))}`);
    } else {
      dispatch({ type: 'clockIn', staffId: s.id });
      toast(`${s.name} clocked in at ${nowTime}`);
    }
  };
  const meOn = me && onTheClock(state, me.id);

  return (
    <OpsScreen data-time-clock>
      <OpsToolbar
        title="Time Clock"
        actions={
          me && (
            <ToolbarPrimary
              icon={meOn ? 'logout' : 'login'}
              label={meOn ? `Clock out ${me.short}` : `Clock in ${me.short}`}
              destructive={Boolean(meOn)}
              onClick={() => punch(me)}
            />
          )
        }
      >
        <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant, whiteSpace: 'nowrap' }} data-on-clock-count={onNow.length}>
          <b>{onNow.length}</b> on the clock · {shortDate(today)}, {nowTime}
        </Typography>
      </OpsToolbar>

      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '400px 1fr' }}>
        {/* ── Everyone ── */}
        <Box sx={{ overflowY: 'auto', p: '14px 16px', bgcolor: '#fff', borderRight: `1px solid ${md3.outlineVariant}` }}>
          <PanelHeading aside="Tap to punch anyone in or out">Staff</PanelHeading>
          {people.map((s) => (
            <StaffRow key={s.id} s={s} you={s.id === me?.id} open={onTheClock(state, s.id)} punches={state.punches} today={today} nowTime={nowTime} onPunch={() => punch(s)} />
          ))}
        </Box>

        {/* ── The log ── */}
        <Box sx={{ overflowY: 'auto', p: '14px 18px 24px', minWidth: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 3, alignItems: 'start' }}>
            <Box sx={{ minWidth: 0 }}>
              <PanelHeading aside={todayLog ? `${fmtHours(todayLog.hours)} so far` : undefined}>Today · {shortDate(today)}</PanelHeading>
              {todayLog ? <PunchTable punches={todayLog.punches} today={today} nowTime={nowTime} /> : <Quiet>Nobody has clocked in today.</Quiet>}

              {earlier.map((d) => (
                <Box key={d.date} sx={{ mt: 3 }} data-punch-day={d.date}>
                  <PanelHeading aside={fmtHours(d.hours)}>{shortDate(d.date)}</PanelHeading>
                  <PunchTable punches={d.punches} today={today} nowTime={nowTime} />
                </Box>
              ))}
            </Box>

            <Box sx={{ position: 'sticky', top: 0 }}>
              {weeks.map((w, i) => (
                <Box key={w.weekStart} data-week={w.weekStart} sx={{ mb: 2.5, p: '12px 14px', bgcolor: '#fff', borderRadius: `${radius.md}px`, border: `1px solid ${md3.outlineVariant}` }}>
                  <PanelHeading aside={fmtHours(w.hours)}>
                    {i === 0 ? 'This week' : 'Week'} · {shortDate(w.weekStart).replace(/^\w+, /, '')}–{shortDate(w.weekEnd).replace(/^\w+, /, '')}
                  </PanelHeading>
                  {w.rows.map((r) => (
                    <Stack key={r.staffId} direction="row" alignItems="baseline" data-week-row={r.staffId} sx={{ py: 0.75, borderTop: `1px solid ${md3.surfaceHigh}` }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{staffById(r.staffId, state.staffRoster)?.name ?? r.staffId}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mr: 1.5 }}>
                        {r.days} day{r.days === 1 ? '' : 's'}
                      </Typography>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums', minWidth: 56, textAlign: 'right' }}>{fmtHours(r.hours)}</Typography>
                    </Stack>
                  ))}
                  {i === 0 && (
                    <Typography sx={{ fontSize: 11, color: md3.outline, mt: 0.75 }}>Includes hours so far on punches still open.</Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </OpsScreen>
  );
}

function StaffRow({
  s,
  you,
  open,
  punches,
  today,
  nowTime,
  onPunch,
}: {
  s: StaffMember;
  you: boolean;
  open: Punch | undefined;
  punches: Punch[];
  today: string;
  nowTime: string;
  onPunch: () => void;
}) {
  const lastOut = punches.filter((p) => p.staffId === s.id && p.date === today && p.out).at(-1);
  const status = open
    ? `On since ${open.in} · ${fmtHours(punchHours(open, nowTime, today))}`
    : lastOut
      ? `Out at ${lastOut.out}`
      : 'Not in today';
  const initials = s.name
    .split(' ')
    .map((w) => w[0])
    .join('');
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1.25}
      data-clock-row={s.id}
      data-on-clock={open ? 'true' : 'false'}
      sx={{
        minHeight: 64,
        px: 1.25,
        mb: 0.75,
        borderRadius: `${radius.md}px`,
        border: `1.5px solid ${you ? md3.primary : md3.outlineVariant}`,
        bgcolor: you ? '#f3fbf6' : '#fff',
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
          fontWeight: 800,
          bgcolor: open ? md3.primaryContainer : md3.surfaceContainer,
          color: open ? md3.onPrimaryContainer : md3.onSurfaceVariant,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {initials}
        {open && <Box sx={{ position: 'absolute', right: 0, bottom: 0, width: 11, height: 11, borderRadius: '50%', bgcolor: md3.primary, border: '2px solid #fff' }} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
          {s.name}
          {you && (
            <Box component="span" sx={{ ml: 0.75, fontSize: 10, fontWeight: 800, color: md3.primary, letterSpacing: '.05em' }}>
              YOU
            </Box>
          )}
        </Typography>
        <Typography sx={{ fontSize: 12, color: open ? md3.onSurface : md3.onSurfaceVariant }} data-clock-status>
          {status}
        </Typography>
      </Box>
      <ButtonBase
        onClick={onPunch}
        aria-label={open ? `Clock out ${s.name}` : `Clock in ${s.name}`}
        sx={{
          height: 40,
          minWidth: 104,
          px: 1.5,
          gap: 0.5,
          borderRadius: `${radius.xl}px`,
          border: `1.5px solid ${open ? md3.error : md3.primary}`,
          color: open ? md3.error : md3.primary,
          fontSize: 12.5,
          fontWeight: 700,
          flexShrink: 0,
          '&:hover': { bgcolor: open ? '#fff0ee' : '#f0fdf4' },
        }}
      >
        <Icon name={open ? 'logout' : 'login'} size={16} />
        {open ? 'Clock out' : 'Clock in'}
      </ButtonBase>
    </Stack>
  );
}

function PunchTable({ punches, today, nowTime }: { punches: Punch[]; today: string; nowTime: string }) {
  const { state } = usePos();
  return (
    <DataTable columns={[{ label: 'Person' }, { label: 'In', width: 100 }, { label: 'Out', width: 120 }, { label: 'Hours', align: 'right', width: 80 }]}>
      {punches.map((p) => {
        const stale = !p.out && p.date !== today;
        return (
          <Box component="tr" key={p.id} data-punch={p.id}>
            <Td sx={{ fontWeight: 600 }}>{staffById(p.staffId, state.staffRoster)?.name ?? p.staffId}</Td>
            <Td>{p.in}</Td>
            <Td>
              {p.out ? (
                p.out
              ) : stale ? (
                <Box component="span" sx={{ color: md3.error, fontWeight: 700 }}>
                  Never clocked out
                </Box>
              ) : (
                <Box component="span" sx={{ color: md3.primary, fontWeight: 700 }}>
                  On the clock
                </Box>
              )}
            </Td>
            <Td align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {fmtHours(punchHours(p, nowTime, today))}
            </Td>
          </Box>
        );
      })}
    </DataTable>
  );
}

function Quiet({ children }: { children: string }) {
  return <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant, py: 2 }}>{children}</Typography>;
}
