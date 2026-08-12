import { useMemo, useState } from 'react';
import { Box, ButtonBase, Checkbox, Typography } from '@mui/material';
import { md3, noteColors, radius } from '../../theme/tokens';
import type { NoteColorKey } from '../../theme/tokens';
import { RATE_PRICING, TIMES, formatTimeLabel, toDateStr } from '../data/courses';
import {
  conflictsIn,
  formatDuration,
  plan18Hole,
  planMove,
  slotsFree,
  timeRange,
} from '../logic/bookings';
import { dayBookings, timeRowKey } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import type { Booking, GroupMeta } from '../types';
import { Icon, PayBadge, SectionLabel } from '../components/primitives';
import {
  Callout,
  Field,
  FilledButton,
  ModalFrame,
  ModalSection,
  OutlineButton,
  PillGroup,
  SelectField,
} from './ModalFrame';
import { Stack } from '../components/Stack';

/**
 * Time-row operations — everything reachable from the tee sheet's time gutter, plus
 * the two per-course configuration dialogs.
 *
 * These all share a shape: pick a target (one row, or a span of rows), pick which
 * courses it applies to, see what it would overwrite, then apply. The conflict preview
 * is the important part — every one of these operations can silently destroy real
 * bookings, so each shows the damage before it's done.
 */

/** Row-span selector shared by the block, price, and league dialogs. */
function RangeSelector({
  startMin,
  mode,
  endMin,
  onModeChange,
  onEndChange,
}: {
  startMin: number;
  mode: 'single' | 'range';
  endMin: number;
  onModeChange: (m: 'single' | 'range') => void;
  onEndChange: (v: number) => void;
}) {
  const options = TIMES.filter((t) => t.totalMin >= startMin).map((t) => ({
    label: t.label,
    value: t.totalMin,
  }));
  const count = timeRange(startMin, mode === 'range' ? endMin : startMin).length;

  return (
    <>
      <PillGroup
        value={mode}
        options={[
          { label: 'This time only', value: 'single' as const },
          { label: 'A range of times', value: 'range' as const },
        ]}
        onChange={onModeChange}
      />
      {mode === 'range' && (
        <Stack direction="row" alignItems="flex-end" gap={1.5} sx={{ mt: 1.25 }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant, mb: 0.5 }}>
              From
            </Typography>
            <Box
              sx={{
                px: 1.25,
                py: 1.125,
                border: `1.5px solid ${md3.outlineVariant}`,
                borderRadius: `${radius.md}px`,
                bgcolor: md3.surfaceContainer,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {formatTimeLabel(startMin)}
            </Box>
          </Box>
          <SelectField label="Through" value={endMin} options={options} onChange={onEndChange} />
          <Box
            sx={{
              px: 1.5,
              py: 1.125,
              borderRadius: `${radius.xl}px`,
              bgcolor: md3.primaryContainer,
              color: md3.primary,
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            {count} slot{count === 1 ? '' : 's'}
          </Box>
        </Stack>
      )}
    </>
  );
}

// ─── Block time ─────────────────────────────────────────────────────────────

/**
 * Make a slot non-bookable — maintenance, a ranger hold, a shift change.
 *
 * A block is stored as a booking with `pay: 'block'` spanning the course's full slot
 * width, which is why blocking a row removes whatever was booked in it. The conflict
 * count makes that consequence explicit before applying.
 */
export function BlockTime({ timeMin, editing }: { timeMin: number; editing?: boolean }) {
  const { state, dispatch, toast } = usePos();
  const [name, setName] = useState(editing ? 'Course Maintenance' : '');
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [endMin, setEndMin] = useState(timeMin);
  const [courseIds, setCourseIds] = useState<string[]>(state.courses.filter((c) => c.visible).map((c) => c.id));
  const [note, setNote] = useState('');

  const dateStr = toDateStr(state.currentDate);
  const targets = timeRange(timeMin, mode === 'range' ? endMin : timeMin);
  const conflicts = conflictsIn(state.bookings, dateStr, courseIds, targets).filter(
    (b) => b.pay !== 'block',
  );

  const apply = () => {
    if (!courseIds.length) return toast('Pick at least one course');
    const label = name.trim() || 'Blocked';

    // Clear whatever occupies the target cells, then lay the blocks down.
    const toRemove = conflictsIn(state.bookings, dateStr, courseIds, targets).map((b) => b.id);
    if (toRemove.length) dispatch({ type: 'deleteBookings', bookingIds: toRemove });

    const blocks: Booking[] = [];
    targets.forEach((t) => {
      courseIds.forEach((cid) => {
        const course = state.courses.find((c) => c.id === cid);
        blocks.push({
          id: `block-${cid}-${t}-${Date.now()}`,
          date: dateStr,
          course: cid,
          slot: 0,
          timeMin: t,
          name: label,
          // Spans the full course width so the row reads as closed.
          players: course?.slots ?? 4,
          cart: 'walking',
          status: 'block',
          phone: '',
          conf: `BLK-${t}`,
          pay: 'block',
          price: 0,
          holes: '',
          note: note.trim() || undefined,
          playerStates: [],
        });
      });
    });

    dispatch({ type: 'addBookings', bookings: blocks });
    dispatch({ type: 'closeModal' });
    toast(
      `${label} · ${targets.length} slot${targets.length === 1 ? '' : 's'} blocked${toRemove.length ? ` · ${toRemove.length} booking${toRemove.length === 1 ? '' : 's'} cleared` : ''}`,
    );
  };

  const removeBlocks = () => {
    const ids = state.bookings
      .filter((b) => b.date === dateStr && b.pay === 'block' && targets.includes(b.timeMin))
      .map((b) => b.id);
    if (!ids.length) return toast('No blocks at this time');
    dispatch({ type: 'deleteBookings', bookingIds: ids });
    dispatch({ type: 'closeModal' });
    toast(`${ids.length} block${ids.length === 1 ? '' : 's'} removed`);
  };

  return (
    <ModalFrame
      width={520}
      title={editing ? 'Edit block' : 'Block this time'}
      subtitle={`${formatTimeLabel(timeMin)} · ${state.currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
      icon="block"
      iconColor="#475569"
      actions={
        <>
          {editing && (
            <OutlineButton destructive onClick={removeBlocks}>
              Remove block
            </OutlineButton>
          )}
          <Box sx={{ flex: 1 }} />
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton onClick={apply}>{editing ? 'Save block' : 'Block time'}</FilledButton>
        </>
      }
    >
      <ModalSection title="Label">
        <Field
          autoFocus
          value={name}
          onChange={setName}
          placeholder="Course Maintenance"
          hint="Shows on the chip in place of a golfer name"
        />
      </ModalSection>

      <ModalSection title="When">
        <RangeSelector
          startMin={timeMin}
          mode={mode}
          endMin={endMin}
          onModeChange={setMode}
          onEndChange={setEndMin}
        />
      </ModalSection>

      <ModalSection title="Courses">
        <Stack gap={0.5}>
          {state.courses
            .filter((c) => c.visible)
            .map((c) => (
              <Stack key={c.id} direction="row" alignItems="center" gap={0.5}>
                <Checkbox
                  checked={courseIds.includes(c.id)}
                  onChange={(e) =>
                    setCourseIds(
                      e.target.checked ? [...courseIds, c.id] : courseIds.filter((x) => x !== c.id),
                    )
                  }
                />
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{c.name}</Typography>
                <Typography sx={{ fontSize: 11, color: md3.outline }}>{c.holes}</Typography>
              </Stack>
            ))}
        </Stack>
      </ModalSection>

      <ModalSection title="Note">
        <Field value={note} onChange={setNote} placeholder="Greens maintenance — slot unavailable" />
      </ModalSection>

      {conflicts.length > 0 && (
        <Callout tone="danger">
          {conflicts.length} existing booking{conflicts.length === 1 ? '' : 's'} fall inside this block
          and will be removed: {conflicts.slice(0, 3).map((b) => b.name).join(', ')}
          {conflicts.length > 3 ? `, +${conflicts.length - 3} more` : ''}.
        </Callout>
      )}
    </ModalFrame>
  );
}

// ─── Time note ──────────────────────────────────────────────────────────────

/** Annotate a time row — frost delay, lightning hold, shotgun start. */
export function TimeNote({ timeMin }: { timeMin: number }) {
  const { state, dispatch, toast } = usePos();
  const key = timeRowKey(state.currentDate, timeMin);
  const existing = state.timeNotes[key];

  const [text, setText] = useState(existing?.text ?? '');
  const [color, setColor] = useState<NoteColorKey>(existing?.color ?? 'yellow');

  return (
    <ModalFrame
      width={460}
      title={existing ? 'Edit note' : 'Add note'}
      subtitle={`${formatTimeLabel(timeMin)} · ${state.currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
      icon="sticky_note_2"
      iconColor="#f59e0b"
      actions={
        <>
          {existing && (
            <OutlineButton
              destructive
              onClick={() => {
                dispatch({ type: 'setTimeNote', key, note: null });
                dispatch({ type: 'closeModal' });
                toast('Note removed');
              }}
            >
              Remove
            </OutlineButton>
          )}
          <Box sx={{ flex: 1 }} />
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton
            disabled={!text.trim()}
            onClick={() => {
              dispatch({ type: 'setTimeNote', key, note: { text: text.trim(), color } });
              dispatch({ type: 'closeModal' });
              toast('Note saved');
            }}
          >
            Save note
          </FilledButton>
        </>
      }
    >
      <ModalSection title="Note">
        <Field
          autoFocus
          multiline
          value={text}
          onChange={setText}
          placeholder="Lightning hold — resume when cleared"
        />
      </ModalSection>
      <ModalSection title="Colour">
        <Stack direction="row" gap={1}>
          {(Object.keys(noteColors) as NoteColorKey[]).map((k) => (
            <ButtonBase
              key={k}
              onClick={() => setColor(k)}
              sx={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                bgcolor: noteColors[k].bg,
                border: `2.5px solid ${color === k ? noteColors[k].dot : 'transparent'}`,
              }}
            >
              <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: noteColors[k].dot }} />
            </ButtonBase>
          ))}
        </Stack>
      </ModalSection>
      <Box
        sx={{
          p: '10px 12px',
          bgcolor: noteColors[color].bg,
          border: `1px solid ${noteColors[color].border}`,
          borderRadius: `${radius.md}px`,
          fontSize: 12,
          color: noteColors[color].text,
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Icon name="sticky_note_2" size={13} color={noteColors[color].dot} />
          <Box component="span" sx={{ fontWeight: 800 }}>
            {formatTimeLabel(timeMin).replace(/\s+/g, '')}
          </Box>
          {text.trim() || 'Preview'}
        </Stack>
      </Box>
    </ModalFrame>
  );
}

// ─── Time price override ────────────────────────────────────────────────────

/**
 * Override pricing for a row or a span of rows.
 *
 * Four independent fields because this club prices a round and its transport
 * separately — leaving one blank means "keep the published rate for that component"
 * rather than "free", which is why they're nullable rather than defaulting to zero.
 */
export function TimePrice({ timeMin }: { timeMin: number }) {
  const { state, dispatch, toast } = usePos();
  const key = timeRowKey(state.currentDate, timeMin);
  const existing = state.timePrices[key];

  const [label, setLabel] = useState(existing?.label ?? '');
  const [fee, setFee] = useState(existing?.fee != null ? String(existing.fee) : '');
  const [walking, setWalking] = useState(existing?.walking != null ? String(existing.walking) : '');
  const [cartFee, setCartFee] = useState(existing?.cart != null ? String(existing.cart) : '');
  const [walkingCart, setWalkingCart] = useState(
    existing?.walkingCart != null ? String(existing.walkingCart) : '',
  );
  const [mode, setMode] = useState<'single' | 'range'>(
    existing?.rangeEnd && existing.rangeEnd !== timeMin ? 'range' : 'single',
  );
  const [endMin, setEndMin] = useState(existing?.rangeEnd ?? timeMin);

  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  const targets = timeRange(timeMin, mode === 'range' ? endMin : timeMin);

  // Overrides on this date, so the operator can see and undo what's already set.
  const others = useMemo(() => {
    const prefix = `${state.currentDate.getFullYear()}-${state.currentDate.getMonth() + 1}-${state.currentDate.getDate()}_`;
    return Object.entries(state.timePrices)
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => ({ key: k, startMin: Number(k.slice(prefix.length)), entry: v }))
      .sort((a, b) => a.startMin - b.startMin);
  }, [state.timePrices, state.currentDate]);

  const save = () => {
    const prices = {
      fee: num(fee),
      walking: num(walking),
      cart: num(cartFee),
      walkingCart: num(walkingCart),
    };
    if (Object.values(prices).every((v) => v == null)) return toast('Set at least one price');

    const rangeEnd = targets[targets.length - 1];
    targets.forEach((t) => {
      dispatch({
        type: 'setTimePrice',
        key: timeRowKey(state.currentDate, t),
        // Only the anchor row carries the range, so the banner renders once.
        price: t === timeMin ? { label: label.trim() || undefined, ...prices, rangeEnd } : { ...prices },
      });
    });
    dispatch({ type: 'closeModal' });
    toast(
      `Price override · ${formatTimeLabel(timeMin)}${rangeEnd !== timeMin ? `–${formatTimeLabel(rangeEnd)}` : ''}`,
    );
  };

  return (
    <ModalFrame
      width={520}
      title="Override price"
      subtitle={`${formatTimeLabel(timeMin)} · ${state.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
      icon="sell"
      iconColor="#16a34a"
      actions={
        <>
          {existing && (
            <OutlineButton
              destructive
              onClick={() => {
                targets.forEach((t) =>
                  dispatch({ type: 'setTimePrice', key: timeRowKey(state.currentDate, t), price: null }),
                );
                dispatch({ type: 'closeModal' });
                toast('Override removed');
              }}
            >
              Remove
            </OutlineButton>
          )}
          <Box sx={{ flex: 1 }} />
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton onClick={save}>Save override</FilledButton>
        </>
      }
    >
      <ModalSection title="Label" hint="Optional — appears on the banner">
        <Field value={label} onChange={setLabel} placeholder="Shoulder-season rate" autoFocus />
      </ModalSection>

      <ModalSection title="Prices" hint="Leave blank to keep the published rate">
        <Stack gap={1.25}>
          <Stack direction="row" gap={1.5}>
            <Field label="Green fee" prefix="$" value={fee} onChange={setFee} type="number" />
            <Field label="Walking" prefix="$" value={walking} onChange={setWalking} type="number" />
          </Stack>
          <Stack direction="row" gap={1.5}>
            <Field label="Riding cart" prefix="$" value={cartFee} onChange={setCartFee} type="number" />
            <Field
              label="Walking + cart"
              prefix="$"
              value={walkingCart}
              onChange={setWalkingCart}
              type="number"
            />
          </Stack>
        </Stack>
      </ModalSection>

      <ModalSection title="Applies to">
        <RangeSelector
          startMin={timeMin}
          mode={mode}
          endMin={endMin}
          onModeChange={setMode}
          onEndChange={setEndMin}
        />
      </ModalSection>

      {others.length > 0 && (
        <ModalSection title={`Overrides today · ${others.length}`}>
          <Stack gap={0.5}>
            {others.map((o) => (
              <Stack
                key={o.key}
                direction="row"
                alignItems="center"
                gap={1}
                sx={{
                  p: '8px 11px',
                  bgcolor: md3.surfaceContainer,
                  borderRadius: `${radius.md}px`,
                  fontSize: 11.5,
                }}
              >
                <Icon name="sell" size={13} color="#16a34a" />
                <Box component="span" sx={{ fontWeight: 800 }}>
                  {formatTimeLabel(o.startMin)}
                  {o.entry.rangeEnd && o.entry.rangeEnd !== o.startMin
                    ? `–${formatTimeLabel(o.entry.rangeEnd)}`
                    : ''}
                </Box>
                <Box component="span" sx={{ flex: 1, color: md3.onSurfaceVariant }}>
                  {o.entry.label ?? '—'}
                </Box>
                <ButtonBase
                  onClick={() => dispatch({ type: 'setTimePrice', key: o.key, price: null })}
                  sx={{ p: 0.375, borderRadius: '50%', color: md3.outline, '&:hover': { color: md3.error } }}
                >
                  <Icon name="close" size={14} />
                </ButtonBase>
              </Stack>
            ))}
          </Stack>
        </ModalSection>
      )}
    </ModalFrame>
  );
}

// ─── League / outing ────────────────────────────────────────────────────────

/**
 * Seat a league or outing.
 *
 * Nine holes fills consecutive rows on one course. Eighteen is the interesting case:
 * groups go out on a front nine and cross over to a *different* nine after a duration,
 * so an 18-hole league consumes staggered slots on two courses. `plan18Hole` computes
 * that shape and the summary shows it before anything is written.
 */
export function League({ timeMin, editGroupId }: { timeMin: number; editGroupId?: string }) {
  const { state, dispatch, toast } = usePos();
  const existing = editGroupId
    ? state.bookings.find((b) => b.groupId === editGroupId && b.groupMeta)?.groupMeta
    : undefined;

  const visible = state.courses.filter((c) => c.visible);
  const [name, setName] = useState(existing?.name ?? '');
  const [holes, setHoles] = useState<9 | 18>(existing?.holes ?? 9);
  const [want, setWant] = useState(String(existing?.want ?? 32));
  const [greenFee, setGreenFee] = useState(String(existing?.greenFee ?? 42));
  const [priceCart, setPriceCart] = useState(String(existing?.transportPrices?.cart ?? 20));
  const [pricePush, setPricePush] = useState(String(existing?.transportPrices?.push ?? 5));
  const [priceWalk, setPriceWalk] = useState(String(existing?.transportPrices?.walking ?? 0));
  const [course9, setCourse9] = useState(existing?.course9 ?? visible[0]?.id ?? '');
  const [frontCourse, setFrontCourse] = useState(existing?.frontCourse ?? visible[0]?.id ?? '');
  const [backCourse, setBackCourse] = useState(existing?.backCourse ?? visible[1]?.id ?? '');
  const [duration, setDuration] = useState(existing?.duration ?? 90);
  const [endMin, setEndMin] = useState(existing?.rangeEndMin ?? timeMin + 56);

  const dateStr = toDateStr(state.currentDate);
  const players = parseInt(want, 10) || 0;

  const plan = useMemo(() => {
    if (holes === 9) {
      const course = state.courses.find((c) => c.id === course9);
      const times = timeRange(timeMin, endMin);
      const capacity = (course?.slots ?? 4) * times.length;
      return { kind: '9' as const, times, capacity, cap: course?.slots ?? 4 };
    }
    const front = state.courses.find((c) => c.id === frontCourse);
    const groups = plan18Hole(players, front?.slots ?? 4, duration, timeMin);
    return { kind: '18' as const, groups, capacity: groups.reduce((s, g) => s + g.span, 0) };
  }, [holes, course9, timeMin, endMin, players, frontCourse, duration, state.courses]);

  const fits = plan.capacity >= players && players > 0;

  const apply = () => {
    if (!name.trim()) return toast('Name the league');
    if (!fits) return toast(`${players} players exceed capacity (${plan.capacity}). Extend the range.`);

    if (editGroupId) {
      const ids = state.bookings.filter((b) => b.groupId === editGroupId).map((b) => b.id);
      dispatch({ type: 'deleteBookings', bookingIds: ids });
    }

    const uid = Date.now();
    const groupId = editGroupId ?? `grp-${uid}`;
    const transportPrices = {
      cart: Number(priceCart) || 0,
      push: Number(pricePush) || 0,
      walking: Number(priceWalk) || 0,
    };
    const meta: GroupMeta = {
      groupId,
      name: name.trim(),
      holes,
      want: players,
      greenFee: Number(greenFee) || 0,
      transportPrices,
      startMin: timeMin,
      dateStr,
      rangeEndMin: holes === 9 ? endMin : timeMin,
      duration,
      course9: holes === 9 ? course9 : null,
      frontCourse: holes === 18 ? frontCourse : null,
      backCourse: holes === 18 ? backCourse : null,
    };

    const mk = (courseId: string, tMin: number, span: number, holesLabel: string): Booking => ({
      id: `event-${groupId}-${courseId}-${tMin}`,
      date: dateStr,
      course: courseId,
      slot: 0,
      timeMin: tMin,
      name: name.trim(),
      players: span,
      cart: 'cart',
      status: 'event',
      phone: '',
      conf: `EVT-${tMin}`,
      pay: 'event',
      price: Number(greenFee) || 0,
      holes: holesLabel,
      note: `${name.trim()} — reserved`,
      groupId,
      groupMeta: meta,
      groupEvent: true,
      transportPrices,
      playerStates: [],
    });

    const created: Booking[] = [];
    const clearIds: string[] = [];

    if (plan.kind === '9') {
      clearIds.push(...conflictsIn(state.bookings, dateStr, [course9], plan.times).map((b) => b.id));
      let remaining = players;
      for (const t of plan.times) {
        if (remaining <= 0) break;
        const span = Math.min(plan.cap, remaining);
        created.push(mk(course9, t, span, '9H'));
        remaining -= span;
      }
    } else {
      const frontTimes = plan.groups.map((g) => g.frontStart);
      const backTimes = plan.groups.map((g) => g.backStart);
      clearIds.push(
        ...conflictsIn(state.bookings, dateStr, [frontCourse], frontTimes).map((b) => b.id),
        ...conflictsIn(state.bookings, dateStr, [backCourse], backTimes).map((b) => b.id),
      );
      plan.groups.forEach((g) => {
        created.push(mk(frontCourse, g.frontStart, g.span, '18H'));
        created.push(mk(backCourse, g.backStart, g.span, '18H'));
      });
    }

    if (clearIds.length) dispatch({ type: 'deleteBookings', bookingIds: clearIds });
    dispatch({ type: 'addBookings', bookings: created });
    dispatch({ type: 'closeModal' });
    toast(
      `${name.trim()} · ${holes} holes · ${players} players${editGroupId ? ' (updated)' : ''}`,
    );
  };

  return (
    <ModalFrame
      width={560}
      tall
      title={editGroupId ? 'Edit league' : 'Create league / outing'}
      subtitle={`Starting ${formatTimeLabel(timeMin)} · ${state.currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
      icon="groups"
      iconColor="#7c3aed"
      actions={
        <>
          {editGroupId && (
            <OutlineButton
              destructive
              onClick={() => {
                const ids = state.bookings.filter((b) => b.groupId === editGroupId).map((b) => b.id);
                dispatch({ type: 'deleteBookings', bookingIds: ids });
                dispatch({ type: 'closeModal' });
                toast(`League removed · ${ids.length} slots freed`);
              }}
            >
              Delete league
            </OutlineButton>
          )}
          <Box sx={{ flex: 1 }} />
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton onClick={apply}>{editGroupId ? 'Save changes' : 'Create group'}</FilledButton>
        </>
      }
    >
      <ModalSection title="League">
        <Stack direction="row" gap={1.5}>
          <Field label="Name" value={name} onChange={setName} placeholder="Thursday Men's League" autoFocus />
          <Field label="Players" value={want} onChange={setWant} type="number" />
        </Stack>
      </ModalSection>

      <ModalSection title="Format">
        <PillGroup
          value={holes}
          options={[
            { label: '9 holes', value: 9 as const, color: '#7c3aed' },
            { label: '18 holes', value: 18 as const, color: '#7c3aed' },
          ]}
          onChange={setHoles}
        />
      </ModalSection>

      {holes === 9 ? (
        <>
          <ModalSection title="Course">
            <PillGroup
              value={course9}
              options={visible.map((c) => ({ label: c.name, value: c.id }))}
              onChange={setCourse9}
            />
          </ModalSection>
          <ModalSection title="Time range">
            <SelectField
              label="Through"
              value={endMin}
              options={TIMES.filter((t) => t.totalMin >= timeMin).map((t) => ({
                label: t.label,
                value: t.totalMin,
              }))}
              onChange={setEndMin}
            />
          </ModalSection>
        </>
      ) : (
        <>
          <ModalSection title="Courses" hint="Groups cross over from the front nine to the back">
            <Stack direction="row" gap={1.5}>
              <SelectField
                label="Front nine"
                value={frontCourse}
                options={visible.map((c) => ({ label: c.name, value: c.id }))}
                onChange={setFrontCourse}
              />
              <SelectField
                label="Back nine"
                value={backCourse}
                options={visible
                  .filter((c) => c.id !== frontCourse)
                  .map((c) => ({ label: c.name, value: c.id }))}
                onChange={setBackCourse}
              />
            </Stack>
          </ModalSection>
          <ModalSection title="Crossover" hint="How long a group takes to play its first nine">
            <PillGroup
              value={duration}
              options={[75, 90, 105, 120].map((d) => ({ label: formatDuration(d), value: d }))}
              onChange={setDuration}
            />
          </ModalSection>
        </>
      )}

      <ModalSection title="Pricing">
        <Stack gap={1.25}>
          <Stack direction="row" gap={1.5}>
            <Field label="Green fee" prefix="$" value={greenFee} onChange={setGreenFee} type="number" />
            <Field label="Riding cart" prefix="$" value={priceCart} onChange={setPriceCart} type="number" />
          </Stack>
          <Stack direction="row" gap={1.5}>
            <Field label="Push cart" prefix="$" value={pricePush} onChange={setPricePush} type="number" />
            <Field label="Walking" prefix="$" value={priceWalk} onChange={setPriceWalk} type="number" />
          </Stack>
        </Stack>
      </ModalSection>

      <Callout tone={fits ? 'info' : 'warning'}>
        {plan.kind === '9' ? (
          <>
            {players} players across {plan.times.length} tee time
            {plan.times.length === 1 ? '' : 's'} on{' '}
            {state.courses.find((c) => c.id === course9)?.name} — capacity {plan.capacity}.
            {!fits && ' Extend the range or reduce the player count.'}
          </>
        ) : (
          <>
            {plan.groups.length} group{plan.groups.length === 1 ? '' : 's'} · front nine{' '}
            {plan.groups.length
              ? `${formatTimeLabel(plan.groups[0].frontStart)}–${formatTimeLabel(plan.groups[plan.groups.length - 1].frontStart)}`
              : '—'}{' '}
            on {state.courses.find((c) => c.id === frontCourse)?.name}, crossing to{' '}
            {state.courses.find((c) => c.id === backCourse)?.name} at{' '}
            {plan.groups.length
              ? `${formatTimeLabel(plan.groups[0].backStart)}–${formatTimeLabel(plan.groups[plan.groups.length - 1].backStart)}`
              : '—'}
            . Capacity {plan.capacity}.
            {!fits && ' Not enough consecutive rows — start earlier or reduce the player count.'}
          </>
        )}
      </Callout>
    </ModalFrame>
  );
}

// ─── Move players ───────────────────────────────────────────────────────────

/**
 * Move bookings from one time row to another.
 *
 * When the destination is already partly occupied, `placement` decides whether the
 * movers take the slots before or after the existing party — which matters because
 * slot order is starting order.
 */
export function MovePlayers({ timeMin }: { timeMin: number }) {
  const { state, dispatch, toast } = usePos();
  const dateStr = toDateStr(state.currentDate);
  const source = dayBookings(state).filter(
    (b) => b.timeMin === timeMin && b.pay !== 'block' && b.pay !== 'event',
  );

  const [selected, setSelected] = useState<string[]>(source.map((b) => b.id));
  const [destCourse, setDestCourse] = useState(source[0]?.course ?? state.courses[0]?.id ?? '');
  const [destTime, setDestTime] = useState(timeMin);
  const [placement, setPlacement] = useState<'before' | 'after'>('after');

  const moving = state.bookings.filter((b) => selected.includes(b.id));
  const course = state.courses.find((c) => c.id === destCourse);
  const result = course ? planMove(state.bookings, moving, course, dateStr, destTime, placement) : null;
  const free = course ? slotsFree(state.bookings.filter((b) => !selected.includes(b.id)), course, destTime) : 0;

  const apply = () => {
    if (!moving.length) return toast('Select at least one tee time');
    if (!result) return toast(`Not enough room at ${formatTimeLabel(destTime)}`);

    let cursor = result.startSlot;
    moving.forEach((b) => {
      dispatch({
        type: 'patchBooking',
        bookingId: b.id,
        patch: { course: destCourse, timeMin: destTime, slot: cursor },
      });
      cursor += b.players;
    });
    dispatch({ type: 'closeModal' });
    toast(
      `${moving.length} tee time${moving.length === 1 ? '' : 's'} moved to ${formatTimeLabel(destTime)} · ${course?.name}`,
    );
  };

  return (
    <ModalFrame
      width={520}
      tall
      title="Move players"
      subtitle={`From ${formatTimeLabel(timeMin)} · ${state.currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
      icon="swap_horiz"
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton disabled={!moving.length || !result} onClick={apply}>
            Move {moving.length || ''}
          </FilledButton>
        </>
      }
    >
      <ModalSection title="Move which tee times">
        {source.length === 0 ? (
          <Callout tone="info">Nothing bookable sits at {formatTimeLabel(timeMin)}.</Callout>
        ) : (
          <Stack gap={0.5}>
            {source.map((b) => {
              const bCourse = state.courses.find((c) => c.id === b.course);
              return (
                <Stack
                  key={b.id}
                  direction="row"
                  alignItems="center"
                  gap={0.5}
                  sx={{ p: '6px 10px', bgcolor: md3.surfaceContainer, borderRadius: `${radius.md}px` }}
                >
                  <Checkbox
                    checked={selected.includes(b.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? [...selected, b.id] : selected.filter((x) => x !== b.id),
                      )
                    }
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{b.name}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: md3.onSurfaceVariant }}>
                      {bCourse?.name} · {b.players}P · slot {b.slot + 1}
                    </Typography>
                  </Box>
                  <PayBadge pay={b.pay} size="sm" />
                </Stack>
              );
            })}
          </Stack>
        )}
      </ModalSection>

      <ModalSection title="Destination">
        <Stack direction="row" gap={1.5}>
          <SelectField
            label="Course"
            value={destCourse}
            options={state.courses.filter((c) => c.visible).map((c) => ({ label: c.name, value: c.id }))}
            onChange={setDestCourse}
          />
          <SelectField
            label="Time"
            value={destTime}
            options={TIMES.map((t) => ({ label: t.label, value: t.totalMin }))}
            onChange={setDestTime}
          />
        </Stack>
      </ModalSection>

      {result && result.occupants.length > 0 && (
        <ModalSection title="Placement" hint="Slot order is starting order">
          <PillGroup
            value={placement}
            options={[
              { label: 'Before existing party', value: 'before' as const },
              { label: 'After existing party', value: 'after' as const },
            ]}
            onChange={setPlacement}
          />
        </ModalSection>
      )}

      {!result ? (
        <Callout tone="danger">
          {formatTimeLabel(destTime)} on {course?.name} has {free} free slot{free === 1 ? '' : 's'} —
          not enough for {moving.reduce((s, b) => s + b.players, 0)} player
          {moving.reduce((s, b) => s + b.players, 0) === 1 ? '' : 's'}.
        </Callout>
      ) : (
        <Callout tone="success">
          {moving.length} tee time{moving.length === 1 ? '' : 's'} ·{' '}
          {moving.reduce((s, b) => s + b.players, 0)} players →{' '}
          {formatTimeLabel(destTime)} on {course?.name}
          {result.occupants.length > 0
            ? `, ${placement} ${result.occupants.map((o) => o.name).join(', ')}`
            : ''}
          .
        </Callout>
      )}
    </ModalFrame>
  );
}

// ─── Course configuration ───────────────────────────────────────────────────

/**
 * A course's bookable window and interval.
 *
 * Pass 1 edits the primary track only. The dialog is built for up to three parallel
 * tracks per course — that's what `Course.tracks` is for — but the grid renders one.
 */
export function CourseTimeSettings({ courseId }: { courseId: string }) {
  const { state, dispatch, toast } = usePos();
  const course = state.courses.find((c) => c.id === courseId);
  const s = state.settings;

  const [startHour, setStartHour] = useState(s.gridStartHour);
  const [endHour, setEndHour] = useState(s.gridEndHour);
  const [interval, setInterval] = useState(s.intervalMins);
  const [slots, setSlots] = useState(course?.slots ?? 4);

  const rows = Math.floor(((endHour - startHour) * 60) / interval) + 1;

  return (
    <ModalFrame
      width={480}
      title="Time settings"
      subtitle={`${course?.name} · Track 1`}
      icon="schedule"
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton
            onClick={() => {
              if (endHour <= startHour) return toast('End time must be after the start time');
              dispatch({
                type: 'patchSettings',
                patch: { gridStartHour: startHour, gridEndHour: endHour, intervalMins: interval },
              });
              dispatch({ type: 'patchCourse', courseId, patch: { slots } });
              dispatch({ type: 'closeModal' });
              toast(`${course?.name} · ${interval} min intervals`);
            }}
          >
            Save settings
          </FilledButton>
        </>
      }
    >
      <ModalSection title="Bookable window">
        <Stack direction="row" gap={1.5}>
          <SelectField
            label="First tee time"
            value={startHour}
            options={[5, 6, 7, 8].map((h) => ({ label: formatTimeLabel(h * 60), value: h }))}
            onChange={setStartHour}
          />
          <SelectField
            label="Last tee time"
            value={endHour}
            options={[16, 17, 18, 19, 20].map((h) => ({ label: formatTimeLabel(h * 60), value: h }))}
            onChange={setEndHour}
          />
        </Stack>
      </ModalSection>

      <ModalSection title="Interval">
        <PillGroup
          value={interval}
          options={[7, 8, 10, 12, 15].map((m) => ({ label: `${m} min`, value: m }))}
          onChange={setInterval}
        />
      </ModalSection>

      <ModalSection title="Players per tee time">
        <PillGroup
          value={slots}
          options={[2, 3, 4, 5].map((n) => ({ label: `${n}`, value: n }))}
          onChange={setSlots}
        />
      </ModalSection>

      <Callout tone="info">
        {rows} tee times per day at {interval}-minute intervals, {slots} players each — up to{' '}
        {rows * slots} golfers on {course?.name}.
      </Callout>
      <Box sx={{ mt: 1.25 }}>
        <Callout tone="warning">
          Interval and window are shared across courses in this pass. Multi-track support gives each
          course its own schedule in a later update.
        </Callout>
      </Box>
    </ModalFrame>
  );
}

/** The published rate card, read-only, by time-of-day band. */
export function CourseRates({ courseId }: { courseId: string }) {
  const { state, dispatch } = usePos();
  const course = state.courses.find((c) => c.id === courseId);
  const dayName = state.currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const nowH = new Date().getHours();
  const [band, setBand] = useState<'early' | 'peak' | 'twilight'>(
    nowH < 10 ? 'early' : nowH < 14 ? 'peak' : 'twilight',
  );

  const rows = RATE_PRICING[band] ?? [];

  return (
    <ModalFrame
      width={560}
      tall
      title="Tee time prices"
      subtitle={`${course?.name} · ${dayName}`}
      icon="sell"
      iconColor="#16a34a"
      actions={<FilledButton onClick={() => dispatch({ type: 'closeModal' })}>Close</FilledButton>}
    >
      <PillGroup
        value={band}
        options={[
          { label: 'Early morning · 6–10am', value: 'early' as const, color: '#f59e0b' },
          { label: 'Peak · 10am–2pm', value: 'peak' as const, color: '#16a34a' },
          { label: 'Twilight · 2–6pm', value: 'twilight' as const, color: '#7c3aed' },
        ]}
        onChange={setBand}
      />

      <Box sx={{ mt: 2, border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, overflow: 'hidden' }}>
        <Stack
          direction="row"
          sx={{
            px: 1.75,
            py: 1,
            bgcolor: md3.surfaceContainer,
            borderBottom: `1px solid ${md3.outlineVariant}`,
          }}
        >
          <SectionLabel sx={{ flex: 1 }}>Rate</SectionLabel>
          <SectionLabel sx={{ width: 80, justifyContent: 'flex-end' }}>18 holes</SectionLabel>
          <SectionLabel sx={{ width: 80, justifyContent: 'flex-end' }}>9 holes</SectionLabel>
        </Stack>
        {rows.map((r) => (
          <Stack
            key={r.rate}
            direction="row"
            alignItems="center"
            sx={{
              px: 1.75,
              py: 1.125,
              borderBottom: `1px solid ${md3.surfaceContainer}`,
              '&:last-of-type': { borderBottom: 'none' },
              bgcolor: r.rack ? '#f0fdf4' : 'transparent',
            }}
          >
            <Stack direction="row" alignItems="center" gap={0.75} sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: r.rack ? 800 : 600 }}>{r.rate}</Typography>
              {r.discount === 100 && (
                <Box
                  component="span"
                  sx={{
                    fontSize: 9,
                    fontWeight: 800,
                    px: 0.75,
                    py: '1px',
                    borderRadius: '3px',
                    bgcolor: '#dcfce7',
                    color: '#16a34a',
                  }}
                >
                  INCLUDED
                </Box>
              )}
              {r.rack && (
                <Box
                  component="span"
                  sx={{
                    fontSize: 9,
                    fontWeight: 800,
                    px: 0.75,
                    py: '1px',
                    borderRadius: '3px',
                    bgcolor: '#e0e7ff',
                    color: '#4f46e5',
                  }}
                >
                  RACK
                </Box>
              )}
            </Stack>
            <Typography sx={{ width: 80, textAlign: 'right', fontSize: 12.5, fontWeight: 700 }}>
              ${r.p18.toFixed(2)}
            </Typography>
            <Typography sx={{ width: 80, textAlign: 'right', fontSize: 12.5, fontWeight: 700 }}>
              ${r.p9.toFixed(2)}
            </Typography>
          </Stack>
        ))}
      </Box>

      <Box sx={{ mt: 2 }}>
        <Callout tone="info">
          Published rates for {dayName}. Row-level overrides set from the tee sheet take precedence and
          appear as a green banner above the affected times.
        </Callout>
      </Box>
    </ModalFrame>
  );
}
