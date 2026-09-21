import { useState } from 'react';
import { Box, TextField } from '@mui/material';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import { formatTimeLabel, toDateStr } from '../../../data/courses';
import { conflictsIn, timeRange } from '../../../logic/bookings';
import { usePos } from '../../../state/PosProvider';
import type { Booking } from '../../../types';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { CourseChips, FormSection, Notice, TimeRangeFields } from './parts';
import { shortDate } from './people-utils';

/**
 * Block time — make one or more rows non-bookable.
 *
 * A full-screen dialog over whatever opened it (the tee sheet's row sheet, or More): ✕
 * abandons, Save applies and closes back to the same place. Opened from a course column
 * it starts with only that course selected.
 *
 * A block is a booking spanning the whole course, so blocking a row removes what was
 * booked there — the conflict notice says so before Save, as the terminal does.
 */
export function BlockTimeScreen({ route }: ScreenProps<'blockTime'>) {
  const nav = useMobileNav();
  const { state, dispatch, toast } = usePos();
  const visible = state.courses.filter((c) => c.visible);

  const [start, setStart] = useState(route.timeMin);
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [end, setEnd] = useState(route.timeMin);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [courseIds, setCourseIds] = useState<string[]>(
    route.courseId ? [route.courseId] : visible.map((c) => c.id),
  );

  const dateStr = toDateStr(state.currentDate);
  const targets = timeRange(start, mode === 'range' ? Math.max(end, start) : start);
  const conflicts = conflictsIn(state.bookings, dateStr, courseIds, targets).filter((b) => b.pay !== 'block');

  const save = () => {
    const name = label.trim() || 'Blocked';
    const clear = conflictsIn(state.bookings, dateStr, courseIds, targets).map((b) => b.id);
    if (clear.length) dispatch({ type: 'deleteBookings', bookingIds: clear });
    const stamp = Date.now();
    const blocks: Booking[] = targets.flatMap((t) =>
      courseIds.map((cid) => ({
        id: `block-${cid}-${t}-${stamp}`,
        date: dateStr,
        course: cid,
        slot: 0,
        timeMin: t,
        name,
        players: state.courses.find((c) => c.id === cid)?.slots ?? 4,
        cart: 'walking' as const,
        status: 'block' as const,
        phone: '',
        conf: `BLK-${t}`,
        pay: 'block' as const,
        price: 0,
        holes: '',
        note: note.trim() || undefined,
        playerStates: [],
      })),
    );
    dispatch({ type: 'addBookings', bookings: blocks });
    nav.pop();
    toast(
      `${name} · ${targets.length} time${targets.length === 1 ? '' : 's'} blocked${clear.length ? ` · ${clear.length} cleared` : ''}`,
    );
  };

  return (
    <MobileScreen
      topBar={<DialogTopBar title="Block time" onConfirm={save} confirmDisabled={!courseIds.length} />}
    >
      <Notice tone="info" title={shortDate(state.currentDate)}>
        Blocked rows show as closed on the tee sheet and can't be booked.
      </Notice>

      <FormSection title="Label" hint="Shows on the tee sheet in place of a golfer name">
        <TextField label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Course maintenance" slotProps={{ inputLabel: { shrink: true } }} />
      </FormSection>

      <FormSection title="When">
        <TimeRangeFields
          startMin={start}
          onStartChange={setStart}
          mode={mode}
          onModeChange={setMode}
          endMin={end}
          onEndChange={setEnd}
        />
      </FormSection>

      <FormSection title="Courses">
        <CourseChips courses={visible} selected={courseIds} onChange={setCourseIds} />
      </FormSection>

      <FormSection title="Note">
        <TextField
          multiline
          sx={{ '& .MuiOutlinedInput-root': { p: 0 } }}
          minRows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Greens maintenance — slot unavailable"
          slotProps={{ htmlInput: { 'aria-label': 'Note' } }}
        />
      </FormSection>

      {conflicts.length > 0 && (
        <Notice
          tone="danger"
          icon={<WarningAmberOutlined />}
          title={`${conflicts.length} booking${conflicts.length === 1 ? '' : 's'} will be removed`}
        >
          {conflicts
            .slice(0, 3)
            .map((b) => `${b.name} (${formatTimeLabel(b.timeMin)})`)
            .join(', ')}
          {conflicts.length > 3 ? `, +${conflicts.length - 3} more` : ''}
        </Notice>
      )}
      <Box sx={{ height: 32 }} />
    </MobileScreen>
  );
}
