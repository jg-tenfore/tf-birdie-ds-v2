import { useMemo, useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import ArrowForward from '@mui/icons-material/ArrowForward';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { formatTimeLabel, toDateStr } from '../../../data/courses';
import { moneyShort } from '../../../logic/cart';
import { conflictsIn, formatDuration, plan18Hole, timeRange } from '../../../logic/bookings';
import { usePos } from '../../../state/PosProvider';
import type { Booking, GroupMeta } from '../../../types';
import { Stack } from '../../../components/Stack';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { CourseChips, FieldRow, FormSection, MoneyField, Notice, PickerField, SegmentedButton } from './parts';
import { shortDate, timeOptions } from './people-utils';

/**
 * Seat a league or outing — the longest form in the app, so it's a full-screen dialog
 * with sections rather than a wizard. Every choice is visible at once and the plan card
 * at the foot restates what Save will write, including what it will overwrite.
 *
 * Nine holes fills consecutive rows on one course. Eighteen sends groups off a front nine
 * and crosses them to a different nine after the crossover time (`plan18Hole`), so the
 * 18-hole option only enables when the club has two visible nines.
 */
export function LeagueScreen({ route }: ScreenProps<'league'>) {
  const nav = useMobileNav();
  const { state, dispatch, toast } = usePos();
  const visible = state.courses.filter((c) => c.visible);

  const [name, setName] = useState('');
  const [want, setWant] = useState('32');
  const [holes, setHoles] = useState<9 | 18>(9);
  const [start, setStart] = useState(route.timeMin);
  const [end, setEnd] = useState(route.timeMin + 56);
  const [course9, setCourse9] = useState(visible[0]?.id ?? '');
  const [front, setFront] = useState(visible[0]?.id ?? '');
  const [back, setBack] = useState(visible[1]?.id ?? '');
  const [duration, setDuration] = useState(90);
  const [greenFee, setGreenFee] = useState('42');
  const [priceCart, setPriceCart] = useState('20');
  const [pricePush, setPricePush] = useState('5');
  const [priceWalk, setPriceWalk] = useState('0');

  const dateStr = toDateStr(state.currentDate);
  const players = parseInt(want, 10) || 0;
  const courseName = (id: string) => state.courses.find((c) => c.id === id)?.name ?? id;

  const plan = useMemo(() => {
    if (holes === 9) {
      const cap = state.courses.find((c) => c.id === course9)?.slots ?? 4;
      const times = timeRange(start, Math.max(end, start));
      return { kind: '9' as const, times, cap, capacity: cap * times.length };
    }
    const cap = state.courses.find((c) => c.id === front)?.slots ?? 4;
    const groups = plan18Hole(players, cap, duration, start);
    return { kind: '18' as const, groups, capacity: groups.reduce((s, g) => s + g.span, 0) };
  }, [holes, course9, front, start, end, players, duration, state.courses]);

  const conflicts = useMemo(
    () =>
      plan.kind === '9'
        ? conflictsIn(state.bookings, dateStr, [course9], plan.times)
        : [
            ...conflictsIn(state.bookings, dateStr, [front], plan.groups.map((g) => g.frontStart)),
            ...conflictsIn(state.bookings, dateStr, [back], plan.groups.map((g) => g.backStart)),
          ],
    [plan, state.bookings, dateStr, course9, front, back],
  );

  const fits = players > 0 && plan.capacity >= players;
  const canSave = Boolean(name.trim()) && fits;

  const save = () => {
    const groupId = `grp-${Date.now()}`;
    const transportPrices = { cart: Number(priceCart) || 0, push: Number(pricePush) || 0, walking: Number(priceWalk) || 0 };
    const meta: GroupMeta = {
      groupId,
      name: name.trim(),
      holes,
      want: players,
      greenFee: Number(greenFee) || 0,
      transportPrices,
      startMin: start,
      dateStr,
      rangeEndMin: holes === 9 ? end : start,
      duration,
      course9: holes === 9 ? course9 : null,
      frontCourse: holes === 18 ? front : null,
      backCourse: holes === 18 ? back : null,
    };
    const mk = (courseId: string, t: number, span: number, label: string): Booking => ({
      id: `event-${groupId}-${courseId}-${t}`,
      date: dateStr,
      course: courseId,
      slot: 0,
      timeMin: t,
      name: meta.name,
      players: span,
      cart: 'cart',
      status: 'event',
      phone: '',
      conf: `EVT-${t}`,
      pay: 'event',
      price: meta.greenFee,
      holes: label,
      note: `${meta.name} — reserved`,
      groupId,
      groupMeta: meta,
      groupEvent: true,
      transportPrices,
      playerStates: [],
    });

    const created: Booking[] = [];
    if (plan.kind === '9') {
      let remaining = players;
      for (const t of plan.times) {
        if (remaining <= 0) break;
        const span = Math.min(plan.cap, remaining);
        created.push(mk(course9, t, span, '9H'));
        remaining -= span;
      }
    } else {
      plan.groups.forEach((g) => {
        created.push(mk(front, g.frontStart, g.span, '18H'), mk(back, g.backStart, g.span, '18H'));
      });
    }
    if (conflicts.length) dispatch({ type: 'deleteBookings', bookingIds: conflicts.map((b) => b.id) });
    dispatch({ type: 'addBookings', bookings: created });
    nav.pop();
    toast(`${meta.name} · ${holes} holes · ${players} players`);
  };

  const groupsCount = plan.kind === '9' ? Math.ceil(players / plan.cap) : plan.groups.length;

  return (
    <MobileScreen topBar={<DialogTopBar title="New league or outing" confirmLabel="Create" onConfirm={save} confirmDisabled={!canSave} />}>
      <FormSection title="Group" hint={shortDate(state.currentDate)}>
        <Stack gap={2}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Thursday Men's League" slotProps={{ inputLabel: { shrink: true } }} />
          <TextField
            label="Players wanted"
            value={want}
            onChange={(e) => setWant(e.target.value.replace(/\D/g, ''))}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            sx={{ maxWidth: 180 }}
          />
        </Stack>
      </FormSection>

      <FormSection title="Holes">
        <SegmentedButton
          ariaLabel="Holes"
          value={holes}
          onChange={setHoles}
          options={[
            { label: '9 holes', value: 9 },
            { label: '18 holes', value: 18, disabled: visible.length < 2 },
          ]}
        />
      </FormSection>

      {holes === 9 ? (
        <>
          <FormSection title="Course">
            <CourseChips single courses={visible} selected={[course9]} onChange={(ids) => setCourse9(ids[0])} />
          </FormSection>
          <FormSection title="Tee times" hint="Groups fill consecutive rows from the first tee time">
            <FieldRow>
              <PickerField
                label="First tee time"
                value={start}
                options={timeOptions()}
                onChange={(v) => {
                  setStart(v);
                  if (end < v) setEnd(v);
                }}
              />
              <PickerField label="Last tee time" value={Math.max(end, start)} options={timeOptions(start)} onChange={setEnd} />
            </FieldRow>
          </FormSection>
        </>
      ) : (
        <>
          <FormSection title="Courses" hint="Groups cross from the front nine to the back">
            <FieldRow>
              <PickerField
                label="Front nine"
                value={front}
                options={visible.map((c) => ({ label: c.name, value: c.id }))}
                onChange={(v) => {
                  setFront(v);
                  if (v === back) setBack(visible.find((c) => c.id !== v)?.id ?? '');
                }}
              />
              <PickerField
                label="Back nine"
                value={back}
                options={visible.filter((c) => c.id !== front).map((c) => ({ label: c.name, value: c.id }))}
                onChange={setBack}
              />
            </FieldRow>
          </FormSection>
          <FormSection title="Start">
            <PickerField label="First tee time" value={start} options={timeOptions()} onChange={setStart} />
          </FormSection>
          <FormSection title="Crossover" hint="How long a group takes to play the first nine">
            <SegmentedButton
              ariaLabel="Crossover"
              value={duration}
              onChange={setDuration}
              options={[75, 90, 105, 120].map((d) => ({ label: formatDuration(d), value: d }))}
            />
          </FormSection>
        </>
      )}

      <FormSection title="Pricing" hint="Per player">
        <Stack gap={2}>
          <FieldRow>
            <MoneyField label="Green fee" value={greenFee} onChange={setGreenFee} />
            <MoneyField label="Riding cart" value={priceCart} onChange={setPriceCart} />
          </FieldRow>
          <FieldRow>
            <MoneyField label="Push cart" value={pricePush} onChange={setPricePush} />
            <MoneyField label="Walking" value={priceWalk} onChange={setPriceWalk} />
          </FieldRow>
        </Stack>
      </FormSection>

      {/* Plan summary */}
      <FormSection title="Plan">
        <Box
          sx={{
            p: 2,
            borderRadius: `${radius.md}px`,
            bgcolor: mobile.surfaceContainerLow,
            border: `1px solid ${fits ? md3.outlineVariant : md3.error}`,
          }}
        >
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
            <GroupsOutlined sx={{ color: md3.primary }} />
            <Typography variant="subtitle1" noWrap sx={{ flex: 1, minWidth: 0 }}>
              {name.trim() || 'Unnamed group'}
            </Typography>
            <Typography variant="subtitle2" sx={{ color: fits ? md3.primary : md3.error, flexShrink: 0 }}>
              {players} / {plan.capacity}
            </Typography>
          </Stack>
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
            <Fact label={`${holes} holes`} />
            <Fact label={`${groupsCount} group${groupsCount === 1 ? '' : 's'}`} />
            <Fact label={`${moneyShort(Number(greenFee) || 0)} green fee`} />
          </Stack>
          {plan.kind === '9' ? (
            <Typography variant="body2">
              {courseName(course9)} · {formatTimeLabel(start)} – {formatTimeLabel(Math.max(end, start))} · {plan.times.length} tee time
              {plan.times.length === 1 ? '' : 's'} × {plan.cap}
            </Typography>
          ) : plan.groups.length ? (
            <Stack gap={0.5}>
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography variant="body2" sx={{ minWidth: 0 }}>
                  {courseName(front)} {formatTimeLabel(plan.groups[0].frontStart)} – {formatTimeLabel(plan.groups[plan.groups.length - 1].frontStart)}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" gap={1}>
                <ArrowForward sx={{ fontSize: 16, color: md3.onSurfaceVariant }} />
                <Typography variant="body2" sx={{ minWidth: 0 }}>
                  {courseName(back)} {formatTimeLabel(plan.groups[0].backStart)} – {formatTimeLabel(plan.groups[plan.groups.length - 1].backStart)}
                </Typography>
              </Stack>
            </Stack>
          ) : (
            <Typography variant="body2">Not enough rows left in the day from {formatTimeLabel(start)}.</Typography>
          )}
          {!fits && players > 0 && (
            <Typography variant="body2" sx={{ color: md3.error, mt: 1 }}>
              {plan.kind === '9' ? 'Extend the last tee time or reduce the player count.' : 'Start earlier or reduce the player count.'}
            </Typography>
          )}
        </Box>
      </FormSection>

      {conflicts.length > 0 && (
        <Notice tone="danger" icon={<WarningAmberOutlined />} title={`${conflicts.length} booking${conflicts.length === 1 ? '' : 's'} will be removed`}>
          {conflicts.slice(0, 3).map((b) => `${b.name} (${formatTimeLabel(b.timeMin)})`).join(', ')}
          {conflicts.length > 3 ? `, +${conflicts.length - 3} more` : ''}
        </Notice>
      )}
      <Box sx={{ height: 32 }} />
    </MobileScreen>
  );
}

function Fact({ label }: { label: string }) {
  return (
    <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: md3.surfaceHigh, fontSize: 12, fontWeight: 500 }}>
      {label}
    </Box>
  );
}
