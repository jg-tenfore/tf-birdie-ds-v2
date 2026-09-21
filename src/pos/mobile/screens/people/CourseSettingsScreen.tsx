import type { ReactNode } from 'react';
import { Box, ListItemButton, ListItemText, ListSubheader, Switch, TextField, Typography } from '@mui/material';
import ChevronRight from '@mui/icons-material/ChevronRight';
import LockOutlined from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import { md3, mobile } from '../../../../theme/tokens';
import { formatTimeLabel } from '../../../data/courses';
import { usePos } from '../../../state/PosProvider';
import type { Course, TeeSheetSettings } from '../../../types';
import { Stack } from '../../../components/Stack';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { FormSection, Notice, PickerField, SegmentedButton } from './parts';

/**
 * Tee sheet & course settings — two levels of the same route.
 *
 * Without a `courseId` it's the overview: every course with its state, plus the
 * sheet-wide display switches. Tapping a course pushes the same route with that id —
 * one level deeper, back arrow returns to the overview. Settings pages apply as you
 * change them (the Android settings convention), so there is no Save and nothing to lose.
 */
export function CourseSettingsScreen({ route }: ScreenProps<'courseSettings'>) {
  return route.courseId ? <CourseDetail courseId={route.courseId} /> : <Overview />;
}

function Overview() {
  const nav = useMobileNav();
  const { state, dispatch } = usePos();
  const s = state.settings;
  const set = (patch: Partial<TeeSheetSettings>) => dispatch({ type: 'patchSettings', patch });

  return (
    <MobileScreen topBar={<TopAppBar title="Tee sheet & courses" />}>
      <ListSubheader disableSticky>Courses</ListSubheader>
      {state.courses.map((c) => (
        <ListItemButton key={c.id} onClick={() => nav.push({ name: 'courseSettings', courseId: c.id })} sx={{ minHeight: mobile.listItem.two }}>
          <ListItemText
            primary={c.name}
            secondary={`${c.holeCount} holes · ${c.slots} players per tee time${c.note ? ` · ${c.note}` : ''}`}
          />
          <Stack direction="row" gap={0.5} sx={{ color: md3.onSurfaceVariant, mr: 0.5 }}>
            {!c.visible && <VisibilityOffOutlined aria-label="Hidden" sx={{ fontSize: 20 }} />}
            {c.locked && <LockOutlined aria-label="Locked" sx={{ fontSize: 20 }} />}
          </Stack>
          <ChevronRight sx={{ color: md3.onSurfaceVariant }} />
        </ListItemButton>
      ))}

      <ListSubheader disableSticky>Schedule</ListSubheader>
      <Typography variant="body2" sx={{ px: 2, pb: 1, color: md3.onSurfaceVariant }}>
        {formatTimeLabel(s.gridStartHour * 60)} – {formatTimeLabel(s.gridEndHour * 60)} · every {s.intervalMins} minutes. Change it
        from any course.
      </Typography>

      <ListSubheader disableSticky>Display</ListSubheader>
      <SwitchRow label="Compact rows" desc="Fit more tee times on screen" checked={s.compactMode} onChange={(v) => set({ compactMode: v })} />
      <SwitchRow label="Hide empty rows" desc="Show only times with bookings" checked={s.hideEmpty} onChange={(v) => set({ hideEmpty: v })} />
      <SwitchRow label="Jump to now" desc="Open the sheet at the current time" checked={s.autoScrollNow} onChange={(v) => set({ autoScrollNow: v })} />
      <SwitchRow
        label="Colourblind mode"
        desc="Lean on labels and patterns rather than hue"
        checked={s.colorblindMode}
        onChange={(v) => set({ colorblindMode: v })}
      />
      <Box sx={{ height: 16 }} />
    </MobileScreen>
  );
}

function CourseDetail({ courseId }: { courseId: string }) {
  const { state, dispatch } = usePos();
  const course = state.courses.find((c) => c.id === courseId);
  const s = state.settings;
  if (!course) {
    return (
      <MobileScreen topBar={<TopAppBar title="Course" />}>
        <Typography sx={{ p: 3 }}>No course {courseId}.</Typography>
      </MobileScreen>
    );
  }
  const patch = (p: Partial<Course>) =>
    dispatch({ type: 'patchCourse', courseId, patch: p });
  const rows = Math.floor(((s.gridEndHour - s.gridStartHour) * 60) / s.intervalMins) + 1;

  return (
    <MobileScreen topBar={<TopAppBar title={course.name} subtitle={`${course.holes} · Track 1`} />}>
      <ListSubheader disableSticky>On the tee sheet</ListSubheader>
      <SwitchRow label="Show on tee sheet" desc="Hidden courses keep their bookings" checked={course.visible} onChange={(v) => patch({ visible: v })} />
      <SwitchRow label="Lock course" desc="No new bookings; existing ones stay" checked={course.locked} onChange={(v) => patch({ locked: v })} />

      <FormSection title="Bookable window">
        <Stack direction="row" gap={1.5} sx={{ '& > *': { flex: 1, minWidth: 0 } }}>
          <PickerField
            label="First tee time"
            value={s.gridStartHour}
            options={[5, 6, 7, 8].map((h) => ({ label: formatTimeLabel(h * 60), value: h }))}
            onChange={(v) => dispatch({ type: 'patchSettings', patch: { gridStartHour: v } })}
          />
          <PickerField
            label="Last tee time"
            value={s.gridEndHour}
            options={[16, 17, 18, 19, 20].map((h) => ({ label: formatTimeLabel(h * 60), value: h }))}
            onChange={(v) => dispatch({ type: 'patchSettings', patch: { gridEndHour: v } })}
          />
        </Stack>
      </FormSection>

      <FormSection title="Interval (minutes)">
        <SegmentedButton
          ariaLabel="Interval"
          value={s.intervalMins}
          onChange={(v) => dispatch({ type: 'patchSettings', patch: { intervalMins: v } })}
          options={[7, 8, 10, 12, 15].map((m) => ({ label: String(m), value: m }))}
        />
      </FormSection>

      <FormSection title="Players per tee time">
        <SegmentedButton
          ariaLabel="Players per tee time"
          value={course.slots}
          onChange={(v) => patch({ slots: v })}
          options={[2, 3, 4, 5].map((n) => ({ label: String(n), value: n }))}
        />
      </FormSection>

      <FormSection title="Course note" hint="Shown under the course name on the tee sheet">
        <TextField
          value={course.note}
          onChange={(e) => patch({ note: e.target.value })}
          placeholder="Cart path only"
          slotProps={{ htmlInput: { 'aria-label': 'Course note' } }}
        />
      </FormSection>

      <Notice tone="info">
        {rows} tee times a day, {course.slots} players each — up to {rows * course.slots} golfers on {course.name}.
      </Notice>
      <Notice tone="warning">Window and interval are shared by every course in this pass; per-course tracks come later.</Notice>
      <Box sx={{ height: 32 }} />
    </MobileScreen>
  );
}

function SwitchRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <ListItemButton onClick={() => onChange(!checked)} sx={{ minHeight: desc ? mobile.listItem.two : mobile.listItem.one, pr: 1.5 }}>
      <ListItemText primary={label} secondary={desc} />
      <Switch
        checked={checked}
        tabIndex={-1}
        slotProps={{ input: { 'aria-label': label } }}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.checked)}
      />
    </ListItemButton>
  );
}
